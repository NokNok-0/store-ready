import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import RootLayout from '@/app/_layout';
import AboutScreen from '@/app/about';
import DeleteAccountScreen from '@/app/delete-account';
import HabitDetailScreen from '@/app/habit/[id]';
import HabitsScreen from '@/app/index';
import SettingsScreen from '@/app/settings';
import SignInScreen from '@/app/sign-in';
import SignUpScreen from '@/app/sign-up';
import { confirm } from '@/confirm';

jest.mock('@/confirm', () => ({ confirm: jest.fn() }));
jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => ({ exists: false, delete: jest.fn() })),
}));

const confirmMock = jest.mocked(confirm);

const routes = {
  _layout: RootLayout,
  index: HabitsScreen,
  'habit/[id]': HabitDetailScreen,
  settings: SettingsScreen,
  about: AboutScreen,
  'delete-account': DeleteAccountScreen,
  'sign-in': SignInScreen,
  'sign-up': SignUpScreen,
};

const user = {
  id: 'user-1',
  email: 'reviewer@storeready.dev',
  provider: 'email',
  createdAt: '2026-11-01T08:00:00.000Z',
};

beforeEach(async () => {
  jest.restoreAllMocks();
  confirmMock.mockReset();
  await AsyncStorage.clear();
  await AsyncStorage.multiSet([
    ['streaks:mock-users', JSON.stringify([user])],
    ['streaks:mock-session', user.id],
    [
      'streaks:habits:user-1',
      JSON.stringify([{ id: 'h1', name: 'Read 10 pages', createdAt: user.createdAt, completions: [] }]),
    ],
  ]);
});

it('opens deletion from settings, confirms, deletes local data and returns to sign-in', async () => {
  confirmMock.mockResolvedValue(true);
  await renderRouter(routes, { initialUrl: '/settings' });

  await fireEvent.press(await screen.findByText('Delete account'));
  expect(await screen.findByText(/every\s+habit, its check-in history/)).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Delete account' }));

  expect(await screen.findByText('Your account and its data were deleted.')).toBeOnTheScreen();
  expect(confirmMock).toHaveBeenCalledTimes(1);
  expect(await AsyncStorage.getItem('streaks:mock-session')).toBeNull();
  expect(await AsyncStorage.getItem('streaks:habits:user-1')).toBeNull();
  expect(await AsyncStorage.getItem('streaks:mock-users')).toBe('[]');
});

it('keeps the account when the user cancels', async () => {
  confirmMock.mockResolvedValue(false);
  await renderRouter(routes, { initialUrl: '/delete-account' });

  await fireEvent.press(await screen.findByRole('button', { name: 'Delete account' }));

  expect(confirmMock).toHaveBeenCalledTimes(1);
  expect(await AsyncStorage.getItem('streaks:mock-session')).toBe(user.id);
  expect(screen.queryByText('Your account and its data were deleted.')).toBeNull();
});

it('stays signed in and shows an error when deletion fails', async () => {
  confirmMock.mockResolvedValue(true);
  await renderRouter(routes, { initialUrl: '/delete-account' });
  jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValueOnce(new Error('disk full'));

  await fireEvent.press(await screen.findByRole('button', { name: 'Delete account' }));

  expect(await screen.findByText(/could not be deleted\. You are still signed in/)).toBeOnTheScreen();
  expect(await AsyncStorage.getItem('streaks:mock-session')).toBe(user.id);
  expect(screen.queryByText('Your account and its data were deleted.')).toBeNull();
});
