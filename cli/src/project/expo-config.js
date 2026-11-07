import path from 'node:path';
import { isFile, isObject, readJsonFile, relativePath } from '../fs-utils.js';
import { readStaticConfig } from '../parsers/js-literal.js';
import { SOURCES } from '../sources.js';
import { UsageError } from './usage-error.js';

export const DYNAMIC_CONFIG_FILES = ['app.config.ts', 'app.config.js', 'app.config.mjs', 'app.config.cjs'];

/**
 * @typedef {{
 *   isExpo: boolean,
 *   config: Record<string, any>,
 *   complete: boolean,
 *   file: string | null,
 *   notes: import('../issue.js').Issue[],
 * }} ExpoConfigResult
 */

/**
 * @param {import('./project-files.js').ProjectFiles} files
 * @param {{ configFile?: string, cwd: string, hasExpoDependency: boolean }} options
 * @returns {ExpoConfigResult}
 */
export function loadExpoConfig(files, { configFile, cwd, hasExpoDependency }) {
  const root = files.root;
  /** @type {import('../issue.js').Issue[]} */
  const notes = [];
  if (configFile) {
    const resolved = [path.resolve(cwd, configFile), path.resolve(root, configFile)].find(isFile);
    if (!resolved) throw new UsageError(`Config file not found: ${configFile}`);
    const read = readJsonFile(resolved);
    if ('error' in read) throw new UsageError(`Config file ${configFile} is ${read.error}.`);
    if (!('value' in read) || !isObject(read.value)) throw new UsageError(`Config file must contain a JSON object: ${configFile}`);
    return { isExpo: true, config: unwrapExpoConfig(read.value), complete: true, file: displayPath(root, resolved), notes };
  }

  const appJson = files.readJson('app.json');
  const appJsonValue = 'value' in appJson && isObject(appJson.value) ? appJson.value : null;
  const dynamicFile = DYNAMIC_CONFIG_FILES.find((name) => files.isFile(name)) ?? null;
  const isExpo = hasExpoDependency || Boolean(dynamicFile) || isObject(appJsonValue?.expo);
  if (!isExpo) return { isExpo: false, config: {}, complete: true, file: null, notes };
  if ('error' in appJson) {
    notes.push({
      id: 'project.config',
      severity: 'error',
      platform: 'both',
      message: `app.json is ${appJson.error}.`,
      fix: 'Fix the JSON syntax in app.json.',
      source: SOURCES.expoVersions,
      file: 'app.json',
    });
  }

  const fromJson = appJsonValue ? unwrapExpoConfig(appJsonValue) : null;
  if (dynamicFile) {
    const result = readStaticConfig(files.readText(dynamicFile) ?? '');
    if (result.ok && isObject(result.value)) {
      return { isExpo, config: unwrapExpoConfig(result.value), complete: true, file: dynamicFile, notes };
    }
    const reason = result.ok ? 'it does not export an object' : result.reason;
    notes.push({
      id: 'project.config',
      severity: 'info',
      platform: 'both',
      message: `${dynamicFile} was not run (${reason}), so values it computes are unknown. ${fromJson ? 'Checks used app.json only' : 'Checks that need app config values were skipped'}.`,
      fix: 'Run "npx expo config --json > store/expo-config.json", then check again with "--config store/expo-config.json".',
      source: SOURCES.expoVersions,
      file: dynamicFile,
    });
    return { isExpo, config: fromJson ?? {}, complete: false, file: fromJson ? 'app.json' : dynamicFile, notes };
  }
  return {
    isExpo,
    config: fromJson ?? {},
    complete: !('error' in appJson),
    file: appJson.exists ? 'app.json' : null,
    notes,
  };
}

/**
 * Accepts app.json ({ expo: {...} }), a bare ExpoConfig, or `npx expo config --json --full` output ({ exp: {...} }).
 * @param {Record<string, any>} value
 */
export function unwrapExpoConfig(value) {
  if (isObject(value.expo)) return value.expo;
  if (isObject(value.exp)) return value.exp;
  return value;
}

/** @param {string} root @param {string} file */
function displayPath(root, file) {
  const relative = relativePath(root, file);
  return relative.startsWith('..') ? file : relative;
}
