import { isObject } from '../fs-utils.js';

/**
 * Finds the URLs the checker reports as present. Finding a URL never means it works: checks report
 * every URL as "found, not verified" unless --verify-urls fetched it.
 *
 * @typedef {'privacy' | 'support' | 'deletion'} LinkKind
 * @typedef {{ kind: LinkKind, url: string, places: string[] }} FoundLink
 * @typedef {{ ok: true, status: number } | { ok: false, status?: number, error?: string }} UrlCheck
 */

export const PRIVACY_URL = /https?:\/\/[^\s'"`<>)\]]*privacy[^\s'"`<>)\]]*/i;
export const HTTP_URL = /^https?:\/\/\S+$/;
export const LISTING_FILES = ['store/listing.ios.json', 'store/listing.android.json'];

/**
 * App config `extra` keys read for each kind of link. Keys are compared case-insensitively,
 * ignoring "_" and "-", at any depth up to 3 inside `extra`.
 */
export const EXTRA_URL_KEYS = Object.freeze({
  privacy: ['privacyPolicyUrl', 'privacyPolicy', 'privacyUrl', 'privacyPolicyLink', 'privacyLink'],
  support: ['supportUrl', 'support', 'supportLink', 'helpUrl', 'supportPage'],
  deletion: ['accountDeletionUrl', 'deleteAccountUrl', 'deletionUrl', 'accountDeletion', 'deleteAccount', 'accountDeletionLink', 'deleteAccountLink', 'deleteAccountPage'],
});

/** @param {string} key */
const normalizeKey = (key) => key.toLowerCase().replace(/[_-]/g, '');

/** @param {unknown} value */
function asHttpUrl(value) {
  return typeof value === 'string' && HTTP_URL.test(value.trim()) ? value.trim() : null;
}

/**
 * @param {unknown} value
 * @param {(key: string, value: unknown, path: string) => void} visit
 * @param {string} [prefix]
 * @param {number} [depth]
 */
function walkObject(value, visit, prefix = 'extra', depth = 0) {
  if (depth > 3) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkObject(item, visit, `${prefix}[${index}]`, depth + 1));
    return;
  }
  if (!isObject(value)) return;
  for (const [key, item] of Object.entries(value)) {
    const path = `${prefix}.${key}`;
    visit(key, item, path);
    walkObject(item, visit, path, depth + 1);
  }
}

/** @param {unknown} value @returns {string[]} every privacy URL inside a JSON value */
function privacyUrlsIn(value) {
  /** @type {string[]} */
  const urls = [];
  const visit = (/** @type {unknown} */ item) => {
    if (typeof item === 'string') {
      const match = PRIVACY_URL.exec(item);
      if (match) urls.push(match[0]);
    } else if (Array.isArray(item)) item.forEach(visit);
    else if (isObject(item)) Object.values(item).forEach(visit);
  };
  visit(value);
  return urls;
}

/** @type {WeakMap<object, FoundLink[]>} */
const cache = new WeakMap();

/**
 * @param {import('./load-project.js').Project} project
 * @returns {FoundLink[]}
 */
export function findLinks(project) {
  const cached = cache.get(project);
  if (cached) return cached;
  const found = collectLinks(project);
  cache.set(project, found);
  return found;
}

/** @param {import('./load-project.js').Project} project @returns {FoundLink[]} */
function collectLinks(project) {
  /** @type {Map<string, FoundLink>} */
  const links = new Map();
  /** @param {LinkKind} kind @param {string} url @param {string} place */
  const add = (kind, url, place) => {
    const key = `${kind}\u0000${url}`;
    const link = links.get(key) ?? { kind, url, places: [] };
    if (!link.places.includes(place)) link.places.push(place);
    links.set(key, link);
  };

  for (const file of LISTING_FILES) {
    const read = project.files.readJson(file);
    if (!('value' in read) || !isObject(read.value)) continue;
    const declared = asHttpUrl(read.value.privacyPolicyUrl);
    if (declared) add('privacy', declared, file);
    for (const url of privacyUrlsIn(read.value)) add('privacy', url, file);
    const support = asHttpUrl(read.value.supportUrl);
    if (support) add('support', support, file);
  }

  if (project.expo.isExpo && isObject(project.expo.config.extra)) {
    const configFile = project.expo.file ?? 'app.json';
    const keyed = new Set();
    walkObject(project.expo.config.extra, (key, value, path) => {
      const url = asHttpUrl(value);
      if (!url) return;
      for (const [kind, names] of /** @type {[LinkKind, string[]][]} */ (Object.entries(EXTRA_URL_KEYS))) {
        if (names.some((name) => normalizeKey(name) === normalizeKey(key))) {
          add(kind, url, `${configFile} (${path})`);
          keyed.add(url);
        }
      }
    });
    walkObject(project.expo.config.extra, (key, value, path) => {
      if (typeof value !== 'string') return;
      const match = PRIVACY_URL.exec(value);
      if (match && !keyed.has(match[0])) add('privacy', match[0], `${configFile} (${path})`);
    });
  }

  for (const match of project.code.searchAll(PRIVACY_URL, 10)) add('privacy', match.match, match.file);
  return [...links.values()];
}

/** @param {FoundLink['places']} places */
export function formatPlaces(places) {
  const shown = places.slice(0, 4).join(', ');
  return places.length > 4 ? `${shown} and ${places.length - 4} more` : shown;
}

/**
 * The --verify-urls result for a URL, or undefined when it was not fetched (the default).
 * @param {import('./load-project.js').Project} project
 * @param {string} url
 * @returns {UrlCheck | undefined}
 */
export function urlCheck(project, url) {
  return project.urlChecks?.get(url);
}
