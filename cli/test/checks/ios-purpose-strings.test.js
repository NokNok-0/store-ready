import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as check from '../../src/checks/ios-purpose-strings.js';
import { expoProject, runCheck } from '../helpers/project.js';

const GOOD_CAMERA = 'The camera is used to scan receipts and attach them to an expense.';

const plist = (body) => `<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict>${body}</dict></plist>`;

describe('ios.purpose-strings', () => {
  it('errors when a package needs a purpose string that is missing', () => {
    const issues = runCheck(check, expoProject({}, { 'expo-camera': '~58.0.0' })).filter((issue) => issue.severity === 'error');
    assert.equal(issues.length, 1);
    assert.equal(issues[0].severity, 'error');
    assert.equal(issues[0].platform, 'ios');
    assert.match(issues[0].message, /NSCameraUsageDescription is not set, but expo-camera/);
    assert.equal(issues[0].file, 'app.json');
  });

  it('passes when ios.infoPlist sets a specific string', () => {
    const issues = runCheck(check, expoProject({ ios: { infoPlist: { NSCameraUsageDescription: GOOD_CAMERA } }, plugins: [['expo-camera', { microphonePermission: false }]] }, { 'expo-camera': '~58.0.0' }));
    assert.deepEqual(issues, []);
  });

  it('reads plugin options and treats false as removing the permission', () => {
    const issues = runCheck(check, expoProject({
      plugins: [['expo-image-picker', { photosPermission: 'Your photo library is used when you choose a picture to attach to a note.', cameraPermission: false, microphonePermission: false }]],
    }, { 'expo-image-picker': '~58.0.0' }));
    assert.deepEqual(issues, []);
  });

  it('lists every package that needs the same key once', () => {
    const issues = runCheck(check, expoProject({}, { 'expo-image-picker': '1', 'expo-media-library': '1' }));
    const photo = issues.filter((issue) => issue.message.startsWith('NSPhotoLibraryUsageDescription'));
    assert.equal(photo.length, 1);
    assert.match(photo[0].message, /expo-image-picker, expo-media-library use/);
    assert.ok(issues.some((issue) => issue.message.startsWith('NSCameraUsageDescription')));
  });

  it('accepts the iOS 17 calendar key as an alternative', () => {
    const issues = runCheck(check, expoProject({ ios: { infoPlist: { NSCalendarsFullAccessUsageDescription: 'Your calendar is used to add the classes you book as events.' } } }, { 'expo-calendar': '1' }));
    assert.deepEqual(issues, []);
  });

  it('requires a microphone string for expo-audio only when recording code exists', () => {
    assert.deepEqual(runCheck(check, expoProject({}, { 'expo-audio': '1' }, { 'src/player.tsx': 'useAudioPlayer(source);' })), []);
    const issues = runCheck(check, expoProject({}, { 'expo-audio': '1' }, { 'src/recorder.tsx': 'const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);' }));
    assert.equal(issues.length, 1);
    assert.match(issues[0].message, /NSMicrophoneUsageDescription/);
  });

  it('warns about generic strings with the reason', () => {
    const issues = runCheck(check, expoProject({
      ios: {
        infoPlist: {
          NSCameraUsageDescription: 'Camera access',
          NSLocationWhenInUseUsageDescription: 'This app needs access to your location.',
          NSContactsUsageDescription: 'Contacts are required for app functionality in general',
          NSMicrophoneUsageDescription: 'Microphone access is required by the application',
        },
      },
    }));
    assert.equal(issues.length, 4);
    assert.ok(issues.every((issue) => issue.severity === 'warning'));
    assert.match(issues[0].message, /shorter than 25 characters/);
    assert.match(issues[1].message, /template text/);
    assert.match(issues[2].message, /template text/);
    assert.match(issues[3].message, /does not say what the data is used for/);
  });

  it('flags Expo default-style text but not a specific sentence with a similar opening', () => {
    assert.equal(check.genericReason('Allow $(PRODUCT_NAME) to access your camera'), 'is the generic default text an Expo config plugin writes');
    assert.equal(check.genericReason('Allow Streaks to access your camera'), 'reads like template text');
    assert.equal(check.genericReason('This app needs access to your camera so you can scan receipts into expenses.'), null);
    assert.equal(check.genericReason(GOOD_CAMERA), null);
  });

  it('errors when a purpose string is not a string', () => {
    const issues = runCheck(check, expoProject({ ios: { infoPlist: { NSCameraUsageDescription: true } } }));
    assert.equal(issues[0].severity, 'error');
    assert.match(issues[0].message, /not a string/);
  });

  it('reads Info.plist files in a bare React Native project', () => {
    const files = {
      'package.json': { name: 'bare', dependencies: { 'react-native': '0.88.0', 'expo-camera': '1' } },
      'ios/Bare/Info.plist': plist('<key>NSCameraUsageDescription</key><string>Camera</string>'),
      'ios/Bare.xcodeproj/project.pbxproj': '',
    };
    const issues = runCheck(check, files);
    assert.equal(issues.length, 1);
    assert.equal(issues[0].severity, 'warning');
    assert.equal(issues[0].file, 'ios/Bare/Info.plist');
  });

  it('skips missing-string errors when app config could not be read', () => {
    const issues = runCheck(check, {
      'package.json': { name: 'dyn', dependencies: { expo: '~58.0.0', 'expo-camera': '1' } },
      'app.config.js': 'export default ({ config }) => ({ ...config });',
    });
    assert.deepEqual(issues, []);
  });

  it('warns when a listed plugin will write its default text for an unset option', () => {
    const photos = 'Your photo library is used when you choose a picture to attach to a note.';
    const issues = runCheck(check, expoProject({
      ios: { infoPlist: { NSCameraUsageDescription: GOOD_CAMERA } },
      plugins: [['expo-image-picker', { photosPermission: photos }]],
    }, { 'expo-image-picker': '~58.0.0' }));
    assert.equal(issues.length, 1);
    assert.equal(issues[0].severity, 'warning');
    assert.match(issues[0].message, /expo-image-picker config plugin is in plugins without a "microphonePermission" option, and ios.infoPlist does not set NSMicrophoneUsageDescription/);
    assert.match(issues[0].fix, /"microphonePermission": false/);
    assert.match(issues[0].fix, /npx expo config --type introspect --json/);
  });

  it('does not warn when the option is false, set, or the key is in ios.infoPlist', () => {
    const photos = 'Your photo library is used when you choose a picture to attach to a note.';
    const mic = 'The microphone is used to record the sound of the videos you attach to a habit.';
    const base = { ios: { infoPlist: { NSCameraUsageDescription: GOOD_CAMERA } } };
    for (const plugins of [
      [['expo-image-picker', { photosPermission: photos, microphonePermission: false }]],
      [['expo-image-picker', { photosPermission: photos, microphonePermission: mic }]],
    ]) {
      assert.deepEqual(runCheck(check, expoProject({ ...base, plugins }, { 'expo-image-picker': '1' })), [], JSON.stringify(plugins));
    }
    const inPlist = { ios: { infoPlist: { NSCameraUsageDescription: GOOD_CAMERA, NSMicrophoneUsageDescription: mic } }, plugins: [['expo-image-picker', { photosPermission: photos }]] };
    assert.deepEqual(runCheck(check, expoProject(inPlist, { 'expo-image-picker': '1' })), []);
  });

  it('hedges when only the package is installed, and lists each default key once', () => {
    const issues = runCheck(check, expoProject({ ios: { infoPlist: { NSCameraUsageDescription: GOOD_CAMERA } } }, { 'expo-camera': '1', 'expo-image-picker': '1' }));
    const defaults = issues.filter((issue) => /generic default text/.test(issue.message));
    assert.equal(defaults.filter((issue) => /NSMicrophoneUsageDescription/.test(issue.message)).length, 1);
    assert.match(defaults[0].message, /installed and not in plugins; if Expo applies its config plugin automatically/);
  });

  it('reads plugin-applied strings from npx expo config --type introspect output', () => {
    const introspected = {
      name: 'Test',
      slug: 'test',
      plugins: [['expo-image-picker', { photosPermission: 'Your photo library is used when you choose a picture to attach to a note.' }]],
      ios: {
        infoPlist: {
          NSPhotoLibraryUsageDescription: 'Your photo library is used when you choose a picture to attach to a note.',
          NSCameraUsageDescription: 'Allow $(PRODUCT_NAME) to access your camera',
          NSMicrophoneUsageDescription: 'Allow $(PRODUCT_NAME) to access your microphone',
        },
      },
      _internal: { projectRoot: '/app', pluginHistory: {} },
    };
    const issues = runCheck(check, expoProject({}, { 'expo-image-picker': '1' }, { 'store/expo-config.json': introspected }), { configFile: 'store/expo-config.json' });
    assert.deepEqual(issues.map((issue) => issue.severity), ['warning', 'warning']);
    assert.ok(issues.every((issue) => /generic default text an Expo config plugin writes/.test(issue.message)));
    assert.deepEqual(issues.map((issue) => issue.file), ['store/expo-config.json', 'store/expo-config.json']);
  });

  it('does nothing for Android-only Expo apps', () => {
    assert.deepEqual(runCheck(check, expoProject({ platforms: ['android'] }, { 'expo-camera': '1' })), []);
  });
});
