import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as check from '../../src/checks/app-icon.js';
import { makeJpeg, makePng } from '../helpers/images.js';
import { expoProject, runCheck } from '../helpers/project.js';

const ICON = { icon: './assets/icon.png' };

describe('app.icon', () => {
  it('passes with a 1024x1024 icon', () => {
    assert.deepEqual(runCheck(check, expoProject(ICON, {}, { 'assets/icon.png': makePng(1024, 1024) })), []);
  });

  it('errors when no icon is configured', () => {
    const issues = runCheck(check, expoProject({}));
    assert.equal(issues.length, 1);
    assert.equal(issues[0].severity, 'error');
    assert.match(issues[0].message, /No app icon/);
  });

  it('errors when the icon file is missing, once', () => {
    const issues = runCheck(check, expoProject(ICON));
    assert.equal(issues.length, 1);
    assert.match(issues[0].message, /does not exist/);
  });

  it('errors on wrong size or non-square icons', () => {
    for (const [w, h] of [[512, 512], [1024, 1000]]) {
      const issues = runCheck(check, expoProject(ICON, {}, { 'assets/icon.png': makePng(w, h) }));
      assert.equal(issues.length, 1);
      assert.equal(issues[0].severity, 'error');
      assert.match(issues[0].message, new RegExp(`${w}x${h}`));
    }
  });

  it('does not note alpha for Expo managed projects, which flatten the icon', () => {
    assert.deepEqual(runCheck(check, expoProject(ICON, {}, { 'assets/icon.png': makePng(1024, 1024, { alpha: true }) })), []);
  });

  it('notes alpha on a native iOS icon as info only', () => {
    const contents = { images: [{ idiom: 'universal', platform: 'ios', size: '1024x1024', filename: 'icon-1024.png' }] };
    const set = 'ios/App/Images.xcassets/AppIcon.appiconset';
    const issues = runCheck(check, {
      'package.json': { name: 'bare', dependencies: { 'react-native': '0.88.0' } },
      'ios/App.xcodeproj/project.pbxproj': '',
      [`${set}/Contents.json`]: contents,
      [`${set}/icon-1024.png`]: makePng(1024, 1024, { alpha: true }),
    });
    assert.deepEqual(issues.map((issue) => issue.severity), ['info']);
    assert.match(issues[0].message, /alpha channel/);
  });

  it('prefers ios.icon and accepts Icon Composer files', () => {
    const files = { 'assets/icon.png': makePng(100, 100), 'assets/ios.png': makePng(1024, 1024) };
    assert.deepEqual(runCheck(check, expoProject({ ...ICON, platforms: ['ios'], ios: { icon: './assets/ios.png' } }, {}, files)), []);
    assert.deepEqual(runCheck(check, expoProject({ platforms: ['ios'], ios: { icon: './assets/app.icon' } }, {}, { 'assets/app.icon/icon.json': {} })), []);
  });

  it('errors when a configured Android icon file is missing', () => {
    const issues = runCheck(check, expoProject({ ...ICON, android: { adaptiveIcon: { foregroundImage: './assets/fg.png' } } }, {}, { 'assets/icon.png': makePng(1024, 1024) }));
    assert.equal(issues.length, 1);
    assert.equal(issues[0].platform, 'android');
  });

  it('validates the Play icon in store/screenshots/android/icon', () => {
    const base = { 'assets/icon.png': makePng(1024, 1024) };
    assert.deepEqual(runCheck(check, expoProject(ICON, {}, { ...base, 'store/screenshots/android/icon/icon.png': makePng(512, 512, { alpha: true }) })), []);
    const wrong = runCheck(check, expoProject(ICON, {}, { ...base, 'store/screenshots/android/icon/icon.png': makePng(500, 500) }));
    assert.deepEqual(wrong.map((issue) => issue.severity), ['error', 'warning']);
    assert.match(wrong[1].message, /32-bit/);
    const jpeg = runCheck(check, expoProject(ICON, {}, { ...base, 'store/screenshots/android/icon/icon.jpg': makeJpeg(512, 512) }));
    assert.match(jpeg[0].message, /needs a PNG/);
  });

  it('checks the 1024 image in a native AppIcon set', () => {
    const contents = { images: [{ idiom: 'universal', platform: 'ios', size: '1024x1024', filename: 'icon-1024.png' }] };
    const base = { 'package.json': { name: 'bare', dependencies: { 'react-native': '0.88.0' } }, 'ios/App.xcodeproj/project.pbxproj': '' };
    const set = 'ios/App/Images.xcassets/AppIcon.appiconset';
    assert.deepEqual(runCheck(check, { ...base, [`${set}/Contents.json`]: contents, [`${set}/icon-1024.png`]: makePng(1024, 1024) }), []);
    assert.match(runCheck(check, { ...base, [`${set}/Contents.json`]: contents, [`${set}/icon-1024.png`]: makePng(1000, 1000) })[0].message, /1000x1000/);
    assert.match(runCheck(check, { ...base, [`${set}/Contents.json`]: { images: [] } })[0].message, /no 1024x1024/);
    assert.match(runCheck(check, base)[0].message, /No AppIcon\.appiconset/);
  });
});
