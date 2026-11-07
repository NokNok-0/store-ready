import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as check from '../../src/checks/android-target-sdk.js';
import { expoProject, runCheck } from '../helpers/project.js';

const buildProperties = (targetSdkVersion) => ({ plugins: [['expo-build-properties', { android: { targetSdkVersion } }]] });
const bare = (files) => ({ 'package.json': { name: 'bare', dependencies: { 'react-native': '0.88.0' } }, ...files });

describe('android.target-sdk', () => {
  it('passes on Expo SDK 58 with no override (default is 36)', () => {
    assert.deepEqual(runCheck(check, expoProject({})), []);
  });

  it('errors when expo-build-properties sets a target below 36', () => {
    const issues = runCheck(check, expoProject(buildProperties(35)));
    assert.equal(issues.length, 1);
    assert.equal(issues[0].severity, 'error');
    assert.match(issues[0].message, /Target SDK is 35/);
    assert.equal(issues[0].source, 'https://developer.android.com/google/play/requirements/target-sdk');
  });

  it('passes when expo-build-properties sets 36 on an older SDK', () => {
    assert.deepEqual(runCheck(check, expoProject(buildProperties('36'), { expo: '~55.0.0' })), []);
  });

  it('adds an info note for an older Expo SDK without an override', () => {
    const issues = runCheck(check, expoProject({}, { expo: '^54.0.1' }));
    assert.equal(issues.length, 1);
    assert.equal(issues[0].severity, 'info');
    assert.match(issues[0].message, /Expo SDK 54/);
  });

  it('adds an info note when the Expo version cannot be parsed', () => {
    const issues = runCheck(check, expoProject({}, { expo: 'latest' }));
    assert.equal(issues[0].severity, 'info');
  });

  it('reads literal values from build.gradle', () => {
    const low = runCheck(check, bare({ 'android/app/build.gradle': 'android {\n  defaultConfig {\n    targetSdkVersion 34\n  }\n}\n' }));
    assert.equal(low[0].severity, 'error');
    assert.equal(low[0].file, 'android/app/build.gradle');
    assert.deepEqual(runCheck(check, bare({ 'android/app/build.gradle.kts': 'android { defaultConfig { targetSdk = 36 } }' })), []);
    assert.deepEqual(runCheck(check, bare({ 'android/build.gradle': 'ext {\n  // targetSdkVersion = 30\n  targetSdkVersion = 36\n}\n' })), []);
  });

  it('reads the gradle.properties value before the prebuild fallback', () => {
    const fallback = "targetSdkVersion = Integer.parseInt(findProperty('android.targetSdkVersion') ?: '35')";
    assert.equal(runCheck(check, bare({ 'android/build.gradle': fallback }))[0].severity, 'error');
    assert.deepEqual(runCheck(check, bare({ 'android/build.gradle': fallback, 'android/gradle.properties': 'android.targetSdkVersion=36\n' })), []);
  });

  it('adds an info note when no literal is found in a bare project', () => {
    const issues = runCheck(check, bare({ 'android/app/build.gradle': 'targetSdkVersion rootProject.ext.targetSdkVersion' }));
    assert.equal(issues[0].severity, 'info');
  });

  it('parses Expo major versions', () => {
    assert.equal(check.expoMajorVersion('~58.0.0'), 58);
    assert.equal(check.expoMajorVersion('58'), 58);
    assert.equal(check.expoMajorVersion('>=57.1'), 57);
    assert.equal(check.expoMajorVersion('github:expo/expo'), null);
  });
});
