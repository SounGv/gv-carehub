'use client';

import { createContext, useContext, useMemo } from 'react';
import { SessionProvider, useSession, signOut as nextAuthSignOut } from 'next-auth/react';

interface AuthContextValue {
  /** Kept as `{ name }` (not the full NextAuth session shape) so every existing
   * `session.name` call site that logs an `actor` on write actions — receive,
   * ship, service-detail, owner-select, status-actions, supplier-rma — needed
   * zero changes when real login replaced the old localStorage name-picker. */
  session: { name: string };
  isLoading: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function AuthContextBridge({ children }: { children: React.ReactNode }) {
  const { data, status } = useSession();

  const value = useMemo<AuthContextValue>(() => {
    const displayName = data?.user?.name || data?.user?.email?.split('@')[0] || 'พนักงาน';
    return {
      session: { name: displayName },
      isLoading: status === 'loading',
      signOut: () => nextAuthSignOut({ callbackUrl: '/sign-in' }),
    };
  }, [data, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthContextBridge>{children}</AuthContextBridge>
    </SessionProvider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
