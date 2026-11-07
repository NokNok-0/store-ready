import { findLinks } from '../project/links.js';
import { SOURCES } from '../sources.js';
import { linkIssue } from './link-issues.js';

export const id = 'app.links';
export const title = 'Support and account deletion URLs in app config (found, not verified, unless --verify-urls)';
export const source = SOURCES.appleGuidelines;

/** @param {import('../project/load-project.js').Project} project */
export function run(project) {
  const hasIos = project.platforms.has('ios');
  const hasAndroid = project.platforms.has('android');
  const platform = hasIos && hasAndroid ? 'both' : hasIos ? 'ios' : hasAndroid ? 'android' : 'both';
  /** @type {Omit<import('../issue.js').Issue, 'id'>[]} */
  const issues = [];
  for (const link of findLinks(project)) {
    if (link.kind === 'support') {
      issues.push(linkIssue(project, link, {
        label: 'Support URL',
        platform,
        source: hasIos ? SOURCES.appleGuidelines : SOURCES.playPolicy,
      }));
    } else if (link.kind === 'deletion') {
      issues.push(linkIssue(project, link, {
        label: 'Account deletion URL',
        platform,
        source: hasAndroid ? SOURCES.playAccountDeletion : SOURCES.appleAccountDeletion,
        note: hasAndroid ? 'Google Play requires the web deletion link to load without error' : undefined,
      }));
    }
  }
  return issues;
}
