import AsyncStorage from '@react-native-async-storage/async-storage';

import { deleteAccount } from '@/account';
import { getCurrentUser, signIn, signInWithApple, signUp } from '@/auth';
import { saveHabits } from '@/habit-store';

const mockDeleteFile = jest.fn();
const mockExistingFiles = new Set<string>();

jest.mock('expo-crypto', () => {
  let count = 0;
  return { randomUUID: () => `mock-user-${++count}` };
});

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation((uri: string) => ({
    exists: mockExistingFiles.has(uri),
    delete: () => mockDeleteFile(uri),
  })),
}));

beforeEach(async () => {
  await AsyncStorage.clear();
  mockDeleteFile.mockClear();
  mockExistingFiles.clear();
});

it('deletes the signed-in mock profile, its habits and photos, and signs out', async () => {
  const other = await signUp('other@example.com', 'correct horse');
  await saveHabits(other.id, [
    { id: 'h0', name: 'Stretch', createdAt: '2026-11-01T08:00:00.000Z', completions: [] },
  ]);
  const user = await signUp('sam@example.com', 'correct horse');
  const photo = 'file:///cache/ImagePicker/run.jpg';
  mockExistingFiles.add(photo);
  await saveHabits(user.id, [
    {
      id: 'h1',
      name: 'Run',
      createdAt: '2026-11-01T08:00:00.000Z',
      completions: ['2026-11-06', '2026-11-07'],
      photoUri: photo,
    },
    { id: 'h2', name: 'Read', createdAt: '2026-11-01T08:00:00.000Z', completions: [] },
  ]);

  await deleteAccount();

  expect(await getCurrentUser()).toBeNull();
  expect(await AsyncStorage.getItem(`streaks:habits:${user.id}`)).toBeNull();
  expect(mockDeleteFile).toHaveBeenCalledWith(photo);
  const stored = (await AsyncStorage.multiGet(await AsyncStorage.getAllKeys()))
    .map(([, value]) => value ?? '')
    .join('\n');
  expect(stored).not.toContain('sam@example.com');
  expect(stored).not.toContain('Run');
  expect(await AsyncStorage.getItem(`streaks:habits:${other.id}`)).toContain('Stretch');
});

it('does not restore the deleted account on the next sign-in', async () => {
  await signUp('sam@example.com', 'correct horse');
  await deleteAccount();

  await expect(signIn('sam@example.com', 'correct horse')).rejects.toThrow('No account');
});

it('deletes a Sign in with Apple account so the next Apple sign-in starts fresh', async () => {
  const first = await signInWithApple({ user: 'apple-001', email: 'sam@privaterelay.appleid.com' });
  await deleteAccount();

  const second = await signInWithApple({ user: 'apple-001', email: null });

  expect(second.id).not.toBe(first.id);
  expect(second).toMatchObject({ provider: 'apple', email: '' });
});

it('refuses to delete when nobody is signed in', async () => {
  await expect(deleteAccount()).rejects.toThrow('Sign in again');
});
