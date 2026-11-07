import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { main } from '../src/cli.js';
import { decodeEntities } from '../src/parsers/plist.js';
import { readStaticConfig } from '../src/parsers/js-literal.js';
import { createProjectFiles } from '../src/project/project-files.js';
import { escapeData, escapeProperty, formatGithub } from '../src/report/github.js';
import { formatHuman } from '../src/report/human.js';
import { stripControl } from '../src/report/sanitize.js';
import { check } from '../src/run-checks.js';
import { makePng } from './helpers/images.js';
import { expoProject, makeProject } from './helpers/project.js';

const ESC = '\u001b';
const CONTROL = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/;

/** @param {string[]} args @param {string} cwd */
function run(args, cwd) {
  let stdout = '';
  let stderr = '';
  const code = main(args, { stdout: { write: (t) => { stdout += t; } }, stderr: { write: (t) => { stderr += t; } }, cwd, env: {} });
  return { code, stdout, stderr };
}

/** @param {string} target @param {string} link @param {'file' | 'junction'} type */
function trySymlink(target, link, type) {
  try {
    fs.mkdirSync(path.dirname(link), { recursive: true });
    fs.symlinkSync(target, link, type);
    return true;
  } catch {
    return false;
  }
}

const plist = (body) => `<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict>${body}</dict></plist>`;

describe('output sanitizing', () => {
  const root = makeProject({
    'package.json': { name: 'evil', dependencies: { 'react-native': '0.88.0' } },
    'ios/App/Info.plist': plist(`<key>CFBundleIdentifier</key><string>com.evil</string>
      <key>NSCameraUsageDescription</key><string>&#27;]0;pwned&#7;&#x9b;31mCam\r\n0 errors, 0 warnings</string>`),
    'ios/App.xcodeproj/project.pbxproj': '',
    'store/screenshots/ios/iphone/\u009b[2Jshot.png': makePng(10, 10),
  });

  it('strips C0/C1 controls from every value in human output, keeping our colors', () => {
    const { stdout } = run(['check', root], root);
    assert.doesNotMatch(stdout, CONTROL);
    assert.match(stdout, /\]0;pwned31mCam/);
    assert.match(stdout, /\[2Jshot\.png/);
    const colored = formatHuman(check(root), { color: true, strict: false, version: '1' });
    assert.ok(colored.includes(`${ESC}[1m`));
    assert.doesNotMatch(colored.replace(/\u001b\[[0-9;]*m/g, ''), CONTROL);
  });

  it('indents newlines from file content so they cannot fake a result line', () => {
    const { stdout } = run(['check', root], root);
    assert.doesNotMatch(stdout, /^0 errors, 0 warnings"/m);
    assert.match(stdout, /\n {9}0 errors, 0 warnings"/);
  });

  it('escapes GitHub workflow commands and strips controls', () => {
    const output = formatGithub(check(root), { cwd: root });
    const lines = output.trim().split('\n');
    assert.ok(lines.every((line) => !CONTROL.test(line)));
    assert.ok(lines.slice(0, -1).every((line) => /^::(error|warning|notice) /.test(line)));
    assert.equal(escapeData('50% a\r\nb'), '50%25 a%0Ab');
    assert.equal(escapeData('a\nb'), 'a%0Ab');
    assert.equal(escapeProperty('a:b,c%'), 'a%3Ab%2Cc%25');
    assert.equal(escapeProperty(`x${ESC}[31m\u009b`), 'x[31m');
  });

  it('escapes DEL and C1 controls in JSON output', () => {
    const { stdout } = run(['check', root, '--json'], root);
    assert.doesNotMatch(stdout, CONTROL);
    assert.match(stdout, /\\u009b/);
    assert.ok(JSON.parse(stdout).issues.some((issue) => issue.message.includes('\u009b')));
  });

  it('stripControl keeps tabs and newlines only', () => {
    assert.equal(stripControl(`a\tb\nc\r${ESC}\u0000\u007f\u0085d`), 'a\tb\ncd');
  });
});

describe('malformed input never crashes the run', () => {
  it('leaves out-of-range and surrogate character references as text', () => {
    assert.equal(decodeEntities('&#x110000;|&#xD800;|&#99999999999;|&#65;'), '&#x110000;|&#xD800;|&#99999999999;|A');
  });

  it('rejects bad unicode escapes in app.config as non-literal', () => {
    for (const source of ["export default { name: '\\u{110000}' };", "export default { name: '\\u{D800}' };", "export default { name: '\\u{zz}' };", "export default { name: '\\u12' };", "export default { name: '\\u{12' };"]) {
      const result = readStaticConfig(source);
      assert.equal(result.ok, false, source);
    }
    assert.deepEqual(readStaticConfig("export default { name: '\\u{1F600}\\x41' };"), { ok: true, value: { name: '\u{1F600}A' } });
  });

  it('turns bad files into issues for those files', () => {
    const root = makeProject({
      'package.json': { name: 'bad', version: '1.0.0', dependencies: { expo: '~58.0.0', 'expo-camera': '1' } },
      'app.config.js': "export default { name: '\\u{110000}' };",
      'app.json': '{\n  "expo": {\n    "name": "x",\n  }\n}',
      'ios/App/Info.plist': plist('<key>NSCameraUsageDescription</key><string>&#x110000; secret text <oops'),
      'ios/App/PrivacyInfo.xcprivacy': 'bplist00 binary',
      'ios/App/Images.xcassets/AppIcon.appiconset/Contents.json': '{ "images": [ secret',
      'android/app/src/main/AndroidManifest.xml': '<manifest package="&#x110000;"><uses-permission android:name="android.permission.&#xD800;CAMERA"/></manifest>',
      'store/listing.ios.json': '{\n  "name": "token-abc123"\n  "subtitle": ""\n}',
    });
    const result = check(root);
    const text = JSON.stringify(result.issues);
    assert.doesNotMatch(text, /secret|token-abc123|oops/);
    assert.ok(result.issues.some((issue) => issue.file === 'app.config.js' && issue.severity === 'info'));
    assert.ok(result.issues.some((issue) => issue.file === 'app.json' && /not valid JSON \(line 4, column 3\)/.test(issue.message)));
    assert.ok(result.issues.some((issue) => issue.file === 'store/listing.ios.json' && /not valid JSON \(line 3, column 3\)/.test(issue.message)));
    assert.ok(result.issues.some((issue) => issue.file === 'ios/App/PrivacyInfo.xcprivacy' && /binary property list/.test(issue.message)));
  });

  it('reports a crashing check as a warning instead of failing the run', async () => {
    const { CHECKS } = await import('../src/checks/index.js');
    const original = CHECKS[0];
    CHECKS[0] = { ...original, run: () => { throw new TypeError('boom secret'); } };
    try {
      const result = check(makeProject(expoProject({})));
      const issue = result.issues.find((entry) => entry.id === original.id);
      assert.equal(issue?.severity, 'warning');
      assert.match(issue?.message ?? '', /TypeError/);
      assert.doesNotMatch(issue?.message ?? '', /secret/);
    } finally {
      CHECKS[0] = original;
    }
  });
});

describe('paths outside the project', () => {
  it('does not read config paths that leave the project', () => {
    const parent = makeProject({ 'outside.png': makePng(1000, 1000), 'project/package.json': { name: 'x', version: '1.0.0', dependencies: { expo: '~58.0.0' } } });
    const root = path.join(parent, 'project');
    fs.writeFileSync(path.join(root, 'app.json'), JSON.stringify({
      expo: {
        icon: '../outside.png',
        ios: { bundleIdentifier: 'com.x', buildNumber: '1', icon: path.join(parent, 'outside.png') },
        android: { package: 'com.x', versionCode: 1, adaptiveIcon: { foregroundImage: '../../missing/elsewhere.png' } },
      },
    }));
    const result = check(root);
    const outside = result.issues.filter((issue) => issue.id === 'project.paths');
    assert.deepEqual(outside.map((issue) => issue.severity), ['warning', 'warning', 'warning']);
    assert.ok(outside.every((issue) => /points outside the project, not read\.$/.test(issue.message)));
    assert.ok(!result.issues.some((issue) => issue.id === 'app.icon'));
  });

  it('does not follow symlinked directories while walking, and flags ones that leave the project', (t) => {
    const parent = makeProject({ 'secret/leak.ts': "const PRIVACY = 'https://evil.example/privacy';", 'secret/ios/Info.plist': plist('') });
    const root = makeProject(expoProject({}));
    const linked = trySymlink(path.join(parent, 'secret'), path.join(root, 'src', 'linked'), 'junction');
    if (!linked) return t.skip('symlinks not available');
    const files = createProjectFiles(root);
    assert.deepEqual(files.walk('src'), []);
    assert.ok(files.outside.has('src/linked'));
    const result = check(root);
    assert.ok(result.issues.some((issue) => issue.id === 'privacy.policy-url'));
    assert.ok(result.issues.some((issue) => issue.id === 'project.paths' && issue.file === 'src/linked'));
  });

  it('skips a top-level folder that is a symlink out of the project', (t) => {
    const parent = makeProject({ 'shots/ios/iphone/a.png': makePng(5, 5) });
    const root = makeProject(expoProject({}));
    fs.mkdirSync(path.join(root, 'store'));
    if (!trySymlink(path.join(parent, 'shots'), path.join(root, 'store', 'screenshots'), 'junction')) return t.skip('symlinks not available');
    const result = check(root);
    assert.ok(!result.issues.some((issue) => issue.id === 'store.screenshots'));
    assert.ok(result.issues.some((issue) => issue.id === 'project.paths' && issue.file === 'store/screenshots'));
  });

  it('keeps file symlinks inside the project and drops ones that point outside', (t) => {
    const parent = makeProject({ 'outside.json': { name: 'Leaked name that is far too long for the App Store' } });
    const root = makeProject(expoProject({}, {}, { 'store/real.json': { name: 'Inside name that is far too long for the App Store' } }));
    if (!trySymlink(path.join(parent, 'outside.json'), path.join(root, 'store', 'listing.ios.json'), 'file')) return t.skip('file symlinks need extra privileges on this OS');
    trySymlink(path.join(root, 'store', 'real.json'), path.join(root, 'store', 'listing.android.json'), 'file');
    const result = check(root);
    assert.doesNotMatch(JSON.stringify(result.issues), /Leaked/);
    assert.ok(result.issues.some((issue) => issue.id === 'project.paths' && issue.file === 'store/listing.ios.json'));
  });

  it('createProjectFiles locates paths by status', () => {
    const root = makeProject({ 'a.txt': 'x' });
    const files = createProjectFiles(root);
    assert.equal(files.locate('a.txt').status, 'inside');
    assert.equal(files.locate('b.txt').status, 'missing');
    assert.equal(files.locate('../b.txt').status, 'outside');
    assert.equal(files.locate(path.parse(root).root).status, 'outside');
    assert.equal(files.readText('../a.txt'), null);
  });
});
