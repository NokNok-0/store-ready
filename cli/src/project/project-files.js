import fs from 'node:fs';
import path from 'node:path';
import { parseJsonText, relativePath } from '../fs-utils.js';

/**
 * @typedef {{ status: 'inside', path: string } | { status: 'missing', path: string } | { status: 'outside' }} Location
 * @typedef {ReturnType<typeof createProjectFiles>} ProjectFiles
 */

/**
 * All reads of project files go through here, so that absolute paths, `..` and symlinks
 * cannot make the checker read anything outside the project root.
 * @param {string} root an existing directory
 */
export function createProjectFiles(root) {
  const realRoot = fs.realpathSync(root);
  /** @type {Set<string>} */
  const outside = new Set();

  /** @param {string} absolute */
  const isInside = (absolute) => {
    const relative = path.relative(realRoot, absolute);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  };

  /** @param {string} target */
  const display = (target) => (path.isAbsolute(target) && isInside(target) ? relativePath(realRoot, target) : target.split(path.sep).join('/'));

  /** @param {string} target relative to the project root, or absolute @returns {Location} */
  const locate = (target) => {
    const candidate = path.resolve(realRoot, target);
    let real;
    try {
      real = fs.realpathSync(candidate);
    } catch {
      if (isInside(candidate)) return { status: 'missing', path: candidate };
      outside.add(display(target));
      return { status: 'outside' };
    }
    if (!isInside(real)) {
      outside.add(display(target));
      return { status: 'outside' };
    }
    return { status: 'inside', path: real };
  };

  /** @param {string} target */
  const resolve = (target) => {
    const location = locate(target);
    return location.status === 'inside' ? location.path : null;
  };

  /** @param {string} target @param {'file' | 'directory'} kind */
  const isKind = (target, kind) => {
    const real = resolve(target);
    if (!real) return false;
    try {
      const stat = fs.statSync(real);
      return kind === 'file' ? stat.isFile() : stat.isDirectory();
    } catch {
      return false;
    }
  };

  /** @param {string} target */
  const readText = (target) => {
    if (!isKind(target, 'file')) return null;
    try {
      return fs.readFileSync(/** @type {string} */ (resolve(target)), 'utf8').replace(/^﻿/, '');
    } catch {
      return null;
    }
  };

  /**
   * Lists files under a directory. Symlinked directories are not followed; symlinked files are
   * kept only when they point inside the project.
   * @param {string} target
   * @param {{ maxDepth?: number, skipDir?: (name: string) => boolean }} [options]
   */
  const walk = (target, { maxDepth = Infinity, skipDir = () => false } = {}) => {
    /** @type {string[]} */
    const files = [];
    const start = resolve(target);
    if (!start) return files;
    /** @param {string} current @param {number} depth */
    const visit = (current, depth) => {
      let entries;
      try {
        entries = fs.readdirSync(current, { withFileTypes: true });
      } catch {
        return;
      }
      entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
      for (const entry of entries) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          if (depth < maxDepth && !skipDir(entry.name)) visit(full, depth + 1);
        } else if (entry.isFile()) {
          files.push(full);
        } else if (entry.isSymbolicLink()) {
          const real = resolve(full);
          if (real && isKind(real, 'file')) files.push(full);
        }
      }
    };
    visit(start, 0);
    return files;
  };

  return {
    root: realRoot,
    outside,
    locate,
    resolve,
    readText,
    /** @param {string} target @returns {import('../fs-utils.js').JsonRead} */
    readJson: (target) => {
      const text = readText(target);
      return text === null ? { exists: false } : parseJsonText(text);
    },
    /** @param {string} target */
    isFile: (target) => isKind(target, 'file'),
    /** @param {string} target */
    isDirectory: (target) => isKind(target, 'directory'),
    walk,
    /** @param {string} absolute */
    relative: (absolute) => relativePath(realRoot, absolute),
  };
}
