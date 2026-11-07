import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';

export type AuthProvider = 'email' | 'apple';

export type User = {
  id: string;
  email: string;
  provider: AuthProvider;
  createdAt: string;
  appleUserId?: string;
};

export type AppleCredential = {
  user: string;
  email: string | null;
};

export class AuthError extends Error {}

const MOCK_USERS_KEY = 'streaks:mock-users';
const MOCK_SESSION_KEY = 'streaks:mock-session';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

async function readMockUsers(): Promise<User[]> {
  const raw = await AsyncStorage.getItem(MOCK_USERS_KEY);
  return raw ? (JSON.parse(raw) as User[]) : [];
}

async function findMockUser(email: string): Promise<User | undefined> {
  return (await readMockUsers()).find((user) => user.email === email);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function assertValidInput(email: string, password: string): void {
  if (!EMAIL_PATTERN.test(normalizeEmail(email))) {
    throw new AuthError('Enter a valid email address.');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new AuthError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
}

async function startMockSession(user: User): Promise<User> {
  await AsyncStorage.setItem(MOCK_SESSION_KEY, user.id);
  return user;
}

async function writeMockUsers(users: User[]): Promise<void> {
  await AsyncStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
}

export async function createMockSession(
  email: string,
  provider: AuthProvider,
  appleUserId?: string,
): Promise<User> {
  const user: User = {
    id: randomUUID(),
    email: normalizeEmail(email),
    provider,
    createdAt: new Date().toISOString(),
    ...(appleUserId ? { appleUserId } : {}),
  };
  await writeMockUsers([...(await readMockUsers()), user]);
  return startMockSession(user);
}

export async function signUp(email: string, password: string): Promise<User> {
  assertValidInput(email, password);
  if (await findMockUser(normalizeEmail(email))) {
    throw new AuthError('An account with this email already exists.');
  }
  return createMockSession(email, 'email');
}

export async function signIn(email: string, password: string): Promise<User> {
  assertValidInput(email, password);
  const user = await findMockUser(normalizeEmail(email));
  if (!user) {
    throw new AuthError('No account found for this email.');
  }
  return startMockSession(user);
}

export async function signInWithApple(credential: AppleCredential): Promise<User> {
  const user = (await readMockUsers()).find(
    (candidate) => candidate.provider === 'apple' && candidate.appleUserId === credential.user,
  );
  return user ? startMockSession(user) : createMockSession(credential.email ?? '', 'apple', credential.user);
}

export async function deleteMockUser(userId: string): Promise<void> {
  await writeMockUsers((await readMockUsers()).filter((user) => user.id !== userId));
  await AsyncStorage.removeItem(MOCK_SESSION_KEY);
}

export async function signOut(): Promise<void> {
  await AsyncStorage.removeItem(MOCK_SESSION_KEY);
}

export async function getCurrentUser(): Promise<User | null> {
  const sessionId = await AsyncStorage.getItem(MOCK_SESSION_KEY);
  if (!sessionId) {
    return null;
  }
  return (await readMockUsers()).find((user) => user.id === sessionId) ?? null;
}
