import fs from 'node:fs';
import path from 'node:path';

/** @param {string} file */
export function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  } catch {
    return null;
  }
}

/**
 * @param {string} file
 * @returns {{ exists: false } | { exists: true, value: unknown } | { exists: true, error: string }}
 */
export function readJsonFile(file) {
  const text = readText(file);
  if (text === null) return { exists: false };
  try {
    return { exists: true, value: JSON.parse(text) };
  } catch (error) {
    return { exists: true, error: error instanceof Error ? error.message : String(error) };
  }
}

/** @param {string} p */
export function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

/** @param {string} p */
export function isDirectory(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/**
 * @param {string} dir
 * @param {{ maxDepth?: number, skipDir?: (name: string) => boolean }} [options]
 * @returns {string[]}
 */
export function walk(dir, { maxDepth = Infinity, skipDir = () => false } = {}) {
  /** @type {string[]} */
  const files = [];
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
      }
    }
  };
  visit(dir, 0);
  return files;
}

/** @param {string} root @param {string} file */
export function relativePath(root, file) {
  return path.relative(root, file).split(path.sep).join('/');
}

/** @param {unknown} value @returns {value is Record<string, any>} */
export function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
