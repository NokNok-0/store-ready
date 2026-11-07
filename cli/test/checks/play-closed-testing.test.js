import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as check from '../../src/checks/play-closed-testing.js';
import { expoProject, runCheck } from '../helpers/project.js';

describe('play.closed-testing', () => {
  it('always adds one info reminder for Android apps', () => {
    const issues = runCheck(check, expoProject({}));
    assert.equal(issues.length, 1);
    assert.equal(issues[0].severity, 'info');
    assert.equal(issues[0].platform, 'android');
    assert.match(issues[0].message, /12 testers.*14 days/);
  });

  it('is silent for iOS-only apps', () => {
    assert.deepEqual(runCheck(check, expoProject({ platforms: ['ios'] })), []);
  });
});
