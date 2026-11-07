import { isObject } from '../fs-utils.js';
import { SOURCES } from '../sources.js';
import { dependencyPrivacy, unionCategories } from '../project/dependency-privacy.js';
import { configFileName } from './expo-helpers.js';

export const id = 'ios.privacy-manifest';
export const title = 'iOS privacy manifest required-reason APIs, compared with installed packages';
export const source = SOURCES.expoApplePrivacy;

/** Required-reason API categories and their valid reason codes. */
export const REQUIRED_REASON_CATEGORIES = Object.freeze({
  NSPrivacyAccessedAPICategoryFileTimestamp: ['DDA9.1', 'C617.1', '3B52.1', '0A2A.1'],
  NSPrivacyAccessedAPICategorySystemBootTime: ['35F9.1', '8FFB.1', '3D61.1'],
  NSPrivacyAccessedAPICategoryDiskSpace: ['85F4.1', 'E174.1', '7D9E.1', 'B728.1'],
  NSPrivacyAccessedAPICategoryActiveKeyboards: ['3EC4.1', '54BD.1'],
  NSPrivacyAccessedAPICategoryUserDefaults: ['CA92.1', '1C8F.1', 'C56D.1', 'AC6B.1'],
});

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
  const error = (message, fix, file, source = SOURCES.appleRequiredReasonApi) =>
    issues.push({ severity: 'error', platform: 'ios', message, fix, source, file });

  for (const info of project.ios.privacyInfos) {
    if (info.error) error(`${info.file} is ${info.error}.`, 'Make sure the privacy manifest is a valid XML property list.', info.file);
  }

  /** @type {Set<string>} */
  const declared = new Set();
  /** @type {Map<string, Set<string>>} */
  const declaredReasons = new Map();
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
          const set = declaredReasons.get(category) ?? new Set();
          set.add(reason);
          declaredReasons.set(category, set);
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

  const configKnown = !project.expo.isExpo || project.expo.complete;
  if (configKnown) issues.push(...compareWithPackages(project, declared, declaredReasons));
  return issues;
}

/**
 * Warns for each required-reason category that installed packages declare in their own
 * PrivacyInfo.xcprivacy but the app does not.
 * @param {import('../project/load-project.js').Project} project
 * @param {Set<string>} declared
 * @param {Map<string, Set<string>>} declaredReasons
 * @returns {Omit<import('../issue.js').Issue, 'id'>[]}
 */
function compareWithPackages(project, declared, declaredReasons) {
  const deps = dependencyPrivacy(project);
  const file = project.expo.isExpo ? configFileName(project) : project.ios.privacyInfos[0]?.file;
  const where = project.expo.isExpo ? `expo.ios.privacyManifests in ${configFileName(project)}` : "the app target's PrivacyInfo.xcprivacy";
  if (!deps.installed) {
    if (project.dependencies.size === 0) return [];
    return [{
      severity: 'info',
      platform: 'ios',
      message: 'Required-reason APIs used by your packages were not compared with your privacy manifest: this needs installed dependencies (no node_modules folder).',
      fix: 'Run "npm install" (or your package manager\'s install), then check again.',
      source: SOURCES.expoApplePrivacy,
    }];
  }
  /** @type {Omit<import('../issue.js').Issue, 'id'>[]} */
  const issues = [];
  const known = Object.keys(REQUIRED_REASON_CATEGORIES);
  /** @param {Map<string, Set<string>>} reasons */
  const describe = (reasons) => [...reasons].map(([reason, packages]) => `${reason} (${[...packages].sort().join(', ')})`).join('; ');
  for (const [category, usage] of unionCategories(deps.manifests)) {
    if (!known.includes(category)) continue;
    const validReasons = new Map([...usage.reasons].filter(([reason]) => REQUIRED_REASON_CATEGORIES[/** @type {keyof typeof REQUIRED_REASON_CATEGORIES} */ (category)].includes(reason)));
    const packages = [...usage.packages].sort();
    if (!declared.has(category)) {
      const suggested = [...validReasons.keys()];
      issues.push({
        severity: 'warning',
        platform: 'ios',
        message: `${category} is declared by ${packages.length === 1 ? 'a package' : `${packages.length} packages`} in node_modules but not in ${where}. Reasons they use: ${describe(validReasons) || 'none listed'}. Apple may not read package manifests from static CocoaPods, and emails missing reasons after upload.`,
        fix: project.expo.isExpo
          ? `Add { "NSPrivacyAccessedAPIType": "${category}", "NSPrivacyAccessedAPITypeReasons": ${JSON.stringify(suggested)} } to expo.ios.privacyManifests.NSPrivacyAccessedAPITypes. These are the packages' reasons; confirm each one matches how your app uses the API before you submit.`
          : `Add a ${category} entry with ${suggested.join(', ') || 'the matching reason codes'} to the app target's PrivacyInfo.xcprivacy. These are the packages' reasons; confirm each one matches how your app uses the API.`,
        source: SOURCES.expoApplePrivacy,
        file,
      });
      continue;
    }
    const have = declaredReasons.get(category) ?? new Set();
    const extra = new Map([...validReasons].filter(([reason]) => !have.has(reason)));
    if (extra.size > 0) {
      issues.push({
        severity: 'info',
        platform: 'ios',
        message: `${category} is declared in ${where}, but packages also use reasons it does not list: ${describe(extra)}.`,
        fix: `Add ${[...extra.keys()].join(', ')} to that entry if they describe how the app uses the API; Expo's guide says to copy package reasons into app config.`,
        source: SOURCES.expoApplePrivacy,
        file,
      });
    }
  }
  if (deps.unreadable.length > 0 || deps.skippedLinks > 0 || deps.truncated) {
    const parts = [];
    if (deps.unreadable.length > 0) parts.push(`${deps.unreadable.length} package privacy manifest(s) could not be read (${deps.unreadable.slice(0, 3).join(', ')})`);
    if (deps.skippedLinks > 0) parts.push(`${deps.skippedLinks} symlinked package(s) point outside the project and were not read`);
    if (deps.truncated) parts.push('node_modules is larger than the scan limit, so the scan stopped early');
    issues.push({
      severity: 'info',
      platform: 'ios',
      message: `Package privacy manifests were only partly compared: ${parts.join('; ')}.`,
      fix: 'Check those packages\' PrivacyInfo.xcprivacy files by hand, or run "npx expo prebuild" and read the merged manifest.',
      source: SOURCES.expoApplePrivacy,
    });
  }
  return issues;
}
