import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as check from '../../src/checks/app-identity.js';
import { expoProject, runCheck } from '../helpers/project.js';

const complete = {
  version: '1.2.0',
  ios: { bundleIdentifier: 'com.example.app', buildNumber: '4' },
  android: { package: 'com.example.app', versionCode: 4 },
};

describe('app.identity', () => {
  it('passes when ids, version and build numbers are set', () => {
    assert.deepEqual(runCheck(check, expoProject(complete)), []);
  });

  it('errors on missing bundle identifier and package', () => {
    const issues = runCheck(check, expoProject({ version: '1.0.0', ios: { buildNumber: '1' }, android: { versionCode: 1 } }));
    assert.deepEqual(issues.map((issue) => [issue.severity, issue.platform]), [['error', 'ios'], ['error', 'android']]);
  });

  it('notes missing build numbers as info', () => {
    const issues = runCheck(check, expoProject({ ...complete, ios: { bundleIdentifier: 'com.example.app' }, android: { package: 'com.example.app' } }));
    assert.deepEqual(issues.map((issue) => issue.severity), ['info', 'info']);
  });

  it('falls back to the package.json version and warns when neither is set', () => {
    const noExpoVersion = { ios: complete.ios, android: complete.android };
    assert.deepEqual(runCheck(check, expoProject(noExpoVersion)), []);
    const files = expoProject(noExpoVersion);
    files['package.json'] = { name: 'x', dependencies: { expo: '~58.0.0' } };
    const issues = runCheck(check, files);
    assert.equal(issues.length, 1);
    assert.equal(issues[0].severity, 'warning');
    assert.equal(issues[0].platform, 'both');
  });

  it('only checks platforms listed in expo.platforms', () => {
    const issues = runCheck(check, expoProject({ version: '1.0.0', platforms: ['ios'], ios: { buildNumber: '1' } }));
    assert.deepEqual(issues.map((issue) => issue.platform), ['ios']);
  });

  it('reads native iOS and Android projects, resolving build settings', () => {
    const issues = runCheck(check, {
      'package.json': { name: 'bare', dependencies: { 'react-native': '0.88.0' } },
      'ios/App/Info.plist': `<plist><dict>
        <key>CFBundleIdentifier</key><string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
        <key>CFBundleShortVersionString</key><string>$(MARKETING_VERSION)</string>
        <key>CFBundleVersion</key><string>$(CURRENT_PROJECT_VERSION)</string>
      </dict></plist>`,
      'ios/App.xcodeproj/project.pbxproj': `
        PRODUCT_BUNDLE_IDENTIFIER = "org.reactjs.native.example.$(PRODUCT_NAME:rfc1034identifier)Tests";
        PRODUCT_BUNDLE_IDENTIFIER = com.example.bare;
        MARKETING_VERSION = 2.0;
        CURRENT_PROJECT_VERSION = 7;`,
      'android/app/build.gradle': 'android { defaultConfig { applicationId "com.example.bare"\n versionCode 7\n versionName "2.0" } }',
    });
    assert.deepEqual(issues, []);
  });

  it('errors on missing native versions', () => {
    const issues = runCheck(check, {
      'package.json': { name: 'bare', dependencies: { 'react-native': '0.88.0' } },
      'ios/App/Info.plist': '<plist><dict><key>CFBundleIdentifier</key><string>com.example.bare</string></dict></plist>',
      'android/app/build.gradle': 'android { defaultConfig { applicationId "com.example.bare" } }',
    });
    const errors = issues.filter((issue) => issue.severity === 'error');
    assert.deepEqual(errors.map((issue) => issue.platform), ['ios', 'android']);
    assert.match(errors[0].message, /version/);
  });
});
