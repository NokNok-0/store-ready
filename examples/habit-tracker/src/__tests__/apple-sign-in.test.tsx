import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Platform } from 'react-native';

import SignInScreen from '@/app/sign-in';
import { SessionProvider } from '@/session';

const mockSignInAsync = jest.fn();

jest.mock('expo-crypto', () => ({ randomUUID: () => 'mock-user-id' }));

jest.mock('expo-apple-authentication', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    isAvailableAsync: () => Promise.resolve(true),
    signInAsync: (...args: unknown[]) => mockSignInAsync(...args),
    AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
    AppleAuthenticationButtonType: { CONTINUE: 1 },
    AppleAuthenticationButtonStyle: { WHITE: 0, BLACK: 2 },
    AppleAuthenticationButton: ({ onPress }: { onPress: () => void }) => (
      <Pressable accessibilityRole="button" onPress={onPress}>
        <Text>Continue with Apple</Text>
      </Pressable>
    ),
  };
});

const originalOS = Platform.OS;

beforeEach(async () => {
  await AsyncStorage.clear();
  mockSignInAsync.mockReset();
});

afterEach(() => {
  Platform.OS = originalOS;
});

function TestLayout() {
  return (
    <SessionProvider>
      <Stack />
    </SessionProvider>
  );
}

function renderSignIn() {
  return renderRouter({ _layout: TestLayout, index: SignInScreen });
}

it('signs in with Apple on iOS and keeps no Apple tokens', async () => {
  Platform.OS = 'ios';
  mockSignInAsync.mockResolvedValue({
    user: 'apple-001',
    email: null,
    fullName: null,
    identityToken: 'identity-token',
    authorizationCode: 'authorization-code',
  });
  await renderSignIn();

  await fireEvent.press(await screen.findByText('Continue with Apple'));

  expect(mockSignInAsync).toHaveBeenCalledWith({ requestedScopes: [1] });
  await waitFor(async () => expect(await AsyncStorage.getItem('streaks:mock-session')).not.toBeNull());
  const stored = (await AsyncStorage.multiGet(await AsyncStorage.getAllKeys()))
    .map(([, value]) => value ?? '')
    .join('\n');
  expect(stored).toContain('apple-001');
  expect(stored).not.toContain('identity-token');
  expect(stored).not.toContain('authorization-code');
});

it('shows no error when the user cancels the Apple sheet', async () => {
  Platform.OS = 'ios';
  mockSignInAsync.mockRejectedValue(Object.assign(new Error('canceled'), { code: 'ERR_REQUEST_CANCELED' }));
  await renderSignIn();

  await fireEvent.press(await screen.findByText('Continue with Apple'));

  expect(screen.queryByText('Something went wrong. Try again.')).toBeNull();
  expect(await AsyncStorage.getItem('streaks:mock-session')).toBeNull();
});
