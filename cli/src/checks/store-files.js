import path from 'node:path';
import { SOURCES } from '../sources.js';

export const id = 'store.files';
export const title = 'Store files the other checks read';
export const source = SOURCES.appleAppInformation;

/**
 * Files under store/ that checks read or that hold answers for the store consoles. A missing file is
 * not a pass: the human footer lists these as "Not checked yet".
 * @type {{ path: string, platform: 'ios' | 'android', directory?: boolean, what: string }[]}
 */
export const STORE_FILES = [
  { path: 'store/listing.ios.json', platform: 'ios', what: 'App Store name, subtitle, keywords and description' },
  { path: 'store/review-notes.txt', platform: 'ios', what: 'App Review notes and demo account' },
  { path: 'store/privacy.ios.md', platform: 'ios', what: 'App Privacy answers' },
  { path: 'store/screenshots/ios/', platform: 'ios', directory: true, what: 'App Store screenshots' },
  { path: 'store/listing.android.json', platform: 'android', what: 'Play title and descriptions' },
  { path: 'store/data-safety.android.md', platform: 'android', what: 'Data safety answers' },
  { path: 'store/screenshots/android/', platform: 'android', directory: true, what: 'Play screenshots and graphics' },
];

const IMAGE_FILE = /\.(?:png|jpe?g)$/i;

/** @param {import('../project/load-project.js').Project} project @param {(typeof STORE_FILES)[number]} entry */
function exists(project, entry) {
  if (!entry.directory) return project.files.isFile(entry.path);
  if (!project.files.isDirectory(entry.path)) return false;
  return project.files.walk(entry.path, { maxDepth: 3 }).some((file) => IMAGE_FILE.test(path.basename(file)));
}

/** @param {import('../project/load-project.js').Project} project */
export function run(project) {
  /** @type {(Omit<import('../issue.js').Issue, 'id'> & { missing: string[] })[]} */
  const issues = [];
  for (const platform of /** @type {const} */ (['ios', 'android'])) {
    if (!project.platforms.has(platform)) continue;
    const missing = STORE_FILES.filter((entry) => entry.platform === platform && !exists(project, entry));
    if (missing.length === 0) continue;
    const store = platform === 'ios' ? 'App Store' : 'Google Play';
    issues.push({
      severity: 'info',
      platform,
      message: `Not checked yet, because these ${store} files do not exist: ${missing.map((entry) => `${entry.path}${entry.directory ? ' (no images)' : ''}`).join(', ')}. The checks that read them were skipped, so a clean run does not cover them.`,
      fix: `Create them (${missing.map((entry) => entry.what).join('; ')}), then check again. The store-ready skills write these files.`,
      source: platform === 'ios' ? SOURCES.appleAppInformation : SOURCES.playListingText,
      missing: missing.map((entry) => entry.path),
    });
  }
  return issues;
}
