import path from 'node:path';
import { isDirectory, isObject } from '../fs-utils.js';
import { SOURCES } from '../sources.js';
import { createCodeIndex } from './code-scan.js';
import { loadExpoConfig } from './expo-config.js';
import { loadAndroid } from './native-android.js';
import { loadIos } from './native-ios.js';
import { createProjectFiles } from './project-files.js';
import { UsageError } from './usage-error.js';

/**
 * @typedef {'expo' | 'react-native' | 'native' | 'ios' | 'android'} ProjectType
 * @typedef {{
 *   root: string,
 *   type: ProjectType,
 *   platforms: Set<'ios' | 'android'>,
 *   packageJson: Record<string, any> | null,
 *   dependencies: Map<string, string>,
 *   hasDependency: (name: string) => boolean,
 *   expo: import('./expo-config.js').ExpoConfigResult,
 *   ios: import('./native-ios.js').IosProject,
 *   android: import('./native-android.js').AndroidProject,
 *   code: import('./code-scan.js').CodeIndex,
 *   files: import('./project-files.js').ProjectFiles,
 *   resolve: (relative: string) => string | null,
 *   exists: (relative: string) => boolean,
 *   notes: import('../issue.js').Issue[],
 *   urlChecks: Map<string, import('./links.js').UrlCheck>,
 * }} Project
 */

/**
 * @param {string} root
 * @param {{ configFile?: string, cwd?: string }} [options]
 * @returns {Project}
 */
export function loadProject(root, { configFile, cwd = process.cwd() } = {}) {
  const absoluteRoot = path.resolve(cwd, root);
  if (!isDirectory(absoluteRoot)) throw new UsageError(`Not a directory: ${root}`);
  const files = createProjectFiles(absoluteRoot);
  /** @type {import('../issue.js').Issue[]} */
  const notes = [];

  const packageRead = files.readJson('package.json');
  if ('error' in packageRead) {
    notes.push({
      id: 'project.config',
      severity: 'error',
      platform: 'both',
      message: `package.json is ${packageRead.error}.`,
      fix: 'Fix the JSON syntax in package.json.',
      source: SOURCES.expoVersions,
      file: 'package.json',
    });
  }
  const packageJson = 'value' in packageRead && isObject(packageRead.value) ? packageRead.value : null;
  const dependencies = collectDependencies(packageJson);

  const expo = loadExpoConfig(files, { configFile, cwd, hasExpoDependency: dependencies.has('expo') });
  notes.push(...expo.notes);
  const ios = loadIos(files);
  const android = loadAndroid(files);

  const type = detectType({ isExpo: expo.isExpo, dependencies, ios, android });
  if (!type) {
    throw new UsageError(`No mobile project found in ${files.root} (looked for package.json with expo or react-native, app.json, app.config.*, ios/ and android/).`);
  }

  return {
    root: files.root,
    type,
    platforms: detectPlatforms(type, expo.config, ios.present, android.present),
    packageJson,
    dependencies,
    hasDependency: (name) => dependencies.has(name),
    expo,
    ios,
    android,
    code: createCodeIndex(files),
    files,
    resolve: (relative) => files.resolve(relative),
    exists: (relative) => files.resolve(relative) !== null,
    notes,
    urlChecks: new Map(),
  };
}

/** @param {Record<string, any> | null} packageJson */
function collectDependencies(packageJson) {
  /** @type {Map<string, string>} */
  const dependencies = new Map();
  for (const field of ['devDependencies', 'dependencies']) {
    const group = packageJson?.[field];
    if (!isObject(group)) continue;
    for (const [name, version] of Object.entries(group)) dependencies.set(name, String(version));
  }
  return dependencies;
}

/**
 * @param {{ isExpo: boolean, dependencies: Map<string, string>, ios: { present: boolean }, android: { present: boolean } }} input
 * @returns {ProjectType | null}
 */
function detectType({ isExpo, dependencies, ios, android }) {
  if (isExpo) return 'expo';
  if (dependencies.has('react-native')) return 'react-native';
  if (ios.present && android.present) return 'native';
  if (ios.present) return 'ios';
  if (android.present) return 'android';
  return null;
}

/**
 * @param {ProjectType} type
 * @param {Record<string, any>} config
 * @param {boolean} hasIos
 * @param {boolean} hasAndroid
 * @returns {Set<'ios' | 'android'>}
 */
function detectPlatforms(type, config, hasIos, hasAndroid) {
  /** @type {Set<'ios' | 'android'>} */
  const platforms = new Set();
  if (type === 'expo') {
    const listed = Array.isArray(config.platforms) ? config.platforms : ['ios', 'android'];
    if (listed.includes('ios')) platforms.add('ios');
    if (listed.includes('android')) platforms.add('android');
    return platforms;
  }
  if (hasIos) platforms.add('ios');
  if (hasAndroid) platforms.add('android');
  if (type === 'react-native' && platforms.size === 0) {
    platforms.add('ios');
    platforms.add('android');
  }
  return platforms;
}

export { UsageError };
