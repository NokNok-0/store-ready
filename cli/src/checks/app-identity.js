import { SOURCES } from '../sources.js';
import { gradleMatches, MANIFEST_PATH } from '../project/native-android.js';
import { buildSettingValues, firstInfoPlistValue } from '../project/native-ios.js';
import { configFileName, nonEmptyString } from './expo-helpers.js';

export const id = 'app.identity';
export const title = 'Bundle identifier, package name and version';
export const source = SOURCES.expoSubmit;

/** @param {import('../project/load-project.js').Project} project */
function iosIdentity(project) {
  const config = project.expo.isExpo ? project.expo.config : {};
  const fromPbxproj = buildSettingValues(project.ios, 'PRODUCT_BUNDLE_IDENTIFIER').find((value) => !value.includes('$(') && !/Tests?$/.test(value));
  return {
    bundleId: nonEmptyString(config.ios?.bundleIdentifier) ?? nonEmptyString(firstInfoPlistValue(project.ios, 'CFBundleIdentifier')) ?? fromPbxproj ?? null,
    version: nonEmptyString(firstInfoPlistValue(project.ios, 'CFBundleShortVersionString')),
    build: nonEmptyString(config.ios?.buildNumber) ?? nonEmptyString(firstInfoPlistValue(project.ios, 'CFBundleVersion')),
  };
}

/** @param {import('../project/load-project.js').Project} project */
function androidIdentity(project) {
  const config = project.expo.isExpo ? project.expo.config : {};
  const appGradle = ['android/app/build.gradle', 'android/app/build.gradle.kts'];
  const applicationId = gradleMatches(project.android, /\bapplicationId\s*=?\s*["']([^"']+)["']/g, appGradle)[0]?.value;
  const versionName = gradleMatches(project.android, /\bversionName\s*=?\s*["']([^"']+)["']/g, appGradle)[0]?.value;
  const versionCode = gradleMatches(project.android, /\bversionCode\s*=?\s*(\d+)/g, appGradle)[0]?.value;
  return {
    packageName: nonEmptyString(config.android?.package) ?? applicationId ?? project.android.manifest?.packageName ?? null,
    version: versionName ?? null,
    build: config.android?.versionCode !== undefined ? String(config.android.versionCode) : versionCode ?? null,
  };
}

/** @param {import('../project/load-project.js').Project} project */
export function run(project) {
  /** @type {Omit<import('../issue.js').Issue, 'id'>[]} */
  const issues = [];
  const { expo } = project;
  if (expo.isExpo && !expo.complete) return issues;
  const file = configFileName(project);
  const expoVersion = expo.isExpo ? nonEmptyString(expo.config.version) ?? nonEmptyString(project.packageJson?.version) : null;

  if (project.platforms.has('ios')) {
    const ios = iosIdentity(project);
    if (!ios.bundleId) {
      issues.push({
        severity: 'error',
        platform: 'ios',
        message: 'No iOS bundle identifier found.',
        fix: expo.isExpo
          ? `Set expo.ios.bundleIdentifier in ${file} to a reverse-DNS ID you own, for example "com.yourcompany.yourapp".`
          : 'Set PRODUCT_BUNDLE_IDENTIFIER for the app target in Xcode.',
        source: SOURCES.expoSubmit,
        file: expo.isExpo ? file : project.ios.infoPlists[0]?.file,
      });
    }
    if (!expo.isExpo && !ios.version) {
      issues.push({
        severity: 'error',
        platform: 'ios',
        message: 'No iOS version (CFBundleShortVersionString or MARKETING_VERSION) found.',
        fix: 'Set the version (MARKETING_VERSION) for the app target in Xcode.',
        source: SOURCES.expoSubmit,
        file: project.ios.infoPlists[0]?.file,
      });
    }
    if (!ios.build) {
      issues.push({
        severity: 'info',
        platform: 'ios',
        message: 'No iOS build number is set in the project. Every upload needs a new build number.',
        fix: expo.isExpo
          ? `Set expo.ios.buildNumber in ${file} (or let your build service manage it) and raise it for each upload.`
          : 'Set CURRENT_PROJECT_VERSION for the app target and raise it for each upload.',
        source: SOURCES.expoSubmit,
        file: expo.isExpo ? file : project.ios.infoPlists[0]?.file,
      });
    }
  }

  if (project.platforms.has('android')) {
    const android = androidIdentity(project);
    if (!android.packageName) {
      issues.push({
        severity: 'error',
        platform: 'android',
        message: 'No Android package name (applicationId) found.',
        fix: expo.isExpo
          ? `Set expo.android.package in ${file} to a reverse-DNS ID you own, for example "com.yourcompany.yourapp".`
          : 'Set applicationId in android/app/build.gradle.',
        source: SOURCES.expoSubmit,
        file: expo.isExpo ? file : project.android.gradle[0]?.file ?? MANIFEST_PATH,
      });
    }
    if (!expo.isExpo && !android.version) {
      issues.push({
        severity: 'error',
        platform: 'android',
        message: 'No Android versionName found in android/app/build.gradle.',
        fix: 'Set versionName in the defaultConfig block of android/app/build.gradle.',
        source: SOURCES.expoSubmit,
        file: project.android.gradle[0]?.file,
      });
    }
    if (!android.build) {
      issues.push({
        severity: 'info',
        platform: 'android',
        message: 'No Android versionCode is set in the project. Every upload needs a new versionCode.',
        fix: expo.isExpo
          ? `Set expo.android.versionCode in ${file} (or let your build service manage it) and raise it for each upload.`
          : 'Set versionCode in android/app/build.gradle and raise it for each upload.',
        source: SOURCES.expoSubmit,
        file: expo.isExpo ? file : project.android.gradle[0]?.file,
      });
    }
  }

  if (expo.isExpo && !expoVersion) {
    issues.push({
      severity: 'warning',
      platform: 'both',
      message: 'No app version is set (expo.version or the version in package.json), so the store version falls back to whatever default the build tools pick.',
      fix: `Set expo.version in ${file}, for example "1.0.0", and raise it for each store release.`,
      source: SOURCES.expoSubmit,
      file,
    });
  }
  return issues;
}
