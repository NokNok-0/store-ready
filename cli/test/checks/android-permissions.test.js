import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as check from '../../src/checks/android-permissions.js';
import { expoProject, runCheck } from '../helpers/project.js';

describe('android.permissions', () => {
  it('reports nothing when no permissions are declared', () => {
    assert.deepEqual(runCheck(check, expoProject({})), []);
  });

  it('lists ordinary permissions as info only', () => {
    const issues = runCheck(check, expoProject({ android: { permissions: ['CAMERA', 'android.permission.INTERNET'] } }));
    assert.equal(issues.length, 1);
    assert.equal(issues[0].severity, 'info');
    assert.match(issues[0].message, /CAMERA, INTERNET/);
  });

  it('warns for each permission that needs a Play declaration, citing its own source', () => {
    const permissions = ['READ_MEDIA_IMAGES', 'READ_MEDIA_VIDEO', 'ACCESS_BACKGROUND_LOCATION', 'USE_EXACT_ALARM', 'FOREGROUND_SERVICE_DATA_SYNC', 'USE_FULL_SCREEN_INTENT', 'MANAGE_EXTERNAL_STORAGE', 'QUERY_ALL_PACKAGES'];
    const issues = runCheck(check, expoProject({ android: { permissions } })).filter((issue) => issue.severity === 'warning');
    assert.equal(issues.length, permissions.length);
    const sources = Object.fromEntries(issues.map((issue) => [issue.message.split(' ')[0], issue.source]));
    assert.match(sources.READ_MEDIA_IMAGES, /14115180$/);
    assert.match(sources.ACCESS_BACKGROUND_LOCATION, /9799150$/);
    assert.match(sources.USE_EXACT_ALARM, /16558241$/);
    assert.match(sources.FOREGROUND_SERVICE_DATA_SYNC, /13392821$/);
    assert.match(issues[0].fix, /blockedPermissions/);
  });

  it('does not flag the plain FOREGROUND_SERVICE or SCHEDULE_EXACT_ALARM permissions', () => {
    const issues = runCheck(check, expoProject({ android: { permissions: ['FOREGROUND_SERVICE', 'SCHEDULE_EXACT_ALARM'] } }));
    assert.deepEqual(issues.map((issue) => issue.severity), ['info']);
  });

  it('honours android.blockedPermissions', () => {
    const issues = runCheck(check, expoProject({ android: { permissions: ['READ_MEDIA_IMAGES'], blockedPermissions: ['android.permission.READ_MEDIA_IMAGES'] } }));
    assert.deepEqual(issues, []);
  });

  it('adds background location from the expo-location plugin option', () => {
    const issues = runCheck(check, expoProject({ plugins: [['expo-location', { isAndroidBackgroundLocationEnabled: true }]] }));
    assert.ok(issues.some((issue) => issue.severity === 'warning' && /ACCESS_BACKGROUND_LOCATION/.test(issue.message)));
  });

  it('reads AndroidManifest.xml and skips tools:node="remove" and comments', () => {
    const manifest = `<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools" package="com.example.bare">
  <uses-permission android:name="android.permission.INTERNET" />
  <!-- <uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" /> -->
  <uses-permission android:name="android.permission.USE_EXACT_ALARM"/>
  <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" tools:node="remove" />
</manifest>`;
    const issues = runCheck(check, {
      'package.json': { name: 'bare', dependencies: { 'react-native': '0.88.0' } },
      'android/app/src/main/AndroidManifest.xml': manifest,
    });
    assert.deepEqual(issues.map((issue) => issue.severity), ['info', 'warning']);
    assert.match(issues[0].message, /INTERNET, USE_EXACT_ALARM$|INTERNET, USE_EXACT_ALARM\./);
    assert.match(issues[1].fix, /tools:node="remove"/);
    assert.equal(issues[1].file, 'android/app/src/main/AndroidManifest.xml');
  });
});
