import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readStaticConfig } from '../../src/parsers/js-literal.js';

describe('readStaticConfig', () => {
  it('reads an exported object literal', () => {
    const result = readStaticConfig(`
      // app config
      /* block comment with export default nonsense */
      export default {
        name: 'My App',
        "slug": "my-app",
        version: \`1.0.0\`,
        ios: { bundleIdentifier: 'com.example.app', supportsTablet: true, buildNumber: '1', },
        android: { versionCode: 3, permissions: ['CAMERA', "android.permission.INTERNET"] },
        plugins: [['expo-build-properties', { android: { targetSdkVersion: 36 } }]],
        extra: { url: 'https://example.com/privacy', nothing: null, gone: undefined },
      };
    `);
    assert.equal(result.ok, true);
    assert.deepEqual(result.ok && result.value, {
      name: 'My App',
      slug: 'my-app',
      version: '1.0.0',
      ios: { bundleIdentifier: 'com.example.app', supportsTablet: true, buildNumber: '1' },
      android: { versionCode: 3, permissions: ['CAMERA', 'android.permission.INTERNET'] },
      plugins: [['expo-build-properties', { android: { targetSdkVersion: 36 } }]],
      extra: { url: 'https://example.com/privacy', nothing: null },
    });
  });

  it('reads module.exports and a typed const that is exported by name', () => {
    const cjs = readStaticConfig("module.exports = { expo: { name: 'A' } };");
    assert.deepEqual(cjs.ok && cjs.value, { expo: { name: 'A' } });
    const ts = readStaticConfig(`import { ExpoConfig } from 'expo/config';
const config: ExpoConfig = { name: 'B', slug: 'b' };
export default config;`);
    assert.deepEqual(ts.ok && ts.value, { name: 'B', slug: 'b' });
  });

  it('keeps comment-like text inside strings', () => {
    const result = readStaticConfig("export default { url: 'https://example.com/a//b', note: \"/* not a comment */\" };");
    assert.deepEqual(result.ok && result.value, { url: 'https://example.com/a//b', note: '/* not a comment */' });
  });

  for (const [label, source] of [
    ['function export', 'export default ({ config }) => ({ ...config, name: "x" });'],
    ['function declaration', 'export default function () { return {}; }'],
    ['environment variable', 'export default { name: process.env.APP_NAME };'],
    ['spread', 'const base = {}; export default { ...base };'],
    ['template expression', 'export default { name: `App ${1}` };'],
    ['shorthand property', 'const name = "x"; export default { name };'],
    ['computed key', 'export default { ["a" + "b"]: 1 };'],
    ['mutated const', 'const config = { name: "A" }; config.name = "B"; export default config;'],
    ['call', 'export default withPlugins({ name: "A" });'],
    ['no export', 'const a = { name: "A" };'],
  ]) {
    it(`refuses a ${label}`, () => {
      const result = readStaticConfig(source);
      assert.equal(result.ok, false);
      assert.equal(typeof (!result.ok && result.reason), 'string');
    });
  }
});
