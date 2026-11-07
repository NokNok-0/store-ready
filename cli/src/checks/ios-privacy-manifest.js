import { isObject } from '../fs-utils.js';
import { SOURCES } from '../sources.js';
import { configFileName } from './expo-helpers.js';

export const id = 'ios.privacy-manifest';
export const title = 'iOS privacy manifest required-reason APIs';

/** Required-reason API categories and their valid reason codes. */
export const REQUIRED_REASON_CATEGORIES = Object.freeze({
  NSPrivacyAccessedAPICategoryFileTimestamp: ['DDA9.1', 'C617.1', '3B52.1', '0A2A.1'],
  NSPrivacyAccessedAPICategorySystemBootTime: ['35F9.1', '8FFB.1', '3D61.1'],
  NSPrivacyAccessedAPICategoryDiskSpace: ['85F4.1', 'E174.1', '7D9E.1', 'B728.1'],
  NSPrivacyAccessedAPICategoryActiveKeyboards: ['3EC4.1', '54BD.1'],
  NSPrivacyAccessedAPICategoryUserDefaults: ['CA92.1', '1C8F.1', 'C56D.1', 'AC6B.1'],
});

const USER_DEFAULTS = 'NSPrivacyAccessedAPICategoryUserDefaults';

/** Dependencies known to read or write UserDefaults on iOS. */
export const USER_DEFAULTS_PACKAGES = ['@react-native-async-storage/async-storage'];

/**
 * @typedef {{ entries: unknown, file: string, where: string }} DeclarationSource
 * @param {import('../project/load-project.js').Project} project
 * @returns {DeclarationSource[]}
 */
function declarationSources(project) {
  /** @type {DeclarationSource[]} */
  const sources = [];
  const manifests = project.expo.isExpo ? project.expo.config.ios?.privacyManifests : undefined;
  if (manifests !== undefined) {
    sources.push({
      entries: isObject(manifests) ? manifests.NSPrivacyAccessedAPITypes ?? [] : manifests,
      file: configFileName(project),
      where: 'expo.ios.privacyManifests.NSPrivacyAccessedAPITypes',
    });
  }
  for (const info of project.ios.privacyInfos) {
    if (info.error) continue;
    sources.push({ entries: isObject(info.data) ? info.data.NSPrivacyAccessedAPITypes ?? [] : info.data, file: info.file, where: info.file });
  }
  return sources;
}

/** @param {string} code */
function categoryOfCode(code) {
  return Object.entries(REQUIRED_REASON_CATEGORIES).find(([, codes]) => codes.includes(code))?.[0] ?? null;
}

/** @param {import('../project/load-project.js').Project} project */
export function run(project) {
  if (!project.platforms.has('ios')) return [];
  /** @type {Omit<import('../issue.js').Issue, 'id'>[]} */
  const issues = [];
  /** @param {string} message @param {string} fix @param {string} file @param {string} [source] */
  const error = (message, fix, file, source = SOURCES.appleThirdPartySdk) =>
    issues.push({ severity: 'error', platform: 'ios', message, fix, source, file });

  for (const info of project.ios.privacyInfos) {
    if (info.error) error(`Could not read ${info.file}: ${info.error}.`, 'Make sure the privacy manifest is a valid XML property list.', info.file);
  }

  /** @type {Set<string>} */
  const declared = new Set();
  for (const { entries, file, where } of declarationSources(project)) {
    if (!Array.isArray(entries)) {
      error(`${where} must be an array of entries.`, 'Use an array of { NSPrivacyAccessedAPIType, NSPrivacyAccessedAPITypeReasons } objects.', file, SOURCES.expoApplePrivacy);
      continue;
    }
    entries.forEach((entry, index) => {
      const label = `${where}[${index}]`;
      if (!isObject(entry)) {
        error(`${label} is not an object.`, 'Each entry needs NSPrivacyAccessedAPIType and NSPrivacyAccessedAPITypeReasons.', file, SOURCES.expoApplePrivacy);
        return;
      }
      const category = entry.NSPrivacyAccessedAPIType;
      const reasons = entry.NSPrivacyAccessedAPITypeReasons;
      const known = Object.keys(REQUIRED_REASON_CATEGORIES);
      if (typeof category !== 'string' || !known.includes(category)) {
        const suggestion = typeof category === 'string' ? known.find((name) => name.endsWith(category)) : undefined;
        error(
          `${label} has NSPrivacyAccessedAPIType ${JSON.stringify(category ?? null)}, which is not a known required-reason category.`,
          suggestion ? `Use the full name "${suggestion}".` : `Use one of: ${known.join(', ')}.`,
          file,
        );
        return;
      }
      const validCodes = REQUIRED_REASON_CATEGORIES[/** @type {keyof typeof REQUIRED_REASON_CATEGORIES} */ (category)];
      if (!Array.isArray(reasons) || reasons.length === 0) {
        error(`${label} (${category}) has no NSPrivacyAccessedAPITypeReasons.`, `Add the reason codes that match your use. Valid codes: ${validCodes.join(', ')}.`, file);
        return;
      }
      let valid = 0;
      for (const reason of reasons) {
        if (typeof reason === 'string' && validCodes.includes(reason)) {
          valid += 1;
          continue;
        }
        const belongsTo = typeof reason === 'string' ? categoryOfCode(reason) : null;
        error(
          `${label} (${category}) lists reason ${JSON.stringify(reason)}, which is not valid for this category${belongsTo ? ` (it belongs to ${belongsTo})` : ''}.`,
          `Use one of: ${validCodes.join(', ')}.`,
          file,
        );
      }
      if (valid > 0) declared.add(category);
    });
  }

  const userDefaultsPackages = USER_DEFAULTS_PACKAGES.filter((name) => project.hasDependency(name));
  const configKnown = !project.expo.isExpo || project.expo.complete;
  if (userDefaultsPackages.length > 0 && !declared.has(USER_DEFAULTS) && configKnown) {
    issues.push({
      severity: 'warning',
      platform: 'ios',
      message: `${userDefaultsPackages.join(', ')} is a dependency, and no UserDefaults reason is declared in ${project.expo.isExpo ? 'app config' : "the app's PrivacyInfo.xcprivacy"}. Packages ship their own privacy manifests, but Apple may not read them from static CocoaPods, and Apple emails missing reasons after upload.`,
      fix: project.expo.isExpo
        ? `Add { "NSPrivacyAccessedAPIType": "${USER_DEFAULTS}", "NSPrivacyAccessedAPITypeReasons": ["<code>"] } to expo.ios.privacyManifests.NSPrivacyAccessedAPITypes in ${configFileName(project)}. Valid codes: ${REQUIRED_REASON_CATEGORIES[USER_DEFAULTS].join(', ')} (Expo's example uses CA92.1); pick the one that matches your use.`
        : `Add a ${USER_DEFAULTS} entry with the matching reason code (${REQUIRED_REASON_CATEGORIES[USER_DEFAULTS].join(', ')}) to the app target's PrivacyInfo.xcprivacy.`,
      source: SOURCES.expoApplePrivacy,
      file: project.expo.isExpo ? configFileName(project) : project.ios.privacyInfos[0]?.file,
    });
  }
  return issues;
}
