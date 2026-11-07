import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, it } from 'node:test';
import * as check from '../../src/checks/template-content.js';
import { normalizeIssue } from '../../src/issue.js';
import { loadProject } from '../../src/project/load-project.js';
import { makePng } from '../helpers/images.js';
import { expoProject, makeProject, runCheck } from '../helpers/project.js';

const sha = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

describe('app.template-content: template artwork', () => {
  it('keeps the Expo SDK 58 template hashes in one exported table', () => {
    assert.deepEqual(check.TEMPLATE_ASSETS.map((asset) => asset.file), ['icon.png', 'splash-icon.png', 'android-icon-foreground.png', 'android-icon-background.png', 'android-icon-monochrome.png', 'favicon.png']);
    assert.ok(check.TEMPLATE_ASSETS.every((asset) => /^[0-9a-f]{64}$/.test(asset.sha256) && asset.template === 'Expo SDK 58 default template'));
    assert.ok(Object.isFrozen(check.TEMPLATE_ASSETS));
  });

  it('collects every configured icon, splash, adaptive icon and favicon path', () => {
    const root = makeProject(expoProject({
      icon: './assets/icon.png',
      ios: { icon: { light: './assets/ios-light.png', dark: './assets/ios-dark.png' } },
      android: { adaptiveIcon: { foregroundImage: './assets/fg.png', backgroundImage: './assets/bg.png', monochromeImage: './assets/mono.png' } },
      splash: { image: './assets/splash.png' },
      web: { favicon: './assets/favicon.png' },
      plugins: [['expo-splash-screen', { image: './assets/splash-icon.png', dark: { image: './assets/splash-dark.png' } }]],
    }));
    const fields = check.configuredArtwork(loadProject(root, { cwd: root })).map((entry) => entry.field);
    assert.deepEqual(fields, ['icon', 'ios.icon.light', 'ios.icon.dark', 'android.adaptiveIcon.foregroundImage', 'android.adaptiveIcon.backgroundImage', 'android.adaptiveIcon.monochromeImage', 'splash.image', 'web.favicon', 'expo-splash-screen image', 'expo-splash-screen dark.image']);
  });

  it('errors on both platforms when a configured image matches a template hash', () => {
    const png = makePng(1024, 1024);
    const table = [{ template: 'Expo SDK 58 default template', file: 'icon.png', sha256: sha(png) }];
    const root = makeProject(expoProject({ icon: './assets/images/icon.png', android: { adaptiveIcon: { foregroundImage: './assets/images/own.png' } } }, {}, {
      'assets/images/icon.png': png,
      'assets/images/own.png': makePng(512, 512, { alpha: true }),
    }));
    const project = loadProject(root, { cwd: root });
    assert.deepEqual(check.findTemplateArtwork(project, table).map((entry) => entry.file), ['assets/images/icon.png']);
    assert.deepEqual(check.findTemplateArtwork(project), [], 'generated images do not match the real template hashes');
  });

  it('reports template artwork as an error citing Apple guidelines and the Play policy', () => {
    const png = makePng(64, 64);
    const table = [...check.TEMPLATE_ASSETS, { template: 'Expo SDK 58 default template', file: 'splash-icon.png', sha256: sha(png) }];
    const root = makeProject(expoProject({ icon: './icon.png', plugins: [['expo-splash-screen', { image: './assets/splash-icon.png' }]] }, {}, { 'icon.png': makePng(1024, 1024, { alpha: true }), 'assets/splash-icon.png': png }));
    const issues = check.run(loadProject(root, { cwd: root }), table).map((raw) => normalizeIssue(check.id, raw));
    assert.deepEqual(issues.map((issue) => [issue.severity, issue.platform]), [['error', 'ios'], ['error', 'android']]);
    assert.match(issues[0].message, /^Template artwork: assets\/splash-icon\.png \(expo-splash-screen image\) is the Expo SDK 58 default template splash-icon\.png\./);
    assert.match(issues[0].fix, /4\.1\(c\) and 2\.3/);
    assert.equal(issues[0].source, 'https://developer.apple.com/app-store/review/guidelines/');
    assert.equal(issues[1].source, 'https://play.google/developer-content-policy/');
    assert.equal(issues[0].file, 'app.json');
    assert.deepEqual(runCheck(check, root), [], 'no match against the real table');
  });
});

describe('app.template-content: placeholder text', () => {
  /** @param {Record<string, string | object>} files */
  const placeholders = (files) => runCheck(check, expoProject({}, {}, files));

  for (const [label, code] of [
    ['an example.com email', "const user = { email: 'google.user@example.com' };"],
    ['an example.org link', "Linking.openURL('https://www.example.org/help');"],
    ['a test.com address', "const support = 'help@test.com';"],
    ['lorem ipsum', '<Text>Lorem ipsum dolor sit amet</Text>'],
    ['coming soon', '<Text>Dark mode is coming soon!</Text>'],
    ['not available yet', '<Text>Subscriptions are not available yet.</Text>'],
    ['TODO in JSX text', '<Text>TODO: write onboarding</Text>'],
    ['TODO in a title prop', '<Button title="TODO" />'],
  ]) {
    it(`warns on ${label} in source, once per platform`, () => {
      const issues = placeholders({ 'src/screen.tsx': `export function S() {\n  return (\n    ${code}\n  );\n}\n` });
      assert.deepEqual(issues.map((issue) => [issue.severity, issue.platform]), [['warning', 'ios'], ['warning', 'android']]);
      assert.match(issues[0].message, /src\/screen\.tsx:3/);
      assert.equal(issues[0].source, 'https://developer.apple.com/app-store/review/guidelines/');
      assert.equal(issues[1].source, 'https://support.google.com/googleplay/android-developer/answer/9898783');
    });
  }

  it('ignores comments, placeholder= format hints, TODO comments, look-alike domains and test files', () => {
    assert.deepEqual(placeholders({
      'src/form.tsx': [
        '// TODO: remove the mock, see https://example.com/docs',
        '/* lorem ipsum */',
        '<TextInput placeholder="you@example.com" />',
        "const style = { placeholder: 'you@example.com' };",
        "const host = 'https://myexample.community/privacy';",
        "const id = 'com.example.app';",
      ].join('\n'),
      'src/__tests__/auth.test.ts': "signUp('sam@example.com', 'pw')",
      'src/auth.spec.tsx': '<Text>coming soon</Text>',
    }), []);
  });

  it('scans store text files, per store, and finds unfilled {{TEMPLATE}} fields', () => {
    const issues = placeholders({
      'store/review-notes.txt': 'Demo account: reviewer@example.com\nCONTACT\n{{CONTACT_NAME}}, {{CONTACT_EMAIL}}\n',
      'store/listing.android.json': { title: 'App', shortDescription: 'Lorem ipsum', fullDescription: 'x' },
      'store/checklist.md': '| A1 | example.com | todo | TODO |',
    });
    const ios = issues.find((issue) => issue.platform === 'ios');
    const android = issues.find((issue) => issue.platform === 'android');
    assert.match(ios?.message ?? '', /example\.com address in store\/review-notes\.txt:1/);
    assert.match(ios?.message ?? '', /unfilled \{\{TEMPLATE\}\} field in store\/review-notes\.txt:3 \("\{\{CONTACT_NAME\}\}"\)/);
    assert.doesNotMatch(ios?.message ?? '', /listing\.android/);
    assert.match(android?.message ?? '', /"lorem ipsum" in store\/listing\.android\.json/);
    assert.doesNotMatch(JSON.stringify(issues), /checklist\.md/);
  });

  it('flags TODO in store files only in upper case, so the keyword "todo" passes', () => {
    assert.deepEqual(placeholders({ 'store/listing.ios.json': { name: 'App', keywords: 'habit,todo,list', description: 'x' } }), []);
    assert.equal(placeholders({ 'store/review-notes.txt': 'Steps: TODO\n' }).length, 1);
  });

  it('exports the pattern list and caps the findings shown', () => {
    assert.ok(check.PLACEHOLDER_PATTERNS.length >= 6);
    const files = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`src/s${i}.tsx`, '<Text>coming soon</Text>']));
    const [issue] = placeholders(files);
    assert.match(issue.message, /and 3 more\./);
  });

  it('maskNonUserText keeps line numbers', () => {
    const text = 'a // x@example.com\n/* b\nc */ d';
    const masked = check.maskNonUserText(text);
    assert.equal(masked.length, text.length);
    assert.equal(masked.split('\n').length, 3);
    assert.doesNotMatch(masked, /example|b|c \*/);
  });

  it('normalizes into issues with the check id', () => {
    const root = makeProject(expoProject({}, {}, { 'src/a.tsx': '<Text>Coming soon</Text>' }));
    const issues = check.run(loadProject(root, { cwd: root })).map((raw) => normalizeIssue(check.id, raw));
    assert.ok(issues.every((issue) => issue.id === 'app.template-content'));
  });
});
