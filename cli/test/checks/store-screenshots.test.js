import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as check from '../../src/checks/store-screenshots.js';
import { makeJpeg, makePng } from '../helpers/images.js';
import { expoProject, runCheck } from '../helpers/project.js';

const IOS = 'store/screenshots/ios';
const ANDROID = 'store/screenshots/android';
const withoutInfo = (issues) => issues.filter((issue) => issue.severity !== 'info');

describe('store.screenshots', () => {
  it('does nothing without a screenshots folder', () => {
    assert.deepEqual(runCheck(check, expoProject({})), []);
  });

  it('passes valid iPhone screenshots in portrait and landscape, ignoring notes files', () => {
    const issues = runCheck(check, expoProject({}, {}, {
      [`${IOS}/iphone/01.png`]: makePng(1206, 2622),
      [`${IOS}/iphone/02.jpg`]: makeJpeg(2556, 1179),
      [`${IOS}/iphone/03.png`]: makePng(1320, 2868),
      [`${IOS}/iphone/README.md`]: '# notes',
    }));
    assert.deepEqual(withoutInfo(issues), []);
    assert.match(issues[0].message, /iPhone Duo/);
  });

  it('classifies by pixel size, not folder name', () => {
    const issues = runCheck(check, expoProject({}, {}, { [`${IOS}/ipad/01.png`]: makePng(1179, 2556) }));
    assert.deepEqual(withoutInfo(issues), []);
  });

  it('errors on alpha and transparency', () => {
    const issues = runCheck(check, expoProject({}, {}, {
      [`${IOS}/iphone/01.png`]: makePng(1206, 2622, { alpha: true }),
      [`${IOS}/iphone/02.png`]: makePng(1179, 2556, { transparency: true }),
    }));
    assert.equal(withoutInfo(issues).length, 2);
    assert.ok(withoutInfo(issues).every((issue) => issue.severity === 'error' && /alpha/.test(issue.message)));
  });

  it('errors on an unknown size and names the closest accepted sizes', () => {
    const [issue] = runCheck(check, expoProject({}, {}, { [`${IOS}/iphone/01.png`]: makePng(1200, 2600), [`${IOS}/iphone/02.png`]: makePng(1206, 2622) }));
    assert.equal(issue.severity, 'error');
    assert.match(issue.message, /1200x2600.*Closest accepted: 1206x2622 \(iPhone with Dynamic Island \(medium display\)\)/);
  });

  it('errors when the required iPhone class is missing', () => {
    const issues = withoutInfo(runCheck(check, expoProject({}, {}, { [`${IOS}/iphone/01.png`]: makePng(1290, 2796) })));
    assert.equal(issues.length, 1);
    assert.match(issues[0].message, /No screenshots for iPhone with Dynamic Island \(medium display\)/);
  });

  it('requires iPad 13-inch only when the app supports iPad', () => {
    const files = { [`${IOS}/iphone/01.png`]: makePng(1206, 2622) };
    assert.deepEqual(withoutInfo(runCheck(check, expoProject({ ios: { supportsTablet: false } }, {}, files))), []);
    const issues = withoutInfo(runCheck(check, expoProject({ ios: { supportsTablet: true } }, {}, files)));
    assert.match(issues[0].message, /iPad 13-inch display.*runs on iPad/);
    assert.deepEqual(withoutInfo(runCheck(check, expoProject({ ios: { supportsTablet: true } }, {}, { ...files, [`${IOS}/ipad/01.png`]: makePng(2048, 2732) }))), []);
  });

  it('allows at most 10 screenshots per device class', () => {
    const files = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`${IOS}/iphone/${i}.png`, makePng(1206, 2622)]));
    const issues = withoutInfo(runCheck(check, expoProject({}, {}, files)));
    assert.equal(issues.length, 1);
    assert.match(issues[0].message, /11 screenshots for iPhone with Dynamic Island \(medium display\)/);
  });

  it('errors on unsupported formats and warns about unknown folders', () => {
    const issues = runCheck(check, expoProject({}, {}, {
      [`${IOS}/iphone/01.webp`]: 'x',
      [`${IOS}/watch/01.png`]: makePng(10, 10),
      'store/screenshots/web/01.png': makePng(10, 10),
    }));
    assert.ok(issues.some((issue) => issue.severity === 'error' && /not a \.png/.test(issue.message)));
    assert.ok(issues.some((issue) => issue.severity === 'warning' && /ios\/watch was not checked/.test(issue.message)));
    assert.ok(issues.some((issue) => issue.severity === 'warning' && issue.platform === 'both'));
  });

  it('passes valid Play screenshots and feature graphic', () => {
    const files = {
      [`${ANDROID}/phone/01.png`]: makePng(1080, 1920),
      [`${ANDROID}/phone/02.png`]: makePng(1080, 1920),
      [`${ANDROID}/phone/03.jpg`]: makeJpeg(1080, 2160),
      [`${ANDROID}/tablet/01.png`]: makePng(2560, 1600),
      [`${ANDROID}/feature-graphic/feature.jpg`]: makeJpeg(1024, 500),
    };
    assert.deepEqual(runCheck(check, expoProject({}, {}, files)), []);
  });

  it('errors on Play side limits, ratio, alpha and count', () => {
    const issues = runCheck(check, expoProject({}, {}, {
      [`${ANDROID}/phone/small.png`]: makePng(300, 600),
      [`${ANDROID}/phone/large.png`]: makePng(2000, 3900),
      [`${ANDROID}/phone/tall.png`]: makePng(1000, 2100),
      [`${ANDROID}/phone/alpha.png`]: makePng(1080, 1920, { alpha: true }),
    }));
    const errors = issues.filter((issue) => issue.severity === 'error').map((issue) => issue.message);
    assert.equal(errors.length, 4);
    assert.ok(issues.some((issue) => issue.severity === 'warning' && /0 valid screenshots/.test(issue.message)));
    assert.ok(issues.some((issue) => issue.severity === 'info' && /promotion/.test(issue.message)));
    const many = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`${ANDROID}/phone/${i}.png`, makePng(1080, 1920)]));
    assert.match(runCheck(check, expoProject({}, {}, many)).find((issue) => issue.severity === 'error')?.message ?? '', /9 screenshots; Play allows up to 8/);
  });

  it('checks feature graphic size and alpha', () => {
    const issues = runCheck(check, expoProject({}, {}, { [`${ANDROID}/feature-graphic/f.png`]: makePng(1000, 500, { alpha: true }) }));
    assert.deepEqual(issues.map((issue) => issue.severity), ['error', 'error']);
  });

  it('leaves the Play icon folder to app.icon', () => {
    assert.deepEqual(runCheck(check, expoProject({}, {}, { [`${ANDROID}/icon/icon.png`]: makePng(1, 1) })), []);
  });

  it('exposes size helpers', () => {
    assert.equal(check.iosClassFor(2868, 1320)?.name, 'iPhone with Dynamic Island (large display)');
    assert.equal(check.iosClassFor(100, 100), null);
    assert.equal(check.closestIosSizes(2600, 1200, 1)[0], '2622x1206 (iPhone with Dynamic Island (medium display))');
  });
});
