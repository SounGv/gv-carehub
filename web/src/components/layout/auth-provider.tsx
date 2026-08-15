'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { UserRole } from '@/lib/types';
import { type AuthSession, clearStoredSession, getStoredSession, setStoredSession } from '@/lib/auth';

interface AuthContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  login: (name: string, role: UserRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setSession(getStoredSession());
    setIsLoading(false);
  }, []);

  const login = useCallback((name: string, role: UserRole) => {
    const next: AuthSession = { userId: name.trim().toLowerCase().replace(/\s+/g, '-'), name: name.trim(), role };
    setStoredSession(next);
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    clearStoredSession();
    setSession(null);
  }, []);

  const value = useMemo(() => ({ session, isLoading, login, logout }), [session, isLoading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
