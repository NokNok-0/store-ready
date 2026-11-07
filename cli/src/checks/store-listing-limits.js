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

export const OPTIONAL_KEYS = ['privacyPolicyUrl'];
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
  const privacyUrl = listing.privacyPolicyUrl;
  if (privacyUrl !== undefined && (typeof privacyUrl !== 'string' || !/^https?:\/\/\S+$/.test(privacyUrl.trim()))) {
    add('warning', `privacyPolicyUrl in ${spec.file} is not an http(s) URL.`, 'Set it to the full URL of your published privacy policy, for example "https://example.com/privacy".');
  }
  for (const key of Object.keys(listing)) {
    if (key in spec.fields || OPTIONAL_KEYS.includes(key)) continue;
    add('warning', `${spec.file} has an unknown field "${key}", so it was not checked.`, `Use only: ${[...Object.keys(spec.fields), ...OPTIONAL_KEYS].join(', ')}.`);
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
