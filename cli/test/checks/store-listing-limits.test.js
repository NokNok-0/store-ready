import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as check from '../../src/checks/store-listing-limits.js';
import { expoProject, runCheck } from '../helpers/project.js';

const ios = (fields) => expoProject({}, {}, { 'store/listing.ios.json': { name: 'Habit Lens', description: 'Track habits.', ...fields } });
const android = (fields) => expoProject({}, {}, { 'store/listing.android.json': { title: 'Habit Lens', shortDescription: 'Track habits.', fullDescription: 'Track habits.', ...fields } });

describe('store.listing-limits', () => {
  it('does nothing without listing files', () => {
    assert.deepEqual(runCheck(check, expoProject({})), []);
  });

  it('passes listings at the exact limits', () => {
    assert.deepEqual(runCheck(check, ios({
      name: 'n'.repeat(30),
      subtitle: 's'.repeat(30),
      keywords: 'k'.repeat(100),
      promotionalText: 'p'.repeat(170),
      description: 'd'.repeat(4000),
      whatsNew: 'w'.repeat(4000),
      privacyPolicyUrl: 'https://example.com/privacy',
    })), []);
    assert.deepEqual(runCheck(check, android({ title: 't'.repeat(30), shortDescription: 's'.repeat(80), fullDescription: 'f'.repeat(4000) })), []);
  });

  it('errors one unit over each limit', () => {
    const issues = runCheck(check, ios({ name: 'n'.repeat(31), subtitle: 's'.repeat(31), promotionalText: 'p'.repeat(171), description: 'd'.repeat(4001), whatsNew: 'w'.repeat(4001) }));
    assert.equal(issues.length, 5);
    assert.ok(issues.every((issue) => issue.severity === 'error' && issue.platform === 'ios'));
    const androidIssues = runCheck(check, android({ title: 't'.repeat(31), shortDescription: 's'.repeat(81), fullDescription: 'f'.repeat(4001) }));
    assert.equal(androidIssues.length, 3);
    assert.match(androidIssues[1].message, /81 characters; the limit is 80/);
  });

  it('counts keywords in bytes and other fields in characters', () => {
    const keywords = 'é'.repeat(51);
    const [issue] = runCheck(check, ios({ keywords }));
    assert.match(issue.message, /keywords is 102 bytes; the limit is 100/);
    assert.deepEqual(runCheck(check, ios({ subtitle: 'é'.repeat(30) })), []);
    assert.deepEqual(runCheck(check, ios({ name: '😀'.repeat(30) })), []);
  });

  it('requires a name of at least 2 characters', () => {
    assert.match(runCheck(check, ios({ name: 'A' }))[0].message, /1 characters; it must be 2-30/);
    assert.equal(runCheck(check, ios({ name: undefined }))[0].severity, 'error');
  });

  it('warns on empty required fields, unknown keys and a bad privacyPolicyUrl', () => {
    const issues = runCheck(check, ios({ description: '', keyword: 'typo', privacyPolicyUrl: 'example.com/privacy' }));
    assert.deepEqual(issues.map((issue) => issue.severity), ['warning', 'warning', 'warning']);
    assert.match(issues.map((issue) => issue.message).join('\n'), /description is empty[\s\S]*not an http\(s\) URL[\s\S]*unknown field "keyword"/);
  });

  it('errors on invalid JSON, non-object JSON and non-string fields', () => {
    assert.match(runCheck(check, expoProject({}, {}, { 'store/listing.ios.json': '{ name: ' }))[0].message, /not valid JSON/);
    assert.match(runCheck(check, expoProject({}, {}, { 'store/listing.android.json': '[]' }))[0].message, /JSON object/);
    assert.match(runCheck(check, ios({ subtitle: 5 }))[0].message, /must be a string/);
  });

  it('limits review notes to 4000 bytes', () => {
    assert.deepEqual(runCheck(check, expoProject({}, {}, { 'store/review-notes.txt': `${'x'.repeat(4000)}\n` })), []);
    const [issue] = runCheck(check, expoProject({}, {}, { 'store/review-notes.txt': 'é'.repeat(2001) }));
    assert.match(issue.message, /4002 bytes/);
  });
});

describe('store.listing-limits: price and ranking words', () => {
  it('warns on price words and superlatives in the iOS name and subtitle', () => {
    const issues = runCheck(check, ios({ name: 'Streaks - Best Free Habit App', subtitle: 'The #1 tracker, 50% off' }));
    assert.deepEqual(issues.map((issue) => issue.severity), ['warning', 'warning']);
    assert.match(issues[0].message, /name "Streaks - Best Free Habit App" contains price or ranking words: "free", "best"\. Guideline 2\.3\.7/);
    assert.match(issues[1].message, /subtitle .*"% off", "#1"/);
    assert.equal(issues[0].source, 'https://developer.apple.com/app-store/review/guidelines/');
  });

  it('warns on the Play title and cites the listing text page', () => {
    const [issue] = runCheck(check, android({ title: 'Top Habits: No. 1 on Sale' }));
    assert.match(issue.message, /"sale", "top", "No\. 1"/);
    assert.equal(issue.platform, 'android');
    assert.equal(issue.source, 'https://support.google.com/googleplay/android-developer/answer/9859152');
  });

  for (const [word, name] of [['$', 'Habits for $0.99'], ['€', 'Habits €2'], ['number one', 'The number one tracker'], ['ultimate', 'Ultimate Habits']]) {
    it(`flags "${word}"`, () => {
      assert.match(runCheck(check, ios({ name }))[0].message, new RegExp(`"${word.replace(/[$€]/g, '\\$&')}"`));
    });
  }

  it('matches whole words only and ignores descriptions', () => {
    assert.deepEqual(runCheck(check, ios({ name: 'Stop Freezing: Bestow', subtitle: 'Topology notes', description: 'The best free app, #1 in sales.' })), []);
    assert.deepEqual(runCheck(check, android({ shortDescription: 'Free and the best', fullDescription: 'Best. Free. #1.' })), []);
    assert.deepEqual(check.claimWords('Track habit #12 daily'), []);
  });
});
