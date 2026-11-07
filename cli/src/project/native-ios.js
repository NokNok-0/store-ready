import path from 'node:path';
import { parsePlist, PlistError } from '../parsers/plist.js';

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

/** @param {import('./project-files.js').ProjectFiles} files @returns {IosProject} */
export function loadIos(files) {
  /** @type {IosProject} */
  const ios = { present: false, infoPlists: [], privacyInfos: [], projects: [], appIconSets: [] };
  if (!files.isDirectory('ios')) return ios;
  const paths = files.walk('ios', { maxDepth: 6, skipDir: (name) => SKIP_DIRS.has(name) || name.startsWith('.') });
  for (const file of paths) {
    const name = path.basename(file);
    const parent = path.basename(path.dirname(file));
    const relative = files.relative(file);
    if (name === 'Info.plist' && !isTestPath(relative)) ios.infoPlists.push(parsePlistFile(files, file, relative));
    else if (name === 'PrivacyInfo.xcprivacy') ios.privacyInfos.push(parsePlistFile(files, file, relative));
    else if (name === 'project.pbxproj' && parent.endsWith('.xcodeproj')) ios.projects.push({ file: relative, text: files.readText(file) ?? '' });
    else if (name === 'Contents.json' && /^AppIcon.*\.appiconset$/.test(parent)) {
      const read = files.readJson(file);
      ios.appIconSets.push({
        file: relative,
        dir: files.relative(path.dirname(file)),
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

/**
 * @param {import('./project-files.js').ProjectFiles} files
 * @param {string} file
 * @param {string} relative
 * @returns {ParsedFile}
 */
function parsePlistFile(files, file, relative) {
  const text = files.readText(file) ?? '';
  try {
    return { file: relative, data: parsePlist(text) };
  } catch (error) {
    const binary = error instanceof PlistError && text.startsWith('bplist');
    return { file: relative, data: null, error: binary ? 'a binary property list, which is not supported' : 'not a valid XML property list' };
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
