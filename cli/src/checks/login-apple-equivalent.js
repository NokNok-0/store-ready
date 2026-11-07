import { SOURCES } from '../sources.js';

export const id = 'login.apple-equivalent';
export const title = 'Equivalent login option next to third-party login (heuristic)';
export const source = SOURCES.appleGuidelines;

export const THIRD_PARTY_LOGIN_PACKAGES = [
  '@react-native-google-signin/google-signin',
  'react-native-fbsdk-next',
];

export const THIRD_PARTY_LOGIN_CODE = [
  { label: 'expo-auth-session Google/Facebook provider', pattern: /expo-auth-session\/providers\/(?:google|facebook)/ },
  { label: 'GoogleAuthProvider', pattern: /\bGoogleAuthProvider\b/ },
  { label: 'FacebookAuthProvider', pattern: /\bFacebookAuthProvider\b/ },
  { label: 'GoogleSignin', pattern: /\bGoogleSignin\b/ },
  { label: 'OAuth provider option', pattern: /\bprovider\s*:\s*['"](?:google|facebook|github|twitter|discord|linkedin|linkedin_oidc)['"]/ },
  { label: 'Clerk OAuth strategy', pattern: /['"]oauth_(?:google|facebook|github|twitter|discord|linkedin|linkedin_oidc)['"]/ },
  { label: 'sign-in function for a third-party provider', pattern: /\bsignInWith(?:Google|Facebook|GitHub|Github|Twitter|Discord|LinkedIn|Microsoft)\b/ },
  { label: 'third-party sign-in button text', pattern: /['"`>]\s*(?:Continue|Sign in|Log in|Login|Sign up) with (?:Google|Facebook|GitHub|Twitter|X|Discord|LinkedIn|Microsoft)\b/i },
];

export const APPLE_LOGIN_PACKAGES = ['expo-apple-authentication', '@invertase/react-native-apple-authentication'];

export const APPLE_LOGIN_CODE = [
  /\bAppleAuthentication\b/,
  /\bappleAuth\b/,
  /\bprovider\s*:\s*['"]apple['"]/,
  /['"]apple\.com['"]/,
  /['"]oauth_apple['"]/,
  /\bsignInWithApple\b/,
];

/** @param {import('../project/load-project.js').Project} project */
export function findThirdPartyLogin(project) {
  const pkg = THIRD_PARTY_LOGIN_PACKAGES.find((name) => project.hasDependency(name));
  if (pkg) return { label: pkg, file: 'package.json' };
  for (const indicator of THIRD_PARTY_LOGIN_CODE) {
    const match = project.code.search(indicator.pattern);
    if (match) return { label: indicator.label, file: match.file };
  }
  return null;
}

/** @param {import('../project/load-project.js').Project} project */
export function run(project) {
  if (!project.platforms.has('ios')) return [];
  const thirdParty = findThirdPartyLogin(project);
  if (!thirdParty) return [];
  const hasApple = APPLE_LOGIN_PACKAGES.some((name) => project.hasDependency(name)) || APPLE_LOGIN_CODE.some((pattern) => project.code.search(pattern));
  if (hasApple) return [];
  return [{
    severity: /** @type {const} */ ('warning'),
    platform: /** @type {const} */ ('ios'),
    message: `Third-party login found (${thirdParty.label} in ${thirdParty.file}) but no Sign in with Apple or other equivalent login was detected. This is a heuristic.`,
    fix: 'Guideline 4.8: also offer a login that limits data to name and email, lets users hide their email, and does no ad tracking without consent; Sign in with Apple qualifies (for example expo-apple-authentication). Exceptions: accounts only for your own company, education or enterprise apps, government ID logins, and clients for a specific third-party service.',
    source: SOURCES.appleGuidelines,
    file: thirdParty.file,
  }];
}
