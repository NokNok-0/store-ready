import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import * as account from '@/account';
import * as auth from '@/auth';

type SessionValue = {
  user: auth.User | null;
  isLoading: boolean;
  accountDeleted: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithApple: (credential: auth.AppleCredential) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<auth.User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accountDeleted, setAccountDeleted] = useState(false);

  useEffect(() => {
    auth
      .getCurrentUser()
      .then(setUser)
      .finally(() => setIsLoading(false));
  }, []);

  const startSession = (next: auth.User) => {
    setAccountDeleted(false);
    setUser(next);
  };

  const value: SessionValue = {
    user,
    isLoading,
    accountDeleted,
    signIn: async (email, password) => startSession(await auth.signIn(email, password)),
    signUp: async (email, password) => startSession(await auth.signUp(email, password)),
    signInWithApple: async (credential) => startSession(await auth.signInWithApple(credential)),
    signOut: async () => {
      await auth.signOut();
      setUser(null);
    },
    deleteAccount: async () => {
      await account.deleteAccount();
      setAccountDeleted(true);
      setUser(null);
    },
  };

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): SessionValue {
  const value = use(SessionContext);
  if (!value) {
    throw new Error('useSession must be used inside SessionProvider');
  }
  return value;
}
