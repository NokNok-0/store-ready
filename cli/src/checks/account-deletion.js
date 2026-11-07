import { SOURCES } from '../sources.js';
import { SCAN_DIRS } from '../project/code-scan.js';

export const id = 'account.deletion';
export const title = 'Account deletion when users can sign up (heuristic)';
export const source = SOURCES.appleAccountDeletion;

/** Code or UI text that suggests users can create an account. */
export const SIGN_UP_INDICATORS = [
  { label: 'createUserWithEmailAndPassword (Firebase Auth)', pattern: /\bcreateUserWithEmailAndPassword\s*\(/ },
  { label: 'auth.signUp (Supabase and others)', pattern: /\bauth\.signUp\b/ },
  { label: 'signUp( call', pattern: /\bsignUp\s*\(/ },
  { label: 'signUp.create( (Clerk)', pattern: /\bsignUp\.create\s*\(/ },
  { label: 'useSignUp( hook (Clerk)', pattern: /\buseSignUp\s*\(/ },
  { label: '"Sign up" text', pattern: /['"`>]\s*sign[ -]?up\b/i },
  { label: '"Create account" text', pattern: /['"`>]\s*create\s+(?:an\s+|your\s+)?account\b/i },
];

/** Code or UI text that suggests users can delete their account. */
export const DELETION_INDICATORS = [
  { label: 'deleteUser', pattern: /\bdeleteUser\b/ },
  { label: 'deleteAccount / "Delete account"', pattern: /\bdelete[ _-]?(?:my[ _-]?|your[ _-]?)?account/i },
  { label: 'user.delete()', pattern: /\buser\.delete\s*\(/ },
  { label: '"account deletion"', pattern: /\baccount[ _-]?deletion\b/i },
];

/** @param {import('../project/load-project.js').Project} project */
export function findSignUp(project) {
  for (const indicator of SIGN_UP_INDICATORS) {
    const match = project.code.search(indicator.pattern);
    if (match) return { ...match, label: indicator.label };
  }
  return null;
}

/** @param {import('../project/load-project.js').Project} project */
export function run(project) {
  const signUp = findSignUp(project);
  if (!signUp) return [];
  if (DELETION_INDICATORS.some((indicator) => project.code.search(indicator.pattern))) return [];
  const message = `Sign-up code found (${signUp.label} in ${signUp.file}) but no account deletion path was detected in ${SCAN_DIRS.slice(0, 3).join('/, ')}/ and similar folders. This is a heuristic.`;
  /** @type {Omit<import('../issue.js').Issue, 'id'>[]} */
  const issues = [];
  if (project.platforms.has('ios')) {
    issues.push({
      severity: 'warning',
      platform: 'ios',
      message,
      fix: 'Let users start account deletion inside the app; deactivation alone is not enough. If deletion finishes on the web, link straight to that page. Apps using Sign in with Apple must revoke tokens through the REST API, and subscribers should be told Apple billing continues until they cancel.',
      source: SOURCES.appleAccountDeletion,
      file: signUp.file,
    });
  }
  if (project.platforms.has('android')) {
    issues.push({
      severity: 'warning',
      platform: 'android',
      message,
      fix: 'Offer deletion inside the app and a web link where users can request deletion without reinstalling, delete the associated data (disclose anything you keep), and declare it in the Data safety form.',
      source: SOURCES.playAccountDeletion,
      file: signUp.file,
    });
  }
  return issues;
}
