import fs from 'node:fs';
import path from 'node:path';
import { isDirectory, relativePath, walk } from '../fs-utils.js';
import { readImageFile } from '../parsers/image.js';
import { buildSettingValues } from '../project/native-ios.js';
import { SOURCES } from '../sources.js';

export const id = 'store.screenshots';
export const title = 'Store screenshot sizes and formats';

export const SCREENSHOTS_DIR = 'store/screenshots';
export const IOS_FOLDERS = ['iphone', 'ipad'];
export const ANDROID_SCREENSHOT_FOLDERS = ['phone', 'tablet'];
export const ANDROID_FEATURE_GRAPHIC_FOLDER = 'feature-graphic';
export const ANDROID_ICON_FOLDER = 'icon';

/**
 * Apple's device classes with their accepted portrait sizes; landscape is the same pair swapped.
 * @typedef {{ name: string, device: 'iphone' | 'ipad', sizes: [number, number][], required?: 'always' | 'ipad' }} IosClass
 * @type {IosClass[]}
 */
export const IOS_CLASSES = [
  { name: 'iPhone with Dynamic Island (medium display)', device: 'iphone', sizes: [[1179, 2556], [1206, 2622]], required: 'always' },
  { name: 'iPhone with Dynamic Island (large display)', device: 'iphone', sizes: [[1260, 2736], [1290, 2796], [1320, 2868]] },
  { name: 'iPhone with Face ID (large display)', device: 'iphone', sizes: [[1284, 2778], [1242, 2688]] },
  { name: 'iPhone with Face ID (medium display)', device: 'iphone', sizes: [[1170, 2532], [1125, 2436], [1080, 2340]] },
  { name: 'iPhone with Home Button (large display)', device: 'iphone', sizes: [[1242, 2208]] },
  { name: 'iPhone with Home Button (medium display)', device: 'iphone', sizes: [[750, 1334]] },
  { name: 'iPhone Duo', device: 'iphone', sizes: [[1398, 2034], [2007, 2853]] },
  { name: 'iPad 13-inch display', device: 'ipad', sizes: [[2064, 2752], [2048, 2732]], required: 'ipad' },
  { name: 'iPad 11-inch display', device: 'ipad', sizes: [[1488, 2266], [1512, 2316], [1668, 2420], [1668, 2388], [1640, 2360]] },
  { name: 'iPad 10.5-inch display', device: 'ipad', sizes: [[1668, 2224]] },
];
export const IOS_MIN_PER_CLASS = 1;
export const IOS_MAX_PER_CLASS = 10;

export const ANDROID_MIN_SIDE = 320;
export const ANDROID_MAX_SIDE = 3840;
export const ANDROID_MAX_RATIO = 2;
export const ANDROID_MIN_TO_PUBLISH = 2;
export const ANDROID_MAX_PER_TYPE = 8;
export const ANDROID_PROMO_COUNT = 4;
export const ANDROID_PROMO_SIDE = 1080;
export const FEATURE_GRAPHIC_SIZE = [1024, 500];

const ACCEPTED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);
const IGNORED_EXTENSIONS = new Set(['.md', '.txt', '.json']);

/**
 * @typedef {Omit<import('../issue.js').Issue, 'id'>} RawIssue
 * @typedef {{ file: string, folder: string, width: number, height: number, format: string, hasAlpha: boolean }} Shot
 */

/** @param {number} width @param {number} height @returns {IosClass | null} */
export function iosClassFor(width, height) {
  return IOS_CLASSES.find(({ sizes }) => sizes.some(([w, h]) => (w === width && h === height) || (w === height && h === width))) ?? null;
}

/** @param {number} width @param {number} height @param {number} [count] */
export function closestIosSizes(width, height, count = 3) {
  const landscape = width > height;
  return IOS_CLASSES.flatMap(({ name, sizes }) => sizes.map(([w, h]) => (landscape ? { name, w: h, h: w } : { name, w, h })))
    .sort((a, b) => Math.abs(a.w - width) + Math.abs(a.h - height) - (Math.abs(b.w - width) + Math.abs(b.h - height)))
    .slice(0, count)
    .map(({ name, w, h }) => `${w}x${h} (${name})`);
}

/**
 * @param {import('../project/load-project.js').Project} project
 * @param {string} dir
 * @param {'ios' | 'android'} platform
 * @param {string} source
 * @param {RawIssue[]} issues
 * @returns {Shot[]}
 */
function readShots(project, dir, platform, source, issues) {
  /** @type {Shot[]} */
  const shots = [];
  for (const absolute of walk(dir, { maxDepth: 3, skipDir: (name) => name.startsWith('.') })) {
    const file = relativePath(project.root, absolute);
    const extension = path.extname(absolute).toLowerCase();
    if (path.basename(absolute).startsWith('.') || IGNORED_EXTENSIONS.has(extension)) continue;
    if (!ACCEPTED_EXTENSIONS.has(extension)) {
      issues.push({ severity: 'error', platform, message: `${file} is not a .png, .jpg or .jpeg file.`, fix: 'Export it as PNG or JPEG, or move it out of the screenshots folder.', source, file });
      continue;
    }
    try {
      const info = readImageFile(absolute);
      shots.push({ file, folder: relativePath(project.root, path.dirname(absolute)), width: info.width, height: info.height, format: info.format, hasAlpha: info.hasAlpha });
    } catch (error) {
      issues.push({ severity: 'error', platform, message: `Could not read ${file}: ${error instanceof Error ? error.message : error}.`, fix: 'Re-export it as PNG or JPEG.', source, file });
    }
  }
  return shots;
}

/** @param {import('../project/load-project.js').Project} project */
function supportsIpad(project) {
  if (project.expo.isExpo) return project.expo.config.ios?.supportsTablet === true;
  return buildSettingValues(project.ios, 'TARGETED_DEVICE_FAMILY').some((value) => value.split(',').map((v) => v.trim()).includes('2'));
}

/**
 * @param {import('../project/load-project.js').Project} project
 * @param {string} dir
 * @param {string[]} known
 * @param {'ios' | 'android'} platform
 * @param {string} source
 * @returns {RawIssue[]}
 */
function unknownEntries(project, dir, known, platform, source) {
  /** @type {RawIssue[]} */
  const issues = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || IGNORED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
    if (entry.isDirectory() && known.includes(entry.name)) continue;
    const file = relativePath(project.root, path.join(dir, entry.name));
    issues.push({
      severity: 'warning',
      platform,
      message: `${file} was not checked; expected ${known.map((name) => `${relativePath(project.root, dir)}/${name}/`).join(', ')}.`,
      fix: 'Move it into one of those folders.',
      source,
      file,
    });
  }
  return issues;
}

/** @param {import('../project/load-project.js').Project} project @param {string} dir @returns {RawIssue[]} */
function checkIos(project, dir) {
  const source = SOURCES.appleScreenshots;
  const folder = relativePath(project.root, dir);
  /** @type {RawIssue[]} */
  const issues = unknownEntries(project, dir, IOS_FOLDERS, 'ios', source);
  const shots = IOS_FOLDERS.map((name) => path.join(dir, name)).filter(isDirectory).flatMap((sub) => readShots(project, sub, 'ios', source, issues));
  /** @type {Map<string, Shot[]>} */
  const byClass = new Map();
  for (const shot of shots) {
    if (shot.hasAlpha) {
      issues.push({ severity: 'error', platform: 'ios', message: `${shot.file} has an alpha channel or transparency; App Store screenshots can't include either.`, fix: 'Flatten it onto a solid background and export without alpha (or as JPEG).', source, file: shot.file });
    }
    const deviceClass = iosClassFor(shot.width, shot.height);
    if (!deviceClass) {
      issues.push({
        severity: 'error',
        platform: 'ios',
        message: `${shot.file} is ${shot.width}x${shot.height}, which is not an accepted App Store screenshot size. Closest accepted: ${closestIosSizes(shot.width, shot.height).join(', ')}.`,
        fix: 'Capture or resize the screenshot to an accepted size for its device class.',
        source,
        file: shot.file,
      });
      continue;
    }
    byClass.set(deviceClass.name, [...(byClass.get(deviceClass.name) ?? []), shot]);
  }
  for (const [name, list] of byClass) {
    if (list.length > IOS_MAX_PER_CLASS) {
      issues.push({ severity: 'error', platform: 'ios', message: `${list.length} screenshots for ${name}; App Store allows ${IOS_MIN_PER_CLASS}-${IOS_MAX_PER_CLASS} per device class.`, fix: `Keep at most ${IOS_MAX_PER_CLASS}.`, source, file: folder });
    }
  }
  if (shots.length === 0) return issues;
  const ipad = supportsIpad(project);
  for (const deviceClass of IOS_CLASSES) {
    const needed = deviceClass.required === 'always' || (deviceClass.required === 'ipad' && ipad);
    if (!needed || byClass.has(deviceClass.name)) continue;
    const sizes = deviceClass.sizes.map(([w, h]) => `${w}x${h}`).join(' or ');
    issues.push({
      severity: 'error',
      platform: 'ios',
      message: `No screenshots for ${deviceClass.name} (${sizes}, portrait or landscape)${deviceClass.required === 'ipad' ? ', which is required because the app runs on iPad' : ', which is required'}.`,
      fix: `Add ${IOS_MIN_PER_CLASS}-${IOS_MAX_PER_CLASS} screenshots at ${sizes} to ${folder}/${deviceClass.device}/.`,
      source,
      file: folder,
    });
  }
  if (!byClass.has('iPhone Duo')) {
    issues.push({
      severity: 'info',
      platform: 'ios',
      message: 'No iPhone Duo screenshots (outer 1398x2034, inner 2007x2853). Optional now; Apple says they are required from April 2027 for builds made with the iOS 27.1 SDK or later.',
      fix: 'Plan to add iPhone Duo screenshots before you build with the iOS 27.1 SDK.',
      source,
      file: folder,
    });
  }
  return issues;
}

/** @param {Shot} shot @param {string} source @returns {RawIssue[]} */
function androidScreenshotIssues(shot, source) {
  /** @type {RawIssue[]} */
  const issues = [];
  const longest = Math.max(shot.width, shot.height);
  const shortest = Math.min(shot.width, shot.height);
  if (shot.hasAlpha) {
    issues.push({ severity: 'error', platform: 'android', message: `${shot.file} has an alpha channel; Play screenshots must be JPEG or 24-bit PNG.`, fix: 'Export without alpha (24-bit PNG or JPEG).', source, file: shot.file });
  }
  if (shortest < ANDROID_MIN_SIDE || longest > ANDROID_MAX_SIDE) {
    issues.push({ severity: 'error', platform: 'android', message: `${shot.file} is ${shot.width}x${shot.height}; each side must be ${ANDROID_MIN_SIDE}-${ANDROID_MAX_SIDE} px.`, fix: `Resize it so both sides are between ${ANDROID_MIN_SIDE} and ${ANDROID_MAX_SIDE} px.`, source, file: shot.file });
  }
  if (longest > shortest * ANDROID_MAX_RATIO) {
    issues.push({ severity: 'error', platform: 'android', message: `${shot.file} is ${shot.width}x${shot.height}; the longest side can be at most twice the shortest.`, fix: 'Crop or pad it to an aspect ratio of 2:1 or less.', source, file: shot.file });
  }
  return issues;
}

/** @param {import('../project/load-project.js').Project} project @param {string} dir @returns {RawIssue[]} */
function checkAndroid(project, dir) {
  const source = SOURCES.playGraphics;
  /** @type {RawIssue[]} */
  const issues = unknownEntries(project, dir, [...ANDROID_SCREENSHOT_FOLDERS, ANDROID_FEATURE_GRAPHIC_FOLDER, ANDROID_ICON_FOLDER], 'android', source);
  let valid = 0;
  let promo = 0;
  let total = 0;
  for (const name of ANDROID_SCREENSHOT_FOLDERS) {
    const sub = path.join(dir, name);
    if (!isDirectory(sub)) continue;
    const shots = readShots(project, sub, 'android', source, issues);
    total += shots.length;
    for (const shot of shots) {
      const problems = androidScreenshotIssues(shot, source);
      issues.push(...problems);
      if (problems.length === 0) valid += 1;
      if (Math.min(shot.width, shot.height) >= ANDROID_PROMO_SIDE) promo += 1;
    }
    if (shots.length > ANDROID_MAX_PER_TYPE) {
      const folder = relativePath(project.root, sub);
      issues.push({ severity: 'error', platform: 'android', message: `${folder} has ${shots.length} screenshots; Play allows up to ${ANDROID_MAX_PER_TYPE} per device type.`, fix: `Keep at most ${ANDROID_MAX_PER_TYPE}.`, source, file: folder });
    }
  }
  const folder = relativePath(project.root, dir);
  if (total > 0 && valid < ANDROID_MIN_TO_PUBLISH) {
    issues.push({ severity: 'warning', platform: 'android', message: `${folder} has ${valid} valid screenshot${valid === 1 ? '' : 's'}; Play needs at least ${ANDROID_MIN_TO_PUBLISH} to publish.`, fix: `Add at least ${ANDROID_MIN_TO_PUBLISH - valid} more.`, source, file: folder });
  }
  if (total > 0 && promo < ANDROID_PROMO_COUNT) {
    issues.push({ severity: 'info', platform: 'android', message: `${promo} screenshot${promo === 1 ? '' : 's'} at ${ANDROID_PROMO_SIDE} px or more; Play needs at least ${ANDROID_PROMO_COUNT} for promotion eligibility.`, fix: `Add screenshots with each side at least ${ANDROID_PROMO_SIDE} px if you want to be eligible for promotion.`, source, file: folder });
  }
  issues.push(...checkFeatureGraphic(project, path.join(dir, ANDROID_FEATURE_GRAPHIC_FOLDER), source));
  return issues;
}

/** @param {import('../project/load-project.js').Project} project @param {string} dir @param {string} source @returns {RawIssue[]} */
function checkFeatureGraphic(project, dir, source) {
  if (!isDirectory(dir)) return [];
  /** @type {RawIssue[]} */
  const issues = [];
  const [width, height] = FEATURE_GRAPHIC_SIZE;
  for (const shot of readShots(project, dir, 'android', source, issues)) {
    if (shot.width !== width || shot.height !== height) {
      issues.push({ severity: 'error', platform: 'android', message: `The feature graphic ${shot.file} is ${shot.width}x${shot.height}; it must be ${width}x${height}.`, fix: `Export it at ${width}x${height}.`, source, file: shot.file });
    }
    if (shot.hasAlpha) {
      issues.push({ severity: 'error', platform: 'android', message: `The feature graphic ${shot.file} has an alpha channel; it must be JPEG or 24-bit PNG without alpha.`, fix: 'Export it without alpha.', source, file: shot.file });
    }
  }
  return issues;
}

/** @param {import('../project/load-project.js').Project} project */
export function run(project) {
  const root = project.resolve(SCREENSHOTS_DIR);
  if (!isDirectory(root)) return [];
  /** @type {RawIssue[]} */
  const issues = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (entry.name.startsWith('.') || IGNORED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory() && entry.name === 'ios') issues.push(...checkIos(project, full));
    else if (entry.isDirectory() && entry.name === 'android') issues.push(...checkAndroid(project, full));
    else {
      issues.push({
        severity: 'warning',
        platform: 'both',
        message: `${SCREENSHOTS_DIR}/${entry.name} was not checked; screenshots go in ${SCREENSHOTS_DIR}/ios/ or ${SCREENSHOTS_DIR}/android/.`,
        fix: 'Move it into the ios or android folder.',
        source: SOURCES.appleScreenshots,
        file: `${SCREENSHOTS_DIR}/${entry.name}`,
      });
    }
  }
  return issues;
}
