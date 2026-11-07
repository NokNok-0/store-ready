import * as accountDeletion from './account-deletion.js';
import * as androidPermissions from './android-permissions.js';
import * as androidTargetSdk from './android-target-sdk.js';
import * as appIcon from './app-icon.js';
import * as appIdentity from './app-identity.js';
import * as appLinks from './app-links.js';
import * as iosPrivacyManifest from './ios-privacy-manifest.js';
import * as iosPurposeStrings from './ios-purpose-strings.js';
import * as loginAppleEquivalent from './login-apple-equivalent.js';
import * as playClosedTesting from './play-closed-testing.js';
import * as privacyPolicyUrl from './privacy-policy-url.js';
import * as storeFiles from './store-files.js';
import * as storeListingLimits from './store-listing-limits.js';
import * as storeScreenshots from './store-screenshots.js';
import * as templateContent from './template-content.js';

/**
 * @typedef {{ id: string, title: string, source: string, run: (project: import('../project/load-project.js').Project) => Omit<import('../issue.js').Issue, 'id'>[] }} Check
 * @type {Check[]}
 */
export const CHECKS = [
  iosPurposeStrings,
  iosPrivacyManifest,
  androidTargetSdk,
  androidPermissions,
  appIdentity,
  appIcon,
  templateContent,
  accountDeletion,
  loginAppleEquivalent,
  privacyPolicyUrl,
  appLinks,
  storeListingLimits,
  storeScreenshots,
  storeFiles,
  playClosedTesting,
];
