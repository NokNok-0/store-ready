import fs from 'node:fs';
import path from 'node:path';
import { isObject } from '../fs-utils.js';
import { parsePlist } from '../parsers/plist.js';

/**
 * Reads the PrivacyInfo.xcprivacy files that installed packages ship in node_modules.
 * Guarded like every other read: symlinks are followed only when they stay inside the project,
 * the walk has depth and size caps, and npm, Yarn and pnpm (node_modules/.pnpm) layouts are handled.
 *
 * @typedef {{ pkg: string, file: string, categories: Map<string, string[]> }} PackageManifest
 * @typedef {{
 *   installed: boolean,
 *   manifests: PackageManifest[],
 *   unreadable: string[],
 *   skippedLinks: number,
 *   truncated: boolean,
 * }} DependencyPrivacy
 */

export const MANIFEST_NAME = 'PrivacyInfo.xcprivacy';
/** Directory levels searched inside one package (react-native keeps one at ReactCommon/react/timing/). */
export const MAX_PACKAGE_DEPTH = 6;
/** Nested node_modules levels followed (npm nests conflicting versions). */
export const MAX_NESTING = 4;
export const MAX_DIRECTORIES = 60_000;
export const MAX_MANIFEST_BYTES = 256 * 1024;
const SKIP_IN_PACKAGE = new Set(['android', 'example', 'examples', 'Example', '__tests__', '__mocks__', 'test', 'tests', 'docs', '.git', '.github', 'Pods', 'build']);

/** @type {WeakMap<object, DependencyPrivacy>} */
const cache = new WeakMap();

/** @param {import('./load-project.js').Project} project @returns {DependencyPrivacy} */
export function dependencyPrivacy(project) {
  const cached = cache.get(project);
  if (cached) return cached;
  const result = scan(project.files);
  cache.set(project, result);
  return result;
}

/** @param {import('./project-files.js').ProjectFiles} files @returns {DependencyPrivacy} */
export function scan(files) {
  /** @type {DependencyPrivacy} */
  const result = { installed: false, manifests: [], unreadable: [], skippedLinks: 0, truncated: false };
  const root = files.root;
  const top = path.join(root, 'node_modules');
  const topReal = realInside(top);
  if (!topReal || !isDir(topReal)) {
    if (isSymlink(top)) result.skippedLinks += 1;
    return result;
  }
  result.installed = true;
  /** @type {Set<string>} */
  const visited = new Set();
  /** @type {Set<string>} */
  const seenManifests = new Set();
  let directories = 0;

  /** @param {string} dir @returns {fs.Dirent[]} */
  const list = (dir) => {
    directories += 1;
    if (directories > MAX_DIRECTORIES) {
      result.truncated = true;
      return [];
    }
    try {
      return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    } catch {
      return [];
    }
  };

  /**
   * Resolves an entry to a real directory inside the project, or null.
   * @param {string} dir @param {fs.Dirent} entry
   */
  const directory = (dir, entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return full;
    if (!entry.isSymbolicLink()) return null;
    const real = realInside(full);
    if (!real) {
      result.skippedLinks += 1;
      return null;
    }
    return isDir(real) ? real : null;
  };

  /** @param {string} dir @param {number} nesting */
  const walkModules = (dir, nesting) => {
    if (nesting > MAX_NESTING) return;
    for (const entry of list(dir)) {
      if (entry.name === '.bin' || entry.name === '.cache') continue;
      const full = directory(dir, entry);
      if (!full) continue;
      if (entry.name === '.pnpm') {
        for (const store of list(full)) {
          const storeDir = directory(full, store);
          if (storeDir) walkModules(path.join(storeDir, 'node_modules'), nesting + 1);
        }
      } else if (entry.name.startsWith('@')) {
        for (const scoped of list(full)) {
          const pkgDir = directory(full, scoped);
          if (pkgDir) visitPackage(pkgDir, `${entry.name}/${scoped.name}`, nesting);
        }
      } else if (!entry.name.startsWith('.')) {
        visitPackage(full, entry.name, nesting);
      }
    }
  };

  /** @param {string} pkgDir @param {string} name @param {number} nesting */
  const visitPackage = (pkgDir, name, nesting) => {
    let real;
    try {
      real = fs.realpathSync(pkgDir);
    } catch {
      return;
    }
    if (visited.has(real)) return;
    visited.add(real);
    /** @param {string} dir @param {number} depth */
    const visit = (dir, depth) => {
      for (const entry of list(dir)) {
        if (entry.isFile() && entry.name === MANIFEST_NAME) {
          readManifest(path.join(dir, entry.name), name);
          continue;
        }
        if (entry.name === 'node_modules') {
          const nested = directory(dir, entry);
          if (nested) walkModules(nested, nesting + 1);
          continue;
        }
        if (depth >= MAX_PACKAGE_DEPTH || SKIP_IN_PACKAGE.has(entry.name)) continue;
        if (entry.isDirectory()) visit(path.join(dir, entry.name), depth + 1);
      }
    };
    visit(real, 0);
  };

  /** @param {string} file @param {string} pkg */
  const readManifest = (file, pkg) => {
    const real = realInside(file);
    if (!real || seenManifests.has(real)) return;
    seenManifests.add(real);
    const relative = files.relative(real);
    let text;
    try {
      if (fs.statSync(real).size > MAX_MANIFEST_BYTES) {
        result.unreadable.push(relative);
        return;
      }
      text = fs.readFileSync(real, 'utf8');
    } catch {
      result.unreadable.push(relative);
      return;
    }
    let data;
    try {
      data = parsePlist(text);
    } catch {
      result.unreadable.push(relative);
      return;
    }
    /** @type {Map<string, string[]>} */
    const categories = new Map();
    const entries = isObject(data) && Array.isArray(data.NSPrivacyAccessedAPITypes) ? data.NSPrivacyAccessedAPITypes : [];
    for (const entry of entries) {
      if (!isObject(entry) || typeof entry.NSPrivacyAccessedAPIType !== 'string') continue;
      const reasons = Array.isArray(entry.NSPrivacyAccessedAPITypeReasons) ? entry.NSPrivacyAccessedAPITypeReasons.filter((reason) => typeof reason === 'string') : [];
      const list = categories.get(entry.NSPrivacyAccessedAPIType) ?? [];
      for (const reason of reasons) if (!list.includes(reason)) list.push(reason);
      categories.set(entry.NSPrivacyAccessedAPIType, list);
    }
    result.manifests.push({ pkg, file: relative, categories });
  };

  /** @param {string} target */
  function realInside(target) {
    let real;
    try {
      real = fs.realpathSync(target);
    } catch {
      return null;
    }
    const relative = path.relative(root, real);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative)) ? real : null;
  }

  walkModules(topReal, 0);
  return result;
}

/** @param {string} target */
function isDir(target) {
  try {
    return fs.statSync(target).isDirectory();
  } catch {
    return false;
  }
}

/** @param {string} target */
function isSymlink(target) {
  try {
    return fs.lstatSync(target).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Category -> reason -> packages that declare it.
 * @param {PackageManifest[]} manifests
 * @returns {Map<string, { packages: Set<string>, reasons: Map<string, Set<string>> }>}
 */
export function unionCategories(manifests) {
  /** @type {Map<string, { packages: Set<string>, reasons: Map<string, Set<string>> }>} */
  const union = new Map();
  for (const manifest of manifests) {
    for (const [category, reasons] of manifest.categories) {
      const entry = union.get(category) ?? { packages: new Set(), reasons: new Map() };
      entry.packages.add(manifest.pkg);
      for (const reason of reasons) {
        const users = entry.reasons.get(reason) ?? new Set();
        users.add(manifest.pkg);
        entry.reasons.set(reason, users);
      }
      union.set(category, entry);
    }
  }
  return union;
}
