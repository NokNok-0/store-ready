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
 * @typedef {{ exists: false } | { exists: true, value: unknown } | { exists: true, error: string }} JsonRead
 */

/** @param {string} file @returns {JsonRead} */
export function readJsonFile(file) {
  const text = readText(file);
  if (text === null) return { exists: false };
  return parseJsonText(text);
}

/** @param {string} text @returns {JsonRead} */
export function parseJsonText(text) {
  try {
    return { exists: true, value: JSON.parse(text) };
  } catch (error) {
    const location = jsonErrorLocation(text, error instanceof Error ? error.message : '');
    return { exists: true, error: location ? `not valid JSON (${location})` : 'not valid JSON' };
  }
}

/**
 * Turns a JSON.parse message into "line L, column C" without repeating any of the file's text.
 * @param {string} text
 * @param {string} message
 */
export function jsonErrorLocation(text, message) {
  const lineColumn = /line (\d+) column (\d+)/.exec(message);
  if (lineColumn) return `line ${lineColumn[1]}, column ${lineColumn[2]}`;
  const position = /position (\d+)/.exec(message);
  const offset = position ? Number(position[1]) : /end of (?:JSON|data)/i.test(message) ? text.length : null;
  if (offset === null) return null;
  const before = text.slice(0, offset).split('\n');
  return `line ${before.length}, column ${before[before.length - 1].length + 1}`;
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

/** @param {string} root @param {string} file */
export function relativePath(root, file) {
  return path.relative(root, file).split(path.sep).join('/');
}

/** @param {unknown} value @returns {value is Record<string, any>} */
export function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
