import { isObject, readJsonFile } from '../fs-utils.js';
import { SOURCES } from '../sources.js';

export const id = 'privacy.policy-url';
export const title = 'Privacy policy URL';

export const PRIVACY_URL = /https?:\/\/[^\s'"`<>)\]]*privacy[^\s'"`<>)\]]*/i;
export const LISTING_FILES = ['store/listing.ios.json', 'store/listing.android.json'];

/** @param {unknown} value @returns {string | null} */
function findInValue(value) {
  if (typeof value === 'string') return PRIVACY_URL.exec(value)?.[0] ?? null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findInValue(item);
      if (found) return found;
    }
    return null;
  }
  if (isObject(value)) return findInValue(Object.values(value));
  return null;
}

/**
 * @param {import('../project/load-project.js').Project} project
 * @returns {{ url: string, file: string } | null}
 */
export function findPrivacyPolicyUrl(project) {
  for (const file of LISTING_FILES) {
    const read = readJsonFile(project.resolve(file));
    if (!('value' in read)) continue;
    const declared = isObject(read.value) && typeof read.value.privacyPolicyUrl === 'string' && /^https?:\/\/\S+$/.test(read.value.privacyPolicyUrl.trim())
      ? read.value.privacyPolicyUrl.trim()
      : null;
    const url = declared ?? findInValue(read.value);
    if (url) return { url, file };
  }
  if (project.expo.isExpo) {
    const url = findInValue(project.expo.config.extra);
    if (url) return { url, file: project.expo.file ?? 'app.json' };
  }
  const match = project.code.search(PRIVACY_URL);
  return match ? { url: match.match, file: match.file } : null;
}

/** @param {import('../project/load-project.js').Project} project */
export function run(project) {
  if (findPrivacyPolicyUrl(project)) return [];
  if (project.expo.isExpo && !project.expo.complete) return [];
  const message = 'No privacy policy URL found in store/listing.*.json, app config "extra", or source code.';
  /** @type {Omit<import('../issue.js').Issue, 'id'>[]} */
  const issues = [];
  if (project.platforms.has('ios')) {
    issues.push({
      severity: 'warning',
      platform: 'ios',
      message,
      fix: 'Publish a privacy policy and link it both in App Store Connect and inside the app (guideline 5.1.1(i)). Add "privacyPolicyUrl" to store/listing.ios.json so this check can find it.',
      source: SOURCES.appleGuidelines,
    });
  }
  if (project.platforms.has('android')) {
    issues.push({
      severity: 'warning',
      platform: 'android',
      message,
      fix: 'Play requires a privacy policy for the Data safety section. Add its URL in Play Console, link it inside the app, and add "privacyPolicyUrl" to store/listing.android.json so this check can find it.',
      source: SOURCES.playDataSafety,
    });
  }
  return issues;
}
