import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CHECKS } from '../src/checks/index.js';
import { check } from '../src/run-checks.js';
import { materializeFixture } from './helpers/project.js';

describe('good-expo fixture', () => {
  const result = check(materializeFixture('good-expo'));

  it('has no errors or warnings', () => {
    assert.deepEqual(result.issues.filter((issue) => issue.severity !== 'info'), []);
    assert.equal(result.summary.errors, 0);
    assert.equal(result.summary.warnings, 0);
  });

  it('keeps only the expected reminders as info', () => {
    assert.deepEqual(result.issues.map((issue) => issue.id).sort(), ['android.permissions', 'play.closed-testing', 'store.screenshots']);
  });
});

describe('bad-expo fixture', () => {
  const result = check(materializeFixture('bad-expo'));
  /** @param {string} id @param {string} severity */
  const has = (id, severity) => result.issues.some((issue) => issue.id === id && issue.severity === severity);

  it('triggers every check', () => {
    const ids = new Set(result.issues.map((issue) => issue.id));
    for (const item of CHECKS) assert.ok(ids.has(item.id), `expected an issue from ${item.id}`);
  });

  for (const [id, severity] of [
    ['ios.purpose-strings', 'error'],
    ['ios.purpose-strings', 'warning'],
    ['ios.privacy-manifest', 'error'],
    ['ios.privacy-manifest', 'warning'],
    ['android.target-sdk', 'error'],
    ['android.permissions', 'warning'],
    ['app.identity', 'error'],
    ['app.identity', 'warning'],
    ['app.icon', 'error'],
    ['account.deletion', 'warning'],
    ['login.apple-equivalent', 'warning'],
    ['privacy.policy-url', 'warning'],
    ['store.listing-limits', 'error'],
    ['store.listing-limits', 'warning'],
    ['store.screenshots', 'error'],
    ['store.screenshots', 'warning'],
    ['play.closed-testing', 'info'],
  ]) {
    it(`reports ${id} as ${severity}`, () => assert.ok(has(id, severity)));
  }

  it('counts the keywords field in bytes', () => {
    assert.ok(result.issues.some((issue) => /keywords is 103 bytes/.test(issue.message)));
  });
});
