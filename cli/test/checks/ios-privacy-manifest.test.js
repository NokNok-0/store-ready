import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import * as check from '../../src/checks/ios-privacy-manifest.js';
import { createProjectFiles } from '../../src/project/project-files.js';
import { scan } from '../../src/project/dependency-privacy.js';
import { expoProject, makeProject, runCheck, xcprivacy } from '../helpers/project.js';

const ASYNC_STORAGE = { '@react-native-async-storage/async-storage': '2.2.0' };
const entry = (type, reasons) => ({ NSPrivacyAccessedAPIType: type, NSPrivacyAccessedAPITypeReasons: reasons });
const manifests = (...entries) => ({ ios: { privacyManifests: { NSPrivacyAccessedAPITypes: entries } } });
const FILE_TIMESTAMP = 'NSPrivacyAccessedAPICategoryFileTimestamp';
const USER_DEFAULTS = 'NSPrivacyAccessedAPICategoryUserDefaults';
const DISK_SPACE = 'NSPrivacyAccessedAPICategoryDiskSpace';
const BOOT_TIME = 'NSPrivacyAccessedAPICategorySystemBootTime';

/** Package manifests as they ship in the habit-tracker example's node_modules (npm layout). */
const NPM_MODULES = {
  'node_modules/@react-native-async-storage/async-storage/ios/PrivacyInfo.xcprivacy': xcprivacy({ [FILE_TIMESTAMP]: ['C617.1'] }),
  'node_modules/expo-constants/ios/PrivacyInfo.xcprivacy': xcprivacy({ [USER_DEFAULTS]: ['CA92.1'] }),
  'node_modules/expo-file-system/ios/PrivacyInfo.xcprivacy': xcprivacy({ [FILE_TIMESTAMP]: ['0A2A.1', '3B52.1'], [DISK_SPACE]: ['E174.1', '85F4.1'] }),
  'node_modules/react-native/ReactCommon/react/timing/PrivacyInfo.xcprivacy': xcprivacy({ [BOOT_TIME]: ['35F9.1'] }),
  'node_modules/react-native/ReactCommon/react/timing/example/ios/PrivacyInfo.xcprivacy': xcprivacy({ NSPrivacyAccessedAPICategoryActiveKeyboards: ['3EC4.1'] }),
};

describe('ios.privacy-manifest', () => {
  it('passes with valid declarations that cover the packages', () => {
    const issues = runCheck(check, expoProject(manifests(
      entry(USER_DEFAULTS, ['CA92.1']),
      entry(FILE_TIMESTAMP, ['C617.1', '0A2A.1']),
    ), ASYNC_STORAGE, {
      'node_modules/@react-native-async-storage/async-storage/ios/PrivacyInfo.xcprivacy': xcprivacy({ [FILE_TIMESTAMP]: ['C617.1'] }),
    }));
    assert.deepEqual(issues, []);
  });

  it('says once that the package comparison needs installed dependencies', () => {
    const issues = runCheck(check, expoProject({}, ASYNC_STORAGE));
    assert.equal(issues.length, 1);
    assert.equal(issues[0].severity, 'info');
    assert.match(issues[0].message, /needs installed dependencies \(no node_modules folder\)/);
    assert.equal(issues[0].source, 'https://docs.expo.dev/guides/apple-privacy/');
  });

  it('no longer guesses UserDefaults for AsyncStorage', () => {
    const issues = runCheck(check, expoProject({}, ASYNC_STORAGE, {
      'node_modules/@react-native-async-storage/async-storage/ios/PrivacyInfo.xcprivacy': xcprivacy({ [FILE_TIMESTAMP]: ['C617.1'] }),
    }));
    assert.equal(issues.length, 1);
    assert.match(issues[0].message, /^NSPrivacyAccessedAPICategoryFileTimestamp is declared by a package/);
    assert.doesNotMatch(JSON.stringify(issues), /UserDefaults/);
  });

  it('warns for every category packages declare and the app does not, with the packages and their reasons', () => {
    const issues = runCheck(check, expoProject({}, {}, NPM_MODULES));
    assert.deepEqual(issues.map((issue) => issue.message.split(' ')[0]).sort(), [DISK_SPACE, FILE_TIMESTAMP, BOOT_TIME, USER_DEFAULTS].sort());
    assert.ok(issues.every((issue) => issue.severity === 'warning' && issue.platform === 'ios' && issue.file === 'app.json'));
    const timestamps = issues.find((issue) => issue.message.startsWith(FILE_TIMESTAMP));
    assert.match(timestamps?.message ?? '', /2 packages in node_modules/);
    assert.match(timestamps?.message ?? '', /C617\.1 \(@react-native-async-storage\/async-storage\); 0A2A\.1 \(expo-file-system\); 3B52\.1 \(expo-file-system\)/);
    assert.match(timestamps?.fix ?? '', /"NSPrivacyAccessedAPITypeReasons": \["C617\.1","0A2A\.1","3B52\.1"\]/);
    assert.match(timestamps?.fix ?? '', /confirm each one/);
    assert.ok(!issues.some((issue) => /ActiveKeyboards/.test(issue.message)), 'example apps inside packages are skipped');
  });

  it('notes package reasons missing from a declared category as info', () => {
    const issues = runCheck(check, expoProject(manifests(entry(FILE_TIMESTAMP, ['C617.1'])), {}, {
      'node_modules/expo-file-system/ios/PrivacyInfo.xcprivacy': xcprivacy({ [FILE_TIMESTAMP]: ['C617.1', '0A2A.1'] }),
    }));
    assert.deepEqual(issues.map((issue) => issue.severity), ['info']);
    assert.match(issues[0].message, /also use reasons it does not list: 0A2A\.1 \(expo-file-system\)/);
  });

  it('reads the pnpm layout and nested node_modules, once per real file', () => {
    const issues = runCheck(check, expoProject({}, {}, {
      'node_modules/.pnpm/expo-file-system@58.0.13/node_modules/expo-file-system/ios/PrivacyInfo.xcprivacy': xcprivacy({ [DISK_SPACE]: ['E174.1'] }),
      'node_modules/.pnpm/@scope+kit@1.0.0/node_modules/@scope/kit/apple/PrivacyInfo.xcprivacy': xcprivacy({ [USER_DEFAULTS]: ['CA92.1'] }),
      'node_modules/some-lib/node_modules/inner-lib/ios/PrivacyInfo.xcprivacy': xcprivacy({ [BOOT_TIME]: ['35F9.1'] }),
    }));
    const byCategory = Object.fromEntries(issues.map((issue) => [issue.message.split(' ')[0], issue.message]));
    assert.match(byCategory[DISK_SPACE], /E174\.1 \(expo-file-system\)/);
    assert.match(byCategory[USER_DEFAULTS], /CA92\.1 \(@scope\/kit\)/);
    assert.match(byCategory[BOOT_TIME], /35F9\.1 \(inner-lib\)/);
  });

  it('follows pnpm symlinks inside the project without double counting', (t) => {
    const root = makeProject({
      ...expoProject({}),
      'node_modules/.pnpm/expo-file-system@58.0.13/node_modules/expo-file-system/ios/PrivacyInfo.xcprivacy': xcprivacy({ [DISK_SPACE]: ['E174.1'] }),
    });
    try {
      fs.symlinkSync(path.join(root, 'node_modules/.pnpm/expo-file-system@58.0.13/node_modules/expo-file-system'), path.join(root, 'node_modules/expo-file-system'), 'junction');
    } catch {
      return t.skip('symlinks not available');
    }
    const result = scan(createProjectFiles(root));
    assert.equal(result.manifests.length, 1);
    assert.equal(result.manifests[0].pkg, 'expo-file-system');
    assert.equal(result.skippedLinks, 0);
  });

  it('skips symlinked packages that point outside the project and says so', (t) => {
    const outside = makeProject({ 'evil/ios/PrivacyInfo.xcprivacy': xcprivacy({ [DISK_SPACE]: ['E174.1'] }) });
    const root = makeProject(expoProject({}, {}, { 'node_modules/.keep': '' }));
    try {
      fs.symlinkSync(path.join(outside, 'evil'), path.join(root, 'node_modules/evil'), 'junction');
    } catch {
      return t.skip('symlinks not available');
    }
    const issues = runCheck(check, root);
    assert.ok(!issues.some((issue) => issue.message.startsWith(DISK_SPACE)));
    assert.ok(issues.some((issue) => issue.severity === 'info' && /1 symlinked package\(s\) point outside the project/.test(issue.message)));
  });

  it('reports unreadable package manifests instead of failing', () => {
    const issues = runCheck(check, expoProject({}, {}, { 'node_modules/broken/ios/PrivacyInfo.xcprivacy': '<plist><dict><key>A</key></dict></plist>' }));
    assert.equal(issues.length, 1);
    assert.match(issues[0].message, /1 package privacy manifest\(s\) could not be read \(node_modules\/broken\/ios\/PrivacyInfo\.xcprivacy\)/);
  });

  it('errors on an unknown category and suggests the full name', () => {
    const issues = runCheck(check, expoProject(manifests(entry('UserDefaults', ['CA92.1'])), {}, { 'node_modules/.keep': '' }));
    assert.equal(issues.length, 1);
    assert.equal(issues[0].severity, 'error');
    assert.match(issues[0].fix, /NSPrivacyAccessedAPICategoryUserDefaults/);
  });

  it('errors on a reason code from another category and names that category', () => {
    const issues = runCheck(check, expoProject(manifests(entry(DISK_SPACE, ['CA92.1', 'E174.1'])), {}, { 'node_modules/.keep': '' }));
    assert.equal(issues.length, 1);
    assert.match(issues[0].message, /"CA92\.1".*belongs to NSPrivacyAccessedAPICategoryUserDefaults/);
  });

  it('errors on missing reasons and on malformed shapes', () => {
    const issues = runCheck(check, expoProject(manifests(entry(BOOT_TIME, []), 'nope'), {}, { 'node_modules/.keep': '' }));
    assert.equal(issues.length, 2);
    assert.ok(issues.every((issue) => issue.severity === 'error'));
    const notArray = runCheck(check, expoProject({ ios: { privacyManifests: { NSPrivacyAccessedAPITypes: {} } } }));
    assert.match(notArray[0].message, /must be an array/);
  });

  it('an entry with only invalid codes does not count as declared', () => {
    const issues = runCheck(check, expoProject(manifests(entry(FILE_TIMESTAMP, ['XXXX.1'])), ASYNC_STORAGE, {
      'node_modules/@react-native-async-storage/async-storage/ios/PrivacyInfo.xcprivacy': xcprivacy({ [FILE_TIMESTAMP]: ['C617.1'] }),
    }));
    assert.deepEqual(issues.map((issue) => issue.severity), ['error', 'warning']);
  });

  it('compares with PrivacyInfo.xcprivacy in a bare project, ignoring Pods', () => {
    const appManifest = xcprivacy({ [FILE_TIMESTAMP]: ['C617.1'] });
    const base = {
      'package.json': { name: 'bare', dependencies: { 'react-native': '0.88.0', ...ASYNC_STORAGE } },
      'ios/App.xcodeproj/project.pbxproj': '',
      'node_modules/@react-native-async-storage/async-storage/ios/PrivacyInfo.xcprivacy': appManifest,
    };
    assert.deepEqual(runCheck(check, { ...base, 'ios/App/PrivacyInfo.xcprivacy': appManifest }), []);
    const pods = runCheck(check, { ...base, 'ios/Pods/Some/PrivacyInfo.xcprivacy': appManifest });
    assert.equal(pods.length, 1);
    assert.match(pods[0].message, /not in the app target's PrivacyInfo\.xcprivacy/);
    const broken = runCheck(check, { ...base, 'ios/App/PrivacyInfo.xcprivacy': '<plist><dict><key>A</key></dict></plist>' });
    assert.ok(broken.some((issue) => issue.severity === 'error' && /is not a valid XML property list./.test(issue.message)));
  });

  it('skips the comparison when app config could not be read', () => {
    const issues = runCheck(check, {
      'package.json': { name: 'dyn', dependencies: { expo: '~58.0.0' } },
      'app.config.js': 'export default ({ config }) => ({ ...config });',
      'node_modules/expo-constants/ios/PrivacyInfo.xcprivacy': xcprivacy({ [USER_DEFAULTS]: ['CA92.1'] }),
    });
    assert.deepEqual(issues, []);
  });
});
