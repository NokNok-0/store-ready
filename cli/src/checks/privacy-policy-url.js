import { findLinks, LISTING_FILES, PRIVACY_URL } from '../project/links.js';
import { SOURCES } from '../sources.js';
import { linkIssue } from './link-issues.js';

export const id = 'privacy.policy-url';
export const title = 'Privacy policy URL (found, not verified, unless --verify-urls)';
export const source = SOURCES.appleGuidelines;

export { LISTING_FILES, PRIVACY_URL };

/**
 * @param {import('../project/load-project.js').Project} project
 * @returns {{ url: string, file: string } | null}
 */
export function findPrivacyPolicyUrl(project) {
  const link = findLinks(project).find((item) => item.kind === 'privacy');
  return link ? { url: link.url, file: link.places[0].replace(/ \(.*\)$/, '') } : null;
}

/** @param {import('../project/load-project.js').Project} project */
export function run(project) {
  const links = findLinks(project).filter((item) => item.kind === 'privacy');
  const hasIos = project.platforms.has('ios');
  const hasAndroid = project.platforms.has('android');
  if (links.length > 0) {
    const platform = hasIos && hasAndroid ? 'both' : hasIos ? 'ios' : hasAndroid ? 'android' : 'both';
    const linkSource = hasIos ? SOURCES.appleGuidelines : SOURCES.playDataSafety;
    return links.map((link) => linkIssue(project, link, { label: 'Privacy policy URL', platform, source: linkSource }));
  }
  if (project.expo.isExpo && !project.expo.complete) return [];
  const message = 'No privacy policy URL found in store/listing.*.json, app config "extra", or source code.';
  /** @type {Omit<import('../issue.js').Issue, 'id'>[]} */
  const issues = [];
  if (hasIos) {
    issues.push({
      severity: 'warning',
      platform: 'ios',
      message,
      fix: 'Publish a privacy policy and link it both in App Store Connect and inside the app (guideline 5.1.1(i)). Add "privacyPolicyUrl" to store/listing.ios.json so this check can find it.',
      source: SOURCES.appleGuidelines,
    });
  }
  if (hasAndroid) {
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
