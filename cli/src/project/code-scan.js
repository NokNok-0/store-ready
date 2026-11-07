import fs from 'node:fs';
import path from 'node:path';
import { isDirectory, readText, relativePath, walk } from '../fs-utils.js';

export const SCAN_DIRS = ['src', 'app', 'components', 'screens', 'lib', 'features', 'hooks', 'services', 'context', 'contexts', 'navigation', 'utils'];
const SKIP_DIRS = new Set(['node_modules', 'ios', 'android', 'dist', 'build', 'web-build', 'coverage', '__tests__', '__mocks__']);
const CODE_FILE = /\.(?:js|jsx|ts|tsx|mjs|cjs)$/;
const TEST_FILE = /\.(?:test|spec)\.[cm]?[jt]sx?$/;
const ROOT_FILE = /^(?:App|app|index)\.(?:js|jsx|ts|tsx)$/;
const MAX_FILE_BYTES = 512 * 1024;

/**
 * @typedef {{ file: string, text: string }} CodeFile
 * @typedef {{ file: string, match: string }} CodeMatch
 * @typedef {{ files: () => CodeFile[], search: (pattern: RegExp) => CodeMatch | null }} CodeIndex
 */

/** @param {string} root @returns {CodeIndex} */
export function createCodeIndex(root) {
  /** @type {CodeFile[] | null} */
  let cache = null;
  const files = () => {
    cache ??= collect(root);
    return cache;
  };
  return {
    files,
    search(pattern) {
      for (const { file, text } of files()) {
        pattern.lastIndex = 0;
        const match = pattern.exec(text);
        if (match) return { file, match: match[0] };
      }
      return null;
    },
  };
}

/** @param {string} root @returns {CodeFile[]} */
function collect(root) {
  /** @type {string[]} */
  const paths = [];
  for (const dir of SCAN_DIRS) {
    const full = path.join(root, dir);
    if (isDirectory(full)) paths.push(...walk(full, { maxDepth: 12, skipDir: (name) => SKIP_DIRS.has(name) || name.startsWith('.') }));
  }
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isFile() && ROOT_FILE.test(entry.name)) paths.push(path.join(root, entry.name));
  }
  /** @type {CodeFile[]} */
  const files = [];
  for (const file of paths) {
    if (!CODE_FILE.test(file) || TEST_FILE.test(file)) continue;
    try {
      if (fs.statSync(file).size > MAX_FILE_BYTES) continue;
    } catch {
      continue;
    }
    const text = readText(file);
    if (text !== null) files.push({ file: relativePath(root, file), text });
  }
  return files;
}
