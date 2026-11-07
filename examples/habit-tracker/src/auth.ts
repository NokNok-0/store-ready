import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';

export type AuthProvider = 'email' | 'google';

export type User = {
  id: string;
  email: string;
  provider: AuthProvider;
  createdAt: string;
};

export class AuthError extends Error {}

const MOCK_USERS_KEY = 'streaks:mock-users';
const MOCK_SESSION_KEY = 'streaks:mock-session';
const MOCK_GOOGLE_EMAIL = 'google.user@example.com';
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

export async function createMockSession(email: string, provider: AuthProvider): Promise<User> {
  const user: User = {
    id: randomUUID(),
    email: normalizeEmail(email),
    provider,
    createdAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(MOCK_USERS_KEY, JSON.stringify([...(await readMockUsers()), user]));
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

export async function signInWithGoogle(): Promise<User> {
  const user = await findMockUser(MOCK_GOOGLE_EMAIL);
  return user ? startMockSession(user) : createMockSession(MOCK_GOOGLE_EMAIL, 'google');
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
