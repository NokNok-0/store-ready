import fs from 'node:fs';
import path from 'node:path';
import { isDirectory, isObject, relativePath, walk } from '../fs-utils.js';
import { readImageFile } from '../parsers/image.js';
import { SOURCES } from '../sources.js';
import { configFileName, nonEmptyString } from './expo-helpers.js';

export const id = 'app.icon';
export const title = 'App icon files and sizes';

export const IOS_ICON_SIZE = 1024;
export const PLAY_ICON_SIZE = 512;
export const PLAY_ICON_MAX_BYTES = 1024 * 1024;
export const PLAY_ICON_DIR = 'store/screenshots/android/icon';
const IMAGE_FILE = /\.(?:png|jpe?g)$/i;

/** @typedef {Omit<import('../issue.js').Issue, 'id'>} RawIssue */

/** @param {Record<string, any>} config */
function iosIconPath(config) {
  const icon = config.ios?.icon;
  if (isObject(icon)) return nonEmptyString(icon.light) ?? nonEmptyString(icon.any) ?? Object.values(icon).map(nonEmptyString).find(Boolean) ?? null;
  return nonEmptyString(icon) ?? nonEmptyString(config.icon);
}

/**
 * @param {import('../project/load-project.js').Project} project
 * @param {string} file project-relative path of the icon
 * @param {string} origin where the path came from
 * @returns {RawIssue[]}
 */
function checkIosIconFile(project, file, origin) {
  const source = SOURCES.appleAppIcons;
  const absolute = project.resolve(file);
  if (!fs.existsSync(absolute)) {
    return [{ severity: 'error', platform: 'ios', message: `The iOS icon ${file} (${origin}) does not exist.`, fix: `Add a ${IOS_ICON_SIZE}x${IOS_ICON_SIZE} PNG at that path or fix the path.`, source, file: origin }];
  }
  let info;
  try {
    info = readImageFile(absolute);
  } catch (error) {
    return [{ severity: 'error', platform: 'ios', message: `Could not read the iOS icon ${file}: ${error instanceof Error ? error.message : error}.`, fix: `Export the icon as a ${IOS_ICON_SIZE}x${IOS_ICON_SIZE} PNG.`, source, file }];
  }
  /** @type {RawIssue[]} */
  const issues = [];
  if (info.width !== info.height || info.width !== IOS_ICON_SIZE) {
    issues.push({
      severity: 'error',
      platform: 'ios',
      message: `The iOS icon ${file} is ${info.width}x${info.height}; it must be a square ${IOS_ICON_SIZE}x${IOS_ICON_SIZE} image.`,
      fix: `Export the icon at ${IOS_ICON_SIZE}x${IOS_ICON_SIZE}, square and unmasked (the system applies the mask).`,
      source,
      file,
    });
  }
  if (info.hasAlpha) {
    issues.push({
      severity: 'info',
      platform: 'ios',
      message: `The iOS icon ${file} has an alpha channel. Apple's pages we checked do not confirm a "no transparency" rule, so this is only a note.`,
      fix: 'If App Store Connect rejects the icon, export it without an alpha channel.',
      source,
      file,
    });
  }
  return issues;
}

/** @param {import('../project/load-project.js').Project} project @returns {RawIssue[]} */
function checkExpoIcons(project) {
  const config = project.expo.config;
  const file = configFileName(project);
  /** @type {RawIssue[]} */
  const issues = [];
  if (project.platforms.has('ios')) {
    const iconPath = iosIconPath(config);
    if (!iconPath) {
      issues.push({
        severity: 'error',
        platform: 'ios',
        message: 'No app icon is configured for iOS.',
        fix: `Set expo.icon (or expo.ios.icon) in ${file} to a ${IOS_ICON_SIZE}x${IOS_ICON_SIZE} PNG.`,
        source: SOURCES.appleAppIcons,
        file,
      });
    } else if (iconPath.endsWith('.icon')) {
      if (!project.exists(iconPath)) {
        issues.push({ severity: 'error', platform: 'ios', message: `The iOS icon ${iconPath} does not exist.`, fix: 'Fix the path to the Icon Composer file.', source: SOURCES.appleAppIcons, file });
      }
    } else {
      issues.push(...checkIosIconFile(project, iconPath, file));
    }
  }
  if (project.platforms.has('android')) {
    const adaptive = isObject(config.android?.adaptiveIcon) ? config.android.adaptiveIcon : {};
    const sharedIconCheckedByIos = project.platforms.has('ios') && iosIconPath(config) === nonEmptyString(config.icon);
    const androidPaths = [
      ['android.adaptiveIcon.foregroundImage', adaptive.foregroundImage],
      ['android.adaptiveIcon.backgroundImage', adaptive.backgroundImage],
      ['android.adaptiveIcon.monochromeImage', adaptive.monochromeImage],
      ['android.icon', config.android?.icon],
      ['icon', sharedIconCheckedByIos ? undefined : config.icon],
    ];
    for (const [field, value] of androidPaths) {
      const iconPath = nonEmptyString(value);
      if (iconPath && !project.exists(iconPath)) {
        issues.push({
          severity: 'error',
          platform: 'android',
          message: `expo.${field} points to ${iconPath}, which does not exist.`,
          fix: 'Add the image at that path or fix the path.',
          source: SOURCES.expoAppStores,
          file,
        });
      }
    }
  }
  return issues;
}

/** @param {import('../project/load-project.js').Project} project @returns {RawIssue[]} */
function checkNativeIosIcon(project) {
  if (!project.platforms.has('ios') || !project.ios.present) return [];
  const sets = project.ios.appIconSets;
  if (sets.length === 0) {
    return [{ severity: 'error', platform: 'ios', message: 'No AppIcon.appiconset found in the iOS project.', fix: `Add an app icon set with a ${IOS_ICON_SIZE}x${IOS_ICON_SIZE} image in Xcode.`, source: SOURCES.appleAppIcons, file: project.ios.infoPlists[0]?.file }];
  }
  const set = sets[0];
  const images = Array.isArray(set.data?.images) ? set.data.images : [];
  const large = images.find((image) => isObject(image) && image.size === `${IOS_ICON_SIZE}x${IOS_ICON_SIZE}` && typeof image.filename === 'string');
  if (!large) {
    return [{ severity: 'error', platform: 'ios', message: `${set.file} has no ${IOS_ICON_SIZE}x${IOS_ICON_SIZE} image.`, fix: `Add a ${IOS_ICON_SIZE}x${IOS_ICON_SIZE} PNG to the app icon set.`, source: SOURCES.appleAppIcons, file: set.file }];
  }
  return checkIosIconFile(project, `${set.dir}/${large.filename}`, set.file);
}

/** @param {import('../project/load-project.js').Project} project @returns {RawIssue[]} */
function checkPlayIcons(project) {
  const dir = project.resolve(PLAY_ICON_DIR);
  if (!isDirectory(dir)) return [];
  return walk(dir, { maxDepth: 0 })
    .filter((file) => IMAGE_FILE.test(path.basename(file)))
    .flatMap((file) => checkPlayIcon(project, file));
}

/** @param {import('../project/load-project.js').Project} project @param {string} absolute @returns {RawIssue[]} */
function checkPlayIcon(project, absolute) {
  const relative = relativePath(project.root, absolute);
  const source = SOURCES.playGraphics;
  /** @type {RawIssue[]} */
  const issues = [];
  let info;
  try {
    info = readImageFile(absolute);
  } catch (error) {
    return [{ severity: 'error', platform: 'android', message: `Could not read the Play icon ${relative}: ${error instanceof Error ? error.message : error}.`, fix: `Export a ${PLAY_ICON_SIZE}x${PLAY_ICON_SIZE} 32-bit PNG.`, source, file: relative }];
  }
  if (info.format !== 'png') {
    issues.push({ severity: 'error', platform: 'android', message: `The Play icon ${relative} is ${info.format.toUpperCase()}; Play needs a PNG.`, fix: `Export a ${PLAY_ICON_SIZE}x${PLAY_ICON_SIZE} 32-bit PNG.`, source, file: relative });
  }
  if (info.width !== PLAY_ICON_SIZE || info.height !== PLAY_ICON_SIZE) {
    issues.push({ severity: 'error', platform: 'android', message: `The Play icon ${relative} is ${info.width}x${info.height}; it must be ${PLAY_ICON_SIZE}x${PLAY_ICON_SIZE}.`, fix: `Export the icon at ${PLAY_ICON_SIZE}x${PLAY_ICON_SIZE}.`, source, file: relative });
  }
  const bytes = fs.statSync(absolute).size;
  if (bytes > PLAY_ICON_MAX_BYTES) {
    issues.push({ severity: 'error', platform: 'android', message: `The Play icon ${relative} is ${Math.ceil(bytes / 1024)} KB; the limit is 1024 KB.`, fix: 'Compress the PNG.', source, file: relative });
  }
  if (info.format === 'png' && !(info.colorType === 6 && info.bitDepth === 8)) {
    issues.push({ severity: 'warning', platform: 'android', message: `The Play icon ${relative} is not a 32-bit PNG with alpha.`, fix: 'Export it as a 32-bit (RGBA, 8 bits per channel) PNG.', source, file: relative });
  }
  return issues;
}

/** @param {import('../project/load-project.js').Project} project */
export function run(project) {
  /** @type {RawIssue[]} */
  const issues = [];
  if (project.expo.isExpo) {
    if (project.expo.complete) issues.push(...checkExpoIcons(project));
  } else {
    issues.push(...checkNativeIosIcon(project));
  }
  if (project.platforms.has('android')) issues.push(...checkPlayIcons(project));
  return issues;
}
