import { SOURCES } from '../sources.js';
import { gradleMatches } from '../project/native-android.js';
import { configFileName, pluginOptions } from './expo-helpers.js';

export const id = 'android.target-sdk';
export const title = 'Android target API level';
export const source = SOURCES.playTargetSdk;

export const MIN_TARGET_SDK = 36;
export const EXPO_SDK_WITH_DEFAULT_36 = 58;

/**
 * @typedef {{ value: number, file: string, where: string }} TargetLiteral
 * @param {import('../project/load-project.js').Project} project
 * @returns {TargetLiteral[]}
 */
export function findTargetSdkLiterals(project) {
  /** @type {TargetLiteral[]} */
  const literals = [];
  if (project.expo.isExpo) {
    for (const options of pluginOptions(project.expo.config, 'expo-build-properties')) {
      const raw = options.android?.targetSdkVersion;
      const value = typeof raw === 'number' ? raw : typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : null;
      if (value !== null) literals.push({ value, file: configFileName(project), where: 'expo-build-properties android.targetSdkVersion' });
    }
  }
  const { android } = project;
  for (const { file, value } of gradleMatches(android, /\btargetSdk(?:Version)?\s*(?:=\s*|\s+)(\d+)\b/g)) {
    literals.push({ value: Number(value), file, where: file });
  }
  const property = android.gradleProperties ? /^\s*android\.targetSdkVersion\s*=\s*(\d+)\s*$/m.exec(android.gradleProperties.text) : null;
  if (property && android.gradleProperties) {
    literals.push({ value: Number(property[1]), file: android.gradleProperties.file, where: android.gradleProperties.file });
  } else {
    // Expo prebuild writes: targetSdkVersion = Integer.parseInt(findProperty('android.targetSdkVersion') ?: '35')
    const fallbacks = gradleMatches(android, /findProperty\(\s*['"]android\.targetSdkVersion['"]\s*\)\s*\?:\s*['"](\d+)['"]/g);
    for (const { file, value } of fallbacks) literals.push({ value: Number(value), file, where: `${file} (default when android.targetSdkVersion is not set)` });
  }
  return literals;
}

/** @param {string | undefined} version */
export function expoMajorVersion(version) {
  if (!version) return null;
  const match = /^[\s~^>=v]*(\d+)(?:\.|$|\s)/.exec(version);
  return match ? Number(match[1]) : null;
}

/** @param {import('../project/load-project.js').Project} project */
export function run(project) {
  if (!project.platforms.has('android')) return [];
  const literals = findTargetSdkLiterals(project);
  /** @type {Omit<import('../issue.js').Issue, 'id'>[]} */
  const issues = [];
  for (const literal of literals) {
    if (literal.value >= MIN_TARGET_SDK) continue;
    issues.push({
      severity: 'error',
      platform: 'android',
      message: `Target SDK is ${literal.value} in ${literal.where}. Since 2026-08-31, new apps and updates must target API ${MIN_TARGET_SDK} (Android 16); Wear OS and Automotive need 35, TV and XR 34.`,
      fix: literal.where.startsWith('expo-build-properties')
        ? `Set android.targetSdkVersion to ${MIN_TARGET_SDK} in the expo-build-properties plugin options, or remove it to use the Expo SDK default.`
        : `Set targetSdkVersion to ${MIN_TARGET_SDK} in ${literal.file}.`,
      source: SOURCES.playTargetSdk,
      file: literal.file,
    });
  }
  if (literals.length > 0) return issues;

  if (project.expo.isExpo) {
    const major = expoMajorVersion(project.dependencies.get('expo'));
    if (major !== null && major >= EXPO_SDK_WITH_DEFAULT_36) return issues;
    issues.push({
      severity: 'info',
      platform: 'android',
      message: major === null
        ? 'Could not tell the target SDK: no literal targetSdkVersion was found and the Expo SDK version in package.json is not a plain version.'
        : `Expo SDK ${major} is in use and no targetSdkVersion is set. The sources this tool uses confirm only that SDK ${EXPO_SDK_WITH_DEFAULT_36} defaults to target SDK ${MIN_TARGET_SDK}.`,
      fix: `Upgrade to Expo SDK ${EXPO_SDK_WITH_DEFAULT_36}, or set android.targetSdkVersion to ${MIN_TARGET_SDK} with the expo-build-properties plugin, and confirm it in the built AAB.`,
      source: major === null ? SOURCES.playTargetSdk : SOURCES.expoSdk58,
      file: 'package.json',
    });
    return issues;
  }
  issues.push({
    severity: 'info',
    platform: 'android',
    message: 'Could not find a literal targetSdkVersion in the Android build files, so the target SDK was not checked.',
    fix: `Confirm the app targets API ${MIN_TARGET_SDK} (for example in android/build.gradle or the version catalog).`,
    source: SOURCES.playTargetSdk,
    file: project.android.gradle[0]?.file,
  });
  return issues;
}
