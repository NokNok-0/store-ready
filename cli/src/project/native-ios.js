import path from 'node:path';
import { isDirectory, readJsonFile, readText, relativePath, walk } from '../fs-utils.js';
import { parsePlist } from '../parsers/plist.js';

const SKIP_DIRS = new Set(['Pods', 'build', 'DerivedData', 'node_modules', 'vendor']);

/**
 * @typedef {{ file: string, data: any, error?: string }} ParsedFile
 * @typedef {{
 *   present: boolean,
 *   infoPlists: ParsedFile[],
 *   privacyInfos: ParsedFile[],
 *   projects: { file: string, text: string }[],
 *   appIconSets: (ParsedFile & { dir: string })[],
 * }} IosProject
 */

/** @param {string} root @returns {IosProject} */
export function loadIos(root) {
  /** @type {IosProject} */
  const ios = { present: false, infoPlists: [], privacyInfos: [], projects: [], appIconSets: [] };
  const dir = path.join(root, 'ios');
  if (!isDirectory(dir)) return ios;
  const files = walk(dir, { maxDepth: 6, skipDir: (name) => SKIP_DIRS.has(name) || name.startsWith('.') });
  for (const file of files) {
    const name = path.basename(file);
    const parent = path.basename(path.dirname(file));
    const relative = relativePath(root, file);
    if (name === 'Info.plist' && !isTestPath(relative)) ios.infoPlists.push(parsePlistFile(file, relative));
    else if (name === 'PrivacyInfo.xcprivacy') ios.privacyInfos.push(parsePlistFile(file, relative));
    else if (name === 'project.pbxproj' && parent.endsWith('.xcodeproj')) ios.projects.push({ file: relative, text: readText(file) ?? '' });
    else if (name === 'Contents.json' && /^AppIcon.*\.appiconset$/.test(parent)) {
      const read = readJsonFile(file);
      ios.appIconSets.push({
        file: relative,
        dir: relativePath(root, path.dirname(file)),
        data: 'value' in read ? read.value : null,
        ...('error' in read ? { error: read.error } : {}),
      });
    }
  }
  ios.present = ios.infoPlists.length > 0 || ios.projects.length > 0;
  return ios;
}

/** @param {string} relative */
function isTestPath(relative) {
  return relative.split('/').some((segment) => /Tests$/.test(segment));
}

/** @param {string} file @param {string} relative @returns {ParsedFile} */
function parsePlistFile(file, relative) {
  try {
    return { file: relative, data: parsePlist(readText(file) ?? '') };
  } catch (error) {
    return { file: relative, data: null, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * @param {IosProject} ios
 * @param {string} setting
 * @returns {string[]}
 */
export function buildSettingValues(ios, setting) {
  const values = [];
  const pattern = new RegExp(`\\b${setting}\\s*=\\s*(?:"([^"]*)"|([^;\\s]+))\\s*;`, 'g');
  for (const project of ios.projects) {
    for (const match of project.text.matchAll(pattern)) values.push(match[1] ?? match[2]);
  }
  return values;
}

/**
 * Resolves `$(VAR)` references in Info.plist values against build settings in project.pbxproj.
 * @param {IosProject} ios
 * @param {unknown} value
 */
export function resolveBuildVariable(ios, value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const variable = /^\$[({]([A-Z_]+)(?::[^)}]*)?[)}]$/.exec(value.trim());
  if (!variable) return value.trim();
  const candidates = buildSettingValues(ios, variable[1]).filter((v) => !v.includes('$(') && !/Tests?$/.test(v));
  return candidates[0] ?? null;
}

/** @param {IosProject} ios @param {string} key */
export function firstInfoPlistValue(ios, key) {
  for (const plist of ios.infoPlists) {
    const value = plist.data?.[key];
    if (value !== undefined) return resolveBuildVariable(ios, value);
  }
  return null;
}
