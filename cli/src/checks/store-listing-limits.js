import { isObject } from '../fs-utils.js';
import { SOURCES } from '../sources.js';

export const id = 'store.listing-limits';
export const title = 'Store listing text limits';
export const source = SOURCES.appleAppInformation;

/**
 * @typedef {{ max: number, min?: number, unit: 'characters' | 'bytes', required?: boolean }} FieldLimit
 * @typedef {{ file: string, platform: 'ios' | 'android', store: string, source: string, fields: Record<string, FieldLimit> }} ListingSpec
 */

/** @type {ListingSpec[]} */
export const LISTINGS = [
  {
    file: 'store/listing.ios.json',
    platform: 'ios',
    store: 'App Store',
    source: SOURCES.appleAppInformation,
    fields: {
      name: { min: 2, max: 30, unit: 'characters', required: true },
      subtitle: { max: 30, unit: 'characters' },
      keywords: { max: 100, unit: 'bytes' },
      promotionalText: { max: 170, unit: 'characters' },
      description: { max: 4000, unit: 'characters', required: true },
      whatsNew: { max: 4000, unit: 'characters' },
    },
  },
  {
    file: 'store/listing.android.json',
    platform: 'android',
    store: 'Google Play',
    source: SOURCES.playListingText,
    fields: {
      title: { max: 30, unit: 'characters', required: true },
      shortDescription: { max: 80, unit: 'characters', required: true },
      fullDescription: { max: 4000, unit: 'characters', required: true },
    },
  },
];

/** Console fields that are not limited text: URLs and categories. */
export const OPTIONAL_KEYS = Object.freeze({
  ios: ['privacyPolicyUrl', 'supportUrl', 'marketingUrl', 'primaryCategory', 'secondaryCategory'],
  android: ['privacyPolicyUrl', 'category', 'tags'],
});
const URL_KEYS = ['privacyPolicyUrl', 'supportUrl', 'marketingUrl'];
export const MAX_PLAY_TAGS = 5;

/** Fields where price and ranking words are flagged. Descriptions are not checked. */
export const CLAIM_FIELDS = Object.freeze({ ios: ['name', 'subtitle'], android: ['title'] });

/** Price words and superlative or ranking claims, matched as whole words. */
export const CLAIM_WORDS = [
  { label: 'free', kind: 'price', pattern: /\bfree\b/i },
  { label: 'sale', kind: 'price', pattern: /\bsales?\b/i },
  { label: '% off', kind: 'price', pattern: /%\s*off\b/i },
  { label: '$', kind: 'price', pattern: /\$/ },
  { label: '€', kind: 'price', pattern: /€/ },
  { label: 'best', kind: 'ranking', pattern: /\bbest\b/i },
  { label: 'top', kind: 'ranking', pattern: /\btop\b/i },
  { label: 'ultimate', kind: 'ranking', pattern: /\bultimate\b/i },
  { label: '#1', kind: 'ranking', pattern: /(?<![\w#])#\s?1(?!\d)/ },
  { label: 'number one', kind: 'ranking', pattern: /\bnumber\s+one\b/i },
  { label: 'No. 1', kind: 'ranking', pattern: /\bno\.\s?1(?!\d)/i },
];

/** @param {string} text @returns {string[]} labels of the claim words in the text */
export function claimWords(text) {
  return CLAIM_WORDS.filter((word) => word.pattern.test(text)).map((word) => word.label);
}
export const REVIEW_NOTES_FILE = 'store/review-notes.txt';
export const REVIEW_NOTES_MAX_BYTES = 4000;

/** @param {string} text @param {'characters' | 'bytes'} unit */
export function measure(text, unit) {
  return unit === 'bytes' ? Buffer.byteLength(text, 'utf8') : [...text].length;
}

/** @param {ListingSpec} spec @param {Record<string, unknown>} listing */
function checkListing(spec, listing) {
  /** @type {Omit<import('../issue.js').Issue, 'id'>[]} */
  const issues = [];
  /** @param {'error' | 'warning'} severity @param {string} message @param {string} fix */
  const add = (severity, message, fix) => issues.push({ severity, platform: spec.platform, message, fix, source: spec.source, file: spec.file });

  for (const [field, limit] of Object.entries(spec.fields)) {
    const value = listing[field];
    if (value === undefined || value === null) {
      if (limit.required) add(limit.min ? 'error' : 'warning', `${spec.store} ${field} is missing.`, `Fill in "${field}" before submitting.`);
      continue;
    }
    if (typeof value !== 'string') {
      add('error', `${spec.store} ${field} must be a string.`, `Set "${field}" to plain text.`);
      continue;
    }
    const size = measure(value, limit.unit);
    if (limit.min !== undefined && size < limit.min) {
      add('error', `${spec.store} ${field} is ${size} ${limit.unit}; it must be ${limit.min}-${limit.max}.`, `Write a ${field} of at least ${limit.min} ${limit.unit}.`);
    } else if (size > limit.max) {
      add('error', `${spec.store} ${field} is ${size} ${limit.unit}; the limit is ${limit.max}.`, `Shorten "${field}" by ${size - limit.max} ${limit.unit}.${limit.unit === 'bytes' ? ' Non-ASCII letters take more than one byte.' : ''}`);
    } else if (size === 0 && limit.required) {
      add('warning', `${spec.store} ${field} is empty.`, `Fill in "${field}" before submitting.`);
    }
  }
  for (const field of CLAIM_FIELDS[spec.platform]) {
    const value = listing[field];
    if (typeof value !== 'string') continue;
    const words = claimWords(value);
    if (words.length === 0) continue;
    const ios = spec.platform === 'ios';
    issues.push({
      severity: 'warning',
      platform: spec.platform,
      message: `${spec.store} ${field} "${value}" contains price or ranking words: ${words.map((word) => `"${word}"`).join(', ')}.${ios ? ' Guideline 2.3.7 keeps prices and claims out of the name and subtitle.' : ' Play does not allow prices, promotions or ranking claims in the app title.'}`,
      fix: `Remove ${words.map((word) => `"${word}"`).join(', ')} from "${field}" and say what the app does instead. Descriptions are not checked for these words.`,
      source: ios ? SOURCES.appleGuidelines : SOURCES.playListingText,
      file: spec.file,
    });
  }
  const optional = OPTIONAL_KEYS[spec.platform];
  for (const key of URL_KEYS) {
    const url = listing[key];
    if (!optional.includes(key) || url === undefined) continue;
    if (typeof url !== 'string' || !/^https?:\/\/\S+$/.test(url.trim())) {
      add('warning', `${key} in ${spec.file} is not an http(s) URL.`, 'Set it to the full URL of the published page, including https://.');
    }
  }
  const tags = listing.tags;
  if (spec.platform === 'android' && tags !== undefined) {
    if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string')) {
      add('warning', `tags in ${spec.file} must be a list of strings.`, 'Use the shape "tags": ["Tag one", "Tag two"].');
    } else if (tags.length > MAX_PLAY_TAGS) {
      add('warning', `${spec.file} has ${tags.length} tags; Google Play allows at most ${MAX_PLAY_TAGS}.`, `Keep the ${MAX_PLAY_TAGS} that describe the app best. Source: https://support.google.com/googleplay/android-developer/answer/9859673`);
    }
  }
  for (const key of Object.keys(listing)) {
    if (key in spec.fields || optional.includes(key)) continue;
    add('warning', `${spec.file} has an unknown field "${key}", so it was not checked.`, `Use only: ${[...Object.keys(spec.fields), ...optional].join(', ')}.`);
  }
  return issues;
}

/** @param {import('../project/load-project.js').Project} project */
export function run(project) {
  /** @type {Omit<import('../issue.js').Issue, 'id'>[]} */
  const issues = [];
  for (const spec of LISTINGS) {
    const read = project.files.readJson(spec.file);
    if (!read.exists) continue;
    if ('error' in read) {
      issues.push({ severity: 'error', platform: spec.platform, message: `${spec.file} is ${read.error}.`, fix: 'Fix the JSON syntax.', source: spec.source, file: spec.file });
    } else if ('value' in read && !isObject(read.value)) {
      issues.push({ severity: 'error', platform: spec.platform, message: `${spec.file} must contain a JSON object.`, fix: `Use the shape { ${Object.keys(spec.fields).map((f) => `"${f}": ""`).join(', ')} }.`, source: spec.source, file: spec.file });
    } else if ('value' in read && isObject(read.value)) {
      issues.push(...checkListing(spec, read.value));
    }
  }
  const notes = project.files.readText(REVIEW_NOTES_FILE);
  if (notes !== null) {
    const bytes = Buffer.byteLength(notes.trimEnd(), 'utf8');
    if (bytes > REVIEW_NOTES_MAX_BYTES) {
      issues.push({
        severity: 'error',
        platform: 'ios',
        message: `${REVIEW_NOTES_FILE} is ${bytes} bytes; App Store review notes are limited to ${REVIEW_NOTES_MAX_BYTES} bytes.`,
        fix: `Shorten the notes by ${bytes - REVIEW_NOTES_MAX_BYTES} bytes.`,
        source: SOURCES.appleAppInformation,
        file: REVIEW_NOTES_FILE,
      });
    }
  }
  return issues;
}
