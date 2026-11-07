import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as accountDeletion from '../../src/checks/account-deletion.js';
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

  for (const [label, code] of [
    ['deleteUser', 'await deleteUser(user);'],
    ['deleteAccount', 'await api.deleteAccountAsync();'],
    ['UI text', '<Button title="Delete my account" />'],
    ['user.delete()', 'await user.delete();'],
  ]) {
    it(`accepts a deletion path from ${label}`, () => {
      const issues = runCheck(accountDeletion, expoProject({}, {}, {
        'src/signup.tsx': 'createUserWithEmailAndPassword(auth, email, password)',
        'components/Settings.tsx': code,
      }));
      assert.deepEqual(issues, []);
    });
  }

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
  it('warns on both platforms when no URL is found', () => {
    const issues = runCheck(privacyPolicy, expoProject({}));
    assert.deepEqual(issues.map((issue) => issue.platform), ['ios', 'android']);
    assert.ok(issues.every((issue) => issue.severity === 'warning'));
  });

  it('finds privacyPolicyUrl in a listing file even without "privacy" in it', () => {
    const files = expoProject({}, {}, { 'store/listing.android.json': { title: 'A', privacyPolicyUrl: 'https://example.com/legal' } });
    assert.deepEqual(runCheck(privacyPolicy, files), []);
  });

  it('finds a URL in app config extra or in code', () => {
    assert.deepEqual(runCheck(privacyPolicy, expoProject({ extra: { links: { privacy: 'https://example.com/privacy-policy' } } })), []);
    assert.deepEqual(runCheck(privacyPolicy, expoProject({}, {}, { 'src/links.ts': "export const PRIVACY = 'https://example.com/privacy';" })), []);
  });

  it('does not count the word privacy without a URL', () => {
    assert.equal(runCheck(privacyPolicy, expoProject({}, {}, { 'src/a.ts': "const label = 'Privacy';" })).length, 2);
  });
});
