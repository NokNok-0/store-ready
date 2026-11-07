import { SOURCES } from '../sources.js';

export const id = 'play.closed-testing';
export const title = 'Play closed testing for new personal accounts (reminder)';

/** @param {import('../project/load-project.js').Project} project */
export function run(project) {
  if (!project.platforms.has('android')) return [];
  return [{
    severity: /** @type {const} */ ('info'),
    platform: /** @type {const} */ ('android'),
    message: 'Personal Play developer accounts created after 2023-11-13 must run a closed test with at least 12 testers opted in for at least 14 days in a row before applying for production access. This cannot be detected from the project.',
    fix: 'If this applies to your account, start the closed test early and keep 12 or more testers opted in for the full 14 days.',
    source: SOURCES.playTesting,
  }];
}
