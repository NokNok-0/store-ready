import path from 'node:path';
import { isDirectory, readText } from '../fs-utils.js';
import { decodeEntities } from '../parsers/plist.js';

export const MANIFEST_PATH = 'android/app/src/main/AndroidManifest.xml';
const GRADLE_FILES = ['android/app/build.gradle', 'android/app/build.gradle.kts', 'android/build.gradle', 'android/build.gradle.kts'];

/**
 * @typedef {{ name: string, removed: boolean }} ManifestPermission
 * @typedef {{ file: string, permissions: ManifestPermission[], packageName: string | null }} Manifest
 * @typedef {{
 *   present: boolean,
 *   manifest: Manifest | null,
 *   gradle: { file: string, text: string }[],
 *   gradleProperties: { file: string, text: string } | null,
 * }} AndroidProject
 */

/** @param {string} root @returns {AndroidProject} */
export function loadAndroid(root) {
  /** @type {AndroidProject} */
  const android = { present: false, manifest: null, gradle: [], gradleProperties: null };
  if (!isDirectory(path.join(root, 'android'))) return android;
  const manifestText = readText(path.join(root, MANIFEST_PATH));
  if (manifestText !== null) android.manifest = { file: MANIFEST_PATH, ...parseManifest(manifestText) };
  for (const file of GRADLE_FILES) {
    const text = readText(path.join(root, file));
    if (text !== null) android.gradle.push({ file, text });
  }
  const properties = readText(path.join(root, 'android/gradle.properties'));
  if (properties !== null) android.gradleProperties = { file: 'android/gradle.properties', text: properties };
  android.present = android.manifest !== null || android.gradle.length > 0;
  return android;
}

/** @param {string} xml */
export function parseManifest(xml) {
  const clean = xml.replace(/<!--[\s\S]*?-->/g, '');
  /** @type {ManifestPermission[]} */
  const permissions = [];
  for (const match of clean.matchAll(/<uses-permission(?:-sdk-23)?\b([^>]*?)\/?>/g)) {
    const attributes = parseAttributes(match[1]);
    const name = attributes['android:name'];
    if (name) permissions.push({ name, removed: attributes['tools:node'] === 'remove' });
  }
  const manifestTag = /<manifest\b([^>]*)>/.exec(clean);
  const packageName = manifestTag ? parseAttributes(manifestTag[1]).package ?? null : null;
  return { permissions, packageName };
}

/** @param {string} text */
function parseAttributes(text) {
  /** @type {Record<string, string>} */
  const attributes = {};
  for (const match of text.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    attributes[match[1]] = decodeEntities(match[2] ?? match[3]);
  }
  return attributes;
}

/**
 * @param {AndroidProject} android
 * @param {RegExp} pattern a global regex whose first group is the value
 * @param {string[]} [onlyFiles]
 */
export function gradleMatches(android, pattern, onlyFiles) {
  const matches = [];
  for (const { file, text } of android.gradle) {
    if (onlyFiles && !onlyFiles.includes(file)) continue;
    for (const match of stripGradleComments(text).matchAll(pattern)) matches.push({ file, value: match[1] });
  }
  return matches;
}

/** @param {string} text */
function stripGradleComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'])\/\/.*$/gm, '$1');
}
