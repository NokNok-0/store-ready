import fs from 'node:fs';
import path from 'node:path';

export const SCAN_DIRS = ['src', 'app', 'components', 'screens', 'lib', 'features', 'hooks', 'services', 'context', 'contexts', 'navigation', 'utils'];
const SKIP_DIRS = new Set(['node_modules', 'ios', 'android', 'dist', 'build', 'web-build', 'coverage', '__tests__', '__mocks__']);
const CODE_FILE = /\.(?:js|jsx|ts|tsx|mjs|cjs)$/;
const TEST_FILE = /\.(?:test|spec)\.[cm]?[jt]sx?$/;
const ROOT_FILE = /^(?:App|app|index)\.(?:js|jsx|ts|tsx)$/;
const MAX_FILE_BYTES = 512 * 1024;

/**
 * @typedef {{ file: string, text: string }} CodeFile
 * @typedef {{ file: string, match: string, line: number }} CodeMatch
 * @typedef {{ files: () => CodeFile[], search: (pattern: RegExp) => CodeMatch | null, searchAll: (pattern: RegExp, limit?: number) => CodeMatch[] }} CodeIndex
 */

const NEWLINE = String.fromCharCode(10);

/** The 1-based line number of a character offset. @param {string} text @param {number} index */
export function lineAt(text, index) {
  return text.slice(0, index).split(NEWLINE).length;
}

/** @param {import('./project-files.js').ProjectFiles} files @returns {CodeIndex} */
export function createCodeIndex(files) {
  /** @type {CodeFile[] | null} */
  let cache = null;
  const list = () => {
    cache ??= collect(files);
    return cache;
  };
  return {
    files: list,
    search(pattern) {
      for (const { file, text } of list()) {
        pattern.lastIndex = 0;
        const match = pattern.exec(text);
        if (match) return { file, match: match[0], line: lineAt(text, match.index) };
      }
      return null;
    },
    searchAll(pattern, limit = 50) {
      /** @type {CodeMatch[]} */
      const found = [];
      const global = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
      for (const { file, text } of list()) {
        for (const match of text.matchAll(global)) {
          found.push({ file, match: match[0], line: lineAt(text, match.index ?? 0) });
          if (found.length >= limit) return found;
        }
      }
      return found;
    },
  };
}

/** @param {import('./project-files.js').ProjectFiles} files @returns {CodeFile[]} */
function collect(files) {
  /** @type {string[]} */
  const paths = [];
  for (const dir of SCAN_DIRS) {
    if (files.isDirectory(dir)) paths.push(...files.walk(dir, { maxDepth: 12, skipDir: (name) => SKIP_DIRS.has(name) || name.startsWith('.') }));
  }
  for (const entry of fs.readdirSync(files.root, { withFileTypes: true })) {
    if ((entry.isFile() || entry.isSymbolicLink()) && ROOT_FILE.test(entry.name) && files.isFile(entry.name)) paths.push(path.join(files.root, entry.name));
  }
  /** @type {CodeFile[]} */
  const code = [];
  for (const file of paths) {
    if (!CODE_FILE.test(file) || TEST_FILE.test(file)) continue;
    const real = files.resolve(file);
    try {
      if (!real || fs.statSync(real).size > MAX_FILE_BYTES) continue;
    } catch {
      continue;
    }
    const text = files.readText(file);
    if (text !== null) code.push({ file: files.relative(file), text });
  }
  return code;
}
