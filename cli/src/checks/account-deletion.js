import path from 'node:path';
import { SOURCES } from '../sources.js';
import { SCAN_DIRS } from '../project/code-scan.js';
import { truncate } from './expo-helpers.js';

export const id = 'account.deletion';
export const title = 'In-app account deletion users can reach, when users can sign up (heuristic)';
export const source = SOURCES.appleAccountDeletion;

/** Code or UI text that suggests users can create an account. */
export const SIGN_UP_INDICATORS = [
  { label: 'createUserWithEmailAndPassword(', pattern: /\bcreateUserWithEmailAndPassword\s*\(/ },
  { label: 'auth.signUp', pattern: /\bauth\.signUp\b/ },
  { label: 'signUp(', pattern: /\bsignUp\s*\(/ },
  { label: 'signUp.create(', pattern: /\bsignUp\.create\s*\(/ },
  { label: 'useSignUp(', pattern: /\buseSignUp\s*\(/ },
  { label: '"Sign up" text', pattern: /['"`>]\s*sign[ -]?up\b/i },
  { label: '"Create account" text', pattern: /['"`>]\s*create\s+(?:an\s+|your\s+)?account\b/i },
];

/**
 * User-visible deletion UI: a string literal or JSX text that starts with one of these phrases.
 * Only this, or a deletion route file, counts as a reachable deletion path.
 */
export const DELETION_UI_TEXT = [
  /['"`>]\s*delete\s+(?:my\s+|your\s+|this\s+)?account\b/i,
  /['"`>]\s*request\s+account\s+deletion\b/i,
];

/** Route files (Expo Router and similar) whose name says they are the deletion screen. */
export const DELETION_ROUTE_NAME = /^(?:delete[-_]?account|account[-_]?deletion|delete[-_]?my[-_]?account)$/i;
export const ROUTE_DIRS = ['app', 'src/app'];

/** Deletion code that is not, by itself, something a user can reach. Named in the message only. */
export const DELETION_CODE = [
  { label: 'deleteAccount', pattern: /\bdeleteAccount(?:Async)?\b/ },
  { label: 'deleteUser', pattern: /\bdeleteUser\b/ },
  { label: 'user.delete()', pattern: /\buser\.delete\s*\(/ },
];

const UI_FILE = /\.(?:jsx|tsx|js)$/;
const NAVIGATOR_SCREEN = /<\w+\.Screen\b|\bcreate\w*Navigator\b/;
const ROUTE_FILE = /\.(?:jsx|tsx|js|ts)$/;

/** @param {import('../project/load-project.js').Project} project */
export function findSignUp(project) {
  for (const indicator of SIGN_UP_INDICATORS) {
    const match = project.code.search(indicator.pattern);
    if (match) return { ...match, label: indicator.label };
  }
  return null;
}

/**
 * @param {import('../project/load-project.js').Project} project
 * @returns {{ file: string, how: string } | null}
 */
export function findDeletionUi(project) {
  for (const { file } of project.code.files()) {
    if (!ROUTE_DIRS.some((dir) => file.startsWith(`${dir}/`)) || !ROUTE_FILE.test(file)) continue;
    const segments = file.replace(ROUTE_FILE, '').split('/');
    const name = segments.at(-1) === 'index' ? segments.at(-2) : segments.at(-1);
    if (name && DELETION_ROUTE_NAME.test(name.replace(/^\(|\)$/g, ''))) return { file, how: `route ${file}` };
  }
  for (const { file, text } of project.code.files()) {
    if (!UI_FILE.test(path.basename(file))) continue;
    for (const pattern of DELETION_UI_TEXT) {
      for (const match of text.matchAll(new RegExp(pattern.source, `${pattern.flags}g`))) {
        // A navigator's header title (<Stack.Screen name="delete-account" options={{ title: 'Delete account' }} />)
        // names a screen; it is not a way to reach it, and the route may not exist.
        const lineStart = text.lastIndexOf('\n', match.index) + 1;
        const lineEnd = text.indexOf('\n', match.index);
        if (NAVIGATOR_SCREEN.test(text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd))) continue;
        return { file, how: `text ${JSON.stringify(match[0].replace(/^['"`>]\s*/, ''))} in ${file}` };
      }
    }
  }
  return null;
}

/** @param {{ match: string }} match */
const quote = (match) => JSON.stringify(truncate(match.match.replace(/^['"`>]\s*/, '').replace(/\s+/g, ' ').trim(), 40));

/** @param {import('../project/load-project.js').Project} project */
export function run(project) {
  const signUp = findSignUp(project);
  if (!signUp) return [];
  if (findDeletionUi(project)) return [];
  const code = DELETION_CODE.map((indicator) => ({ indicator, match: project.code.search(indicator.pattern) })).find((entry) => entry.match);
  const found = `Sign-up found (${quote(signUp)} in ${signUp.file}:${signUp.line})`;
  const missing = code?.match
    ? `${code.indicator.label}${code.indicator.label.endsWith(')') ? '' : '()'} in ${code.match.file} but no screen or button: no "Delete account" text in a .js/.jsx/.tsx file and no delete-account route in ${ROUTE_DIRS.join('/ or ')}/`
    : `no "Delete account" text or delete-account route was found in ${SCAN_DIRS.slice(0, 3).join('/, ')}/ and similar folders`;
  const message = `${found}, ${missing}. This is a heuristic.`;
  /** @type {Omit<import('../issue.js').Issue, 'id'>[]} */
  const issues = [];
  if (project.platforms.has('ios')) {
    issues.push({
      severity: 'warning',
      platform: 'ios',
      message,
      fix: 'Let users start account deletion inside the app, from a screen or button they can find (for example Settings > Delete account); deactivation alone is not enough. If deletion finishes on the web, link straight to that page. Apps using Sign in with Apple must revoke tokens through the REST API, and subscribers should be told Apple billing continues until they cancel.',
      source: SOURCES.appleAccountDeletion,
      file: signUp.file,
    });
  }
  if (project.platforms.has('android')) {
    issues.push({
      severity: 'warning',
      platform: 'android',
      message,
      fix: 'Offer deletion inside the app (a screen or button users can find) and a web link where users can request deletion without reinstalling, delete the associated data (disclose anything you keep), and declare it in the Data safety form.',
      source: SOURCES.playAccountDeletion,
      file: signUp.file,
    });
  }
  return issues;
}
