'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_ACTOR_NAME, type AuthSession, getStoredSession, setStoredSession } from '@/lib/auth';

interface AuthContextValue {
  session: AuthSession;
  isLoading: boolean;
  rename: (name: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession>({ name: DEFAULT_ACTOR_NAME });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredSession();
    if (stored) {
      setSession(stored);
    } else {
      setStoredSession({ name: DEFAULT_ACTOR_NAME });
    }
    setIsLoading(false);
  }, []);

  const rename = useCallback((name: string) => {
    const next: AuthSession = { name: name.trim() || DEFAULT_ACTOR_NAME };
    setStoredSession(next);
    setSession(next);
  }, []);

  const value = useMemo(() => ({ session, isLoading, rename }), [session, isLoading, rename]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
