import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import * as auth from '@/auth';

type SessionValue = {
  user: auth.User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<auth.User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    auth
      .getCurrentUser()
      .then(setUser)
      .finally(() => setIsLoading(false));
  }, []);

  const value: SessionValue = {
    user,
    isLoading,
    signIn: async (email, password) => setUser(await auth.signIn(email, password)),
    signUp: async (email, password) => setUser(await auth.signUp(email, password)),
    signInWithGoogle: async () => setUser(await auth.signInWithGoogle()),
    signOut: async () => {
      await auth.signOut();
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
