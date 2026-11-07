import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as check from '../../src/checks/ios-privacy-manifest.js';
import { expoProject, runCheck } from '../helpers/project.js';

const ASYNC_STORAGE = { '@react-native-async-storage/async-storage': '2.2.0' };
const entry = (type, reasons) => ({ NSPrivacyAccessedAPIType: type, NSPrivacyAccessedAPITypeReasons: reasons });
const manifests = (...entries) => ({ ios: { privacyManifests: { NSPrivacyAccessedAPITypes: entries } } });

describe('ios.privacy-manifest', () => {
  it('passes with valid declarations', () => {
    const issues = runCheck(check, expoProject(manifests(
      entry('NSPrivacyAccessedAPICategoryUserDefaults', ['CA92.1']),
      entry('NSPrivacyAccessedAPICategoryFileTimestamp', ['C617.1', '0A2A.1']),
    ), ASYNC_STORAGE));
    assert.deepEqual(issues, []);
  });

  it('warns when AsyncStorage is used without a UserDefaults reason', () => {
    const issues = runCheck(check, expoProject({}, ASYNC_STORAGE));
    assert.equal(issues.length, 1);
    assert.equal(issues[0].severity, 'warning');
    assert.match(issues[0].message, /static CocoaPods/);
    assert.equal(issues[0].source, 'https://docs.expo.dev/guides/apple-privacy/');
  });

  it('does not warn without a known UserDefaults dependency', () => {
    assert.deepEqual(runCheck(check, expoProject({}, { 'expo-secure-store': '1' })), []);
  });

  it('errors on an unknown category and suggests the full name', () => {
    const issues = runCheck(check, expoProject(manifests(entry('UserDefaults', ['CA92.1']))));
    assert.equal(issues.length, 1);
    assert.equal(issues[0].severity, 'error');
    assert.match(issues[0].fix, /NSPrivacyAccessedAPICategoryUserDefaults/);
  });

  it('errors on a reason code from another category and names that category', () => {
    const issues = runCheck(check, expoProject(manifests(entry('NSPrivacyAccessedAPICategoryDiskSpace', ['CA92.1', 'E174.1']))));
    assert.equal(issues.length, 1);
    assert.match(issues[0].message, /"CA92\.1".*belongs to NSPrivacyAccessedAPICategoryUserDefaults/);
  });

  it('errors on missing reasons and on malformed shapes', () => {
    const issues = runCheck(check, expoProject(manifests(entry('NSPrivacyAccessedAPICategorySystemBootTime', []), 'nope')));
    assert.equal(issues.length, 2);
    assert.ok(issues.every((issue) => issue.severity === 'error'));
    const notArray = runCheck(check, expoProject({ ios: { privacyManifests: { NSPrivacyAccessedAPITypes: {} } } }));
    assert.match(notArray[0].message, /must be an array/);
  });

  it('a UserDefaults entry with only invalid codes does not satisfy AsyncStorage', () => {
    const issues = runCheck(check, expoProject(manifests(entry('NSPrivacyAccessedAPICategoryUserDefaults', ['XXXX.1'])), ASYNC_STORAGE));
    assert.deepEqual(issues.map((issue) => issue.severity), ['error', 'warning']);
  });

  it('reads PrivacyInfo.xcprivacy in a bare project', () => {
    const xcprivacy = `<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict>
      <key>NSPrivacyAccessedAPITypes</key><array><dict>
        <key>NSPrivacyAccessedAPIType</key><string>NSPrivacyAccessedAPICategoryUserDefaults</string>
        <key>NSPrivacyAccessedAPITypeReasons</key><array><string>CA92.1</string></array>
      </dict></array></dict></plist>`;
    const base = { 'package.json': { name: 'bare', dependencies: { 'react-native': '0.88.0', ...ASYNC_STORAGE } }, 'ios/App.xcodeproj/project.pbxproj': '' };
    assert.deepEqual(runCheck(check, { ...base, 'ios/App/PrivacyInfo.xcprivacy': xcprivacy }), []);
    assert.equal(runCheck(check, { ...base, 'ios/Pods/Some/PrivacyInfo.xcprivacy': xcprivacy }).length, 1);
    const broken = runCheck(check, { ...base, 'ios/App/PrivacyInfo.xcprivacy': '<plist><dict><key>A</key></dict></plist>' });
    assert.ok(broken.some((issue) => issue.severity === 'error' && /is not a valid XML property list./.test(issue.message)));
  });
});
