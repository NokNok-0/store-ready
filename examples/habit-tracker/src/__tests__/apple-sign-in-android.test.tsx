import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
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

it('does not show Sign in with Apple on Android', async () => {
  Platform.OS = 'android';
  await renderSignIn();

  expect(await screen.findByRole('button', { name: 'Sign in' })).toBeOnTheScreen();
  expect(screen.queryByText('Continue with Apple')).toBeNull();
});
