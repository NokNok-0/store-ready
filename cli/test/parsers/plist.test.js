import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parsePlist, PlistError } from '../../src/parsers/plist.js';

const wrap = (body) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
${body}
</plist>`;

describe('parsePlist', () => {
  it('parses a typical Info.plist', () => {
    const result = parsePlist(wrap(`<dict>
  <!-- comment -->
  <key>CFBundleIdentifier</key>
  <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>NSCameraUsageDescription</key>
  <string>Scan &amp; save receipts &lt;fast&gt; &#x263A;</string>
  <key>LSRequiresIPhoneOS</key>
  <true/>
  <key>UIFileSharingEnabled</key>
  <false/>
  <key>Count</key>
  <integer>42</integer>
  <key>Ratio</key>
  <real>1.5</real>
  <key>Empty</key>
  <string/>
  <key>UISupportedInterfaceOrientations</key>
  <array>
    <string>UIInterfaceOrientationPortrait</string>
    <dict/>
    <array/>
  </array>
</dict>`));
    assert.deepEqual(result, {
      CFBundleIdentifier: '$(PRODUCT_BUNDLE_IDENTIFIER)',
      NSCameraUsageDescription: 'Scan & save receipts <fast> ☺',
      LSRequiresIPhoneOS: true,
      UIFileSharingEnabled: false,
      Count: 42,
      Ratio: 1.5,
      Empty: '',
      UISupportedInterfaceOrientations: ['UIInterfaceOrientationPortrait', {}, []],
    });
  });

  it('parses a privacy manifest with nested arrays of dicts', () => {
    const result = parsePlist(wrap(`<dict>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array><string>CA92.1</string></array>
    </dict>
  </array>
  <key>NSPrivacyTracking</key>
  <false/>
</dict>`));
    assert.deepEqual(result, {
      NSPrivacyAccessedAPITypes: [{ NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults', NSPrivacyAccessedAPITypeReasons: ['CA92.1'] }],
      NSPrivacyTracking: false,
    });
  });

  it('handles data, dates, CDATA and a __proto__ key safely', () => {
    const result = /** @type {any} */ (parsePlist(wrap(`<dict>
  <key>Blob</key><data>aGVs
  bG8=</data>
  <key>When</key><date>2026-11-07T00:00:00Z</date>
  <key>Raw</key><string><![CDATA[a <b> & c]]></string>
  <key>__proto__</key><string>x</string>
</dict>`)));
    assert.equal(result.Blob.toString('utf8'), 'hello');
    assert.equal(result.When, '2026-11-07T00:00:00Z');
    assert.equal(result.Raw, 'a <b> & c');
    assert.equal(Object.getOwnPropertyDescriptor(result, '__proto__')?.value, 'x');
    assert.equal(Object.getPrototypeOf(result), Object.prototype);
  });

  it('accepts a plist without the XML declaration', () => {
    assert.deepEqual(parsePlist('<plist><array><integer>-3</integer></array></plist>'), [-3]);
  });

  it('rejects binary plists', () => {
    assert.throws(() => parsePlist('bplist00\u0000\u0001'), PlistError);
  });

  it('rejects malformed documents', () => {
    assert.throws(() => parsePlist(wrap('<dict><key>A</key></dict>')), PlistError);
    assert.throws(() => parsePlist(wrap('<dict><string>no key</string></dict>')), PlistError);
    assert.throws(() => parsePlist(wrap('<dict><key>A</key><string>open</dict>')), PlistError);
    assert.throws(() => parsePlist(wrap('<integer>abc</integer>')), PlistError);
    assert.throws(() => parsePlist(wrap('<unknown/>')), PlistError);
    assert.throws(() => parsePlist('<plist><dict>'), PlistError);
  });
});
