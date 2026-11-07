import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as check from '../../src/checks/store-files.js';
import { formatHuman } from '../../src/report/human.js';
import { check as runAll } from '../../src/run-checks.js';
import { makePng } from '../helpers/images.js';
import { expoProject, makeProject, runCheck } from '../helpers/project.js';

const ALL_FILES = {
  'store/listing.ios.json': { name: 'App', description: 'x' },
  'store/listing.android.json': { title: 'App', shortDescription: 'x', fullDescription: 'x' },
  'store/review-notes.txt': 'Notes',
  'store/privacy.ios.md': '# Answers',
  'store/data-safety.android.md': '# Answers',
  'store/screenshots/ios/iphone/01.png': makePng(4, 4),
  'store/screenshots/android/phone/01.png': makePng(4, 4),
};

describe('store.files', () => {
  it('lists every missing store file per platform as info', () => {
    const issues = runCheck(check, expoProject({}));
    assert.deepEqual(issues.map((issue) => [issue.severity, issue.platform]), [['info', 'ios'], ['info', 'android']]);
    assert.match(issues[0].message, /store\/listing\.ios\.json, store\/review-notes\.txt, store\/privacy\.ios\.md, store\/screenshots\/ios\/ \(no images\)/);
    assert.match(issues[1].message, /store\/listing\.android\.json, store\/data-safety\.android\.md, store\/screenshots\/android\/ \(no images\)/);
    assert.doesNotMatch(issues[1].message, /ios/);
  });

  it('is silent when every file exists, and counts an image-less screenshots folder as missing', () => {
    assert.deepEqual(runCheck(check, expoProject({}, {}, ALL_FILES)), []);
    const { 'store/screenshots/android/phone/01.png': _removed, ...rest } = ALL_FILES;
    const issues = runCheck(check, expoProject({}, {}, { ...rest, 'store/screenshots/android/plan.md': '# plan' }));
    assert.deepEqual(issues.map((issue) => issue.platform), ['android']);
    assert.match(issues[0].message, /store\/screenshots\/android\/ \(no images\)/);
  });

  it('only covers the platforms the app targets', () => {
    const issues = runCheck(check, expoProject({ platforms: ['android'] }));
    assert.deepEqual(issues.map((issue) => issue.platform), ['android']);
  });

  it('changes the clean-run footer to say what was not checked', () => {
    const root = makeProject(expoProject({ platforms: ['android'], icon: './icon.png', android: { package: 'com.acme.app', versionCode: 1 } }, {}, { 'icon.png': makePng(4, 4) }));
    const result = runAll(root, { cwd: root });
    assert.equal(result.summary.errors, 0);
    assert.deepEqual(Object.keys(result), ['version', 'project', 'issues', 'summary'], 'notChecked is not part of the JSON shape');
    const text = formatHuman(result, { color: false, strict: false, version: '0.0.0' });
    assert.match(text, /\nCode and config pass the checks we know about\. Not checked yet: store\/listing\.android\.json, store\/data-safety\.android\.md, store\/screenshots\/android\/\./);
    assert.doesNotMatch(text, /\nPasses the checks/);
    const iosOnly = runAll(root, { cwd: root, platform: 'ios' });
    assert.match(formatHuman(iosOnly, { color: false, strict: false, version: '0.0.0' }), /\nPasses the checks we know about\./, '--platform hides the other store\'s files');
  });
});
