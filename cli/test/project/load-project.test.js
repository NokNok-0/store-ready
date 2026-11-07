import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { loadProject, UsageError } from '../../src/project/load-project.js';
import { parseManifest } from '../../src/project/native-android.js';
import { makeProject } from '../helpers/project.js';

const EXPO_PACKAGE = { name: 'app', version: '1.0.0', dependencies: { expo: '~58.0.0' } };

describe('loadProject', () => {
  it('reads app.json for an Expo project', () => {
    const root = makeProject({ 'package.json': EXPO_PACKAGE, 'app.json': { expo: { name: 'A', ios: { bundleIdentifier: 'com.a' } } } });
    const project = loadProject(root);
    assert.equal(project.type, 'expo');
    assert.deepEqual([...project.platforms], ['ios', 'android']);
    assert.equal(project.expo.complete, true);
    assert.equal(project.expo.file, 'app.json');
    assert.equal(project.expo.config.ios.bundleIdentifier, 'com.a');
  });

  it('reads a literal app.config.ts statically without running it', () => {
    const root = makeProject({
      'package.json': EXPO_PACKAGE,
      'app.config.ts': "throwIfRun();\nexport default { name: 'Static', platforms: ['ios'] };\n",
    });
    const project = loadProject(root);
    assert.equal(project.expo.complete, true);
    assert.equal(project.expo.file, 'app.config.ts');
    assert.equal(project.expo.config.name, 'Static');
    assert.deepEqual([...project.platforms], ['ios']);
    assert.deepEqual(project.notes, []);
  });

  it('adds an info note and falls back to app.json for a dynamic app.config.js', () => {
    const root = makeProject({
      'package.json': EXPO_PACKAGE,
      'app.json': { expo: { name: 'FromJson' } },
      'app.config.js': 'module.exports = ({ config }) => ({ ...config, name: process.env.NAME });',
    });
    const project = loadProject(root);
    assert.equal(project.expo.complete, false);
    assert.equal(project.expo.config.name, 'FromJson');
    assert.equal(project.notes.length, 1);
    assert.equal(project.notes[0].severity, 'info');
    assert.match(project.notes[0].fix, /npx expo config --json > store\/expo-config\.json/);
  });

  it('uses --config output, relative to cwd or the project, in either shape', () => {
    const root = makeProject({
      'package.json': EXPO_PACKAGE,
      'app.config.js': 'module.exports = () => ({});',
      'store/expo-config.json': { name: 'Resolved', ios: { bundleIdentifier: 'com.resolved' } },
      'store/full.json': { exp: { name: 'Full' } },
    });
    const fromRoot = loadProject(root, { configFile: 'store/expo-config.json', cwd: path.dirname(root) });
    assert.equal(fromRoot.expo.config.name, 'Resolved');
    assert.equal(fromRoot.expo.complete, true);
    assert.deepEqual(fromRoot.notes, []);
    assert.equal(loadProject(root, { configFile: path.join(root, 'store/full.json') }).expo.config.name, 'Full');
    assert.throws(() => loadProject(root, { configFile: 'missing.json' }), UsageError);
  });

  it('reports invalid app.json and package.json as errors', () => {
    const root = makeProject({ 'package.json': '{ nope', 'app.json': '{ "expo": ' , 'android/app/build.gradle': '' });
    const project = loadProject(root);
    assert.deepEqual(project.notes.map((note) => [note.severity, note.file]), [['error', 'package.json']]);
    const expoRoot = makeProject({ 'package.json': EXPO_PACKAGE, 'app.json': '{ "expo": ' });
    assert.deepEqual(loadProject(expoRoot).notes.map((note) => [note.severity, note.file]), [['error', 'app.json']]);
  });

  it('detects bare React Native and native-only projects', () => {
    const bare = makeProject({ 'package.json': { dependencies: { 'react-native': '0.88.0' } }, 'android/app/build.gradle': '' });
    assert.equal(loadProject(bare).type, 'react-native');
    assert.deepEqual([...loadProject(bare).platforms], ['android']);
    const ios = makeProject({ 'ios/App/Info.plist': '<plist><dict/></plist>' });
    assert.equal(loadProject(ios).type, 'ios');
  });

  it('refuses directories without a mobile project', () => {
    assert.throws(() => loadProject(makeProject({ 'package.json': { name: 'server' } })), UsageError);
    assert.throws(() => loadProject(path.join(makeProject({}), 'missing')), UsageError);
  });
});

describe('parseManifest', () => {
  it('reads permissions and the package attribute', () => {
    const result = parseManifest(`<manifest package="com.example" xmlns:tools="t">
      <uses-permission android:name='android.permission.CAMERA'/>
      <uses-permission-sdk-23 android:name="android.permission.READ_CONTACTS" />
      <uses-permission android:name="android.permission.RECORD_AUDIO" tools:node="remove"/>
    </manifest>`);
    assert.equal(result.packageName, 'com.example');
    assert.deepEqual(result.permissions, [
      { name: 'android.permission.CAMERA', removed: false },
      { name: 'android.permission.READ_CONTACTS', removed: false },
      { name: 'android.permission.RECORD_AUDIO', removed: true },
    ]);
  });
});
