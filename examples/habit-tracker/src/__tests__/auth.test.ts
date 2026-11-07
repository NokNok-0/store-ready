import AsyncStorage from '@react-native-async-storage/async-storage';

import { getCurrentUser, signIn, signOut, signUp } from '@/auth';

jest.mock('expo-crypto', () => ({ randomUUID: () => 'mock-user-id' }));

beforeEach(async () => {
  await AsyncStorage.clear();
});

async function storedValues(): Promise<string> {
  const keys = await AsyncStorage.getAllKeys();
  const entries = await AsyncStorage.multiGet(keys);
  return entries.map(([, value]) => value ?? '').join('\n');
}

it('creates a mock session without storing the password', async () => {
  const user = await signUp(' Sam@Example.com ', 'correct horse');

  expect(user).toEqual({
    id: 'mock-user-id',
    email: 'sam@example.com',
    provider: 'email',
    createdAt: expect.any(String),
  });
  expect(await getCurrentUser()).toEqual(user);
  expect(await storedValues()).not.toContain('correct horse');
});

it('rejects invalid input', async () => {
  await expect(signUp('not-an-email', 'long enough')).rejects.toThrow('valid email');
  await expect(signUp('sam@example.com', 'short')).rejects.toThrow('at least 8');
});

it('signs back in to an existing mock account', async () => {
  await signUp('sam@example.com', 'correct horse');
  await signOut();
  expect(await getCurrentUser()).toBeNull();

  await expect(signIn('new@example.com', 'whatever123')).rejects.toThrow('No account');
  expect(await signIn('sam@example.com', 'any password')).toMatchObject({ email: 'sam@example.com' });
});
