import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as accountDeletion from '../../src/checks/account-deletion.js';
import * as appLinks from '../../src/checks/app-links.js';
import * as loginApple from '../../src/checks/login-apple-equivalent.js';
import * as privacyPolicy from '../../src/checks/privacy-policy-url.js';
import { expoProject, runCheck } from '../helpers/project.js';

describe('account.deletion', () => {
  it('warns on both platforms when sign-up exists without deletion', () => {
    const issues = runCheck(accountDeletion, expoProject({}, {}, { 'src/auth.ts': 'await supabase.auth.signUp({ email, password });' }));
    assert.deepEqual(issues.map((issue) => [issue.severity, issue.platform]), [['warning', 'ios'], ['warning', 'android']]);
    assert.equal(issues[0].file, 'src/auth.ts');
    assert.match(issues[0].source, /5-1-1-account-deletion$/);
    assert.match(issues[1].source, /13327111$/);
  });

  for (const [label, code] of [
    ['Firebase', 'createUserWithEmailAndPassword(auth, email, password)'],
    ['Clerk hook', 'const { signUp } = useSignUp();'],
    ['UI text', '<Text>Create an account</Text>'],
    ['button title', '<Button title="Sign Up" />'],
  ]) {
    it(`detects sign-up from ${label}`, () => {
      assert.equal(runCheck(accountDeletion, expoProject({}, {}, { 'app/(auth)/register.tsx': code })).length, 2);
    });
  }

  for (const [label, file, code] of [
    ['button text', 'components/Settings.tsx', '<Button title="Delete my account" />'],
    ['JSX text', 'components/Settings.tsx', '<Text>Delete account</Text>'],
    ['a string in a .js file', 'components/settings.js', "const label = 'Delete your account';"],
    ['an Expo Router route', 'app/delete-account.tsx', 'export default function Screen() { return null; }'],
    ['a src/app route folder', 'src/app/(settings)/account-deletion/index.tsx', 'export default function Screen() { return null; }'],
    ['a camelCase route', 'app/deleteAccount.tsx', 'export default function Screen() { return null; }'],
  ]) {
    it(`accepts reachable deletion UI from ${label}`, () => {
      const issues = runCheck(accountDeletion, expoProject({}, {}, {
        'src/signup.tsx': 'createUserWithEmailAndPassword(auth, email, password)',
        [file]: code,
      }));
      assert.deepEqual(issues, []);
    });
  }

  for (const [label, code, named] of [
    ['deleteAccount()', 'export const deleteAccount = async () => { await api.deleteAccountAsync(); };', 'deleteAccount()'],
    ['deleteUser', 'await deleteUser(user);', 'deleteUser()'],
    ['user.delete()', 'await user.delete();', 'user.delete()'],
  ]) {
    it(`does not count ${label} without a screen or button`, () => {
      const issues = runCheck(accountDeletion, expoProject({}, {}, {
        'src/signup.tsx': 'createUserWithEmailAndPassword(auth, email, password)',
        'src/session.tsx': code,
      }));
      assert.equal(issues.length, 2);
      assert.ok(issues[0].message.includes(`${named} in src/session.tsx but no screen or button`), issues[0].message);
    });
  }

  it('does not count deletion text in a .ts file or a route href alone', () => {
    const issues = runCheck(accountDeletion, expoProject({}, {}, {
      'src/signup.tsx': '<Button title="Sign up" />',
      'src/strings.ts': "export const DELETE = 'Delete account';",
      'src/settings.tsx': "router.push('/delete-account')",
    }));
    assert.equal(issues.length, 2);
  });

  it('reports the matched sign-up text and file, without guessing the provider', () => {
    const issues = runCheck(accountDeletion, expoProject({}, {}, {
      'src/session.tsx': 'import * as auth from "./auth";\nconst value = {\n  signUp: async (email, password) => start(await auth.signUp(email, password)),\n};',
    }));
    assert.match(issues[0].message, /^Sign-up found \("auth\.signUp" in src\/session\.tsx:3\)/);
    assert.doesNotMatch(issues[0].message, /Supabase|Firebase|Clerk/);
  });

  it('ignores node_modules, tests and apps without sign-up', () => {
    assert.deepEqual(runCheck(accountDeletion, expoProject({}, {}, { 'src/home.tsx': '<Text>Welcome</Text>' })), []);
    assert.deepEqual(runCheck(accountDeletion, expoProject({}, {}, {
      'src/node_modules/lib/index.js': 'auth.signUp()',
      'src/__tests__/signup.tsx': 'auth.signUp()',
      'src/signup.test.ts': 'auth.signUp()',
    })), []);
  });
});

describe('login.apple-equivalent', () => {
  it('warns when Google sign-in is used without Sign in with Apple', () => {
    const issues = runCheck(loginApple, expoProject({}, { '@react-native-google-signin/google-signin': '16' }));
    assert.equal(issues.length, 1);
    assert.equal(issues[0].platform, 'ios');
    assert.match(issues[0].fix, /4\.8/);
    assert.match(issues[0].fix, /Exceptions/);
  });

  it('detects OAuth providers in code', () => {
    const issues = runCheck(loginApple, expoProject({}, {}, { 'src/login.ts': "supabase.auth.signInWithOAuth({ provider: 'github' })" }));
    assert.equal(issues[0].file, 'src/login.ts');
  });

  for (const [label, code] of [
    ['a custom sign-in function', 'export async function signInWithGoogle() {}'],
    ['button text', '<Button label="Continue with Google" />'],
    ['JSX text', '<Text>Sign in with Facebook</Text>'],
  ]) {
    it(`detects third-party login from ${label}`, () => {
      assert.equal(runCheck(loginApple, expoProject({}, {}, { 'src/components/social.tsx': code })).length, 1);
    });
  }

  it('does not treat Sign in with Apple text as third-party login', () => {
    assert.deepEqual(runCheck(loginApple, expoProject({}, {}, { 'src/login.tsx': '<Button label="Sign in with Apple" />' })), []);
  });

  it('accepts a custom Apple sign-in function next to Google', () => {
    const code = 'signInWithGoogle(); signInWithApple();';
    assert.deepEqual(runCheck(loginApple, expoProject({}, {}, { 'src/login.ts': code })), []);
  });

  it('passes when an Apple login is present', () => {
    assert.deepEqual(runCheck(loginApple, expoProject({}, { 'react-native-fbsdk-next': '13', 'expo-apple-authentication': '1' })), []);
    assert.deepEqual(runCheck(loginApple, expoProject({}, {}, { 'src/login.ts': "signInWithOAuth({ provider: 'google' }); signInWithOAuth({ provider: 'apple' });" })), []);
  });

  it('passes with no third-party login and skips Android-only apps', () => {
    assert.deepEqual(runCheck(loginApple, expoProject({})), []);
    assert.deepEqual(runCheck(loginApple, expoProject({ platforms: ['android'] }, { '@react-native-google-signin/google-signin': '16' })), []);
  });
});

describe('privacy.policy-url', () => {
  it('reports a found URL as info that says it was not verified', () => {
    const issues = runCheck(privacyPolicy, expoProject({ extra: { privacyPolicyUrl: 'https://streaks.app/privacy' } }));
    assert.equal(issues.length, 1);
    assert.equal(issues[0].severity, 'info');
    assert.equal(issues[0].platform, 'both');
    assert.match(issues[0].message, /^Privacy policy URL found: https:\/\/streaks\.app\/privacy\. Not verified: open it and confirm it loads\. Found in: app\.json \(extra\.privacyPolicyUrl\)\.$/);
    assert.doesNotMatch(issues[0].message, /Google Play requires/);
  });

  it('lists every place a URL appears, once per distinct URL', () => {
    const issues = runCheck(privacyPolicy, expoProject({ extra: { privacyPolicyUrl: 'https://a.dev/privacy' } }, {}, {
      'store/listing.ios.json': { name: 'A', privacyPolicyUrl: 'https://a.dev/privacy' },
      'src/links.ts': "export const P = 'https://a.dev/privacy'; export const Q = 'https://b.dev/privacy-policy';",
    }));
    assert.equal(issues.length, 2);
    assert.match(issues[0].message, /Found in: store\/listing\.ios\.json, app\.json \(extra\.privacyPolicyUrl\), src\/links\.ts\./);
    assert.match(issues[1].message, /b\.dev\/privacy-policy/);
  });

  it('warns on both platforms when no URL is found', () => {
    const issues = runCheck(privacyPolicy, expoProject({}));
    assert.deepEqual(issues.map((issue) => issue.platform), ['ios', 'android']);
    assert.ok(issues.every((issue) => issue.severity === 'warning'));
  });

  it('finds privacyPolicyUrl in a listing file even without "privacy" in it', () => {
    const files = expoProject({}, {}, { 'store/listing.android.json': { title: 'A', privacyPolicyUrl: 'https://example.com/legal' } });
    assert.deepEqual(runCheck(privacyPolicy, files).map((issue) => issue.severity), ['info']);
  });

  it('finds a URL in app config extra or in code', () => {
    assert.deepEqual(runCheck(privacyPolicy, expoProject({ extra: { links: { privacy: 'https://example.com/privacy-policy' } } })).map((issue) => issue.severity), ['info']);
    assert.deepEqual(runCheck(privacyPolicy, expoProject({}, {}, { 'src/links.ts': "export const PRIVACY = 'https://example.com/privacy';" })).map((issue) => issue.severity), ['info']);
  });

  it('does not count the word privacy without a URL', () => {
    assert.equal(runCheck(privacyPolicy, expoProject({}, {}, { 'src/a.ts': "const label = 'Privacy';" })).length, 2);
  });
});

describe('app.links', () => {
  it('reports support and deletion URLs from app config extra as found, not verified', () => {
    const issues = runCheck(appLinks, expoProject({ extra: { supportUrl: 'https://a.dev/help', deleteAccountUrl: 'https://a.dev/delete', links: { account_deletion_url: 'https://a.dev/delete-2' } } }));
    assert.deepEqual(issues.map((issue) => issue.severity), ['info', 'info', 'info']);
    assert.ok(issues[0].message.startsWith('Support URL found: https://a.dev/help. Not verified: open it and confirm it loads.'), issues[0].message);
    assert.doesNotMatch(issues[0].message, /Google Play/);
    assert.ok(issues[1].message.startsWith('Account deletion URL found: https://a.dev/delete. Not verified: open it and confirm it loads (Google Play requires the web deletion link to load without error).'), issues[1].message);
    assert.ok(issues[1].source.endsWith('13327111'));
    assert.ok(issues[2].message.includes('extra.links.account_deletion_url'));
  });

  it('uses the Apple source and no Play quote for iOS-only apps', () => {
    const [issue] = runCheck(appLinks, expoProject({ platforms: ['ios'], extra: { accountDeletionUrl: 'https://a.dev/delete' } }));
    assert.equal(issue.platform, 'ios');
    assert.ok(issue.source.endsWith('5-1-1-account-deletion'));
    assert.doesNotMatch(issue.message, /Google Play/);
  });

  it('ignores non-URL values and reports nothing without links', () => {
    assert.deepEqual(runCheck(appLinks, expoProject({ extra: { supportUrl: 'mailto:help@a.dev', deleteAccount: true } })), []);
    assert.deepEqual(runCheck(appLinks, expoProject({})), []);
  });
});
