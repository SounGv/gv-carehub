'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/lib/types';
import { useAuth } from './auth-provider';
import { Loader2 } from 'lucide-react';

export function RoleGuard({ allow, children }: { allow: UserRole[]; children: React.ReactNode }) {
  const { session, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!session || !allow.includes(session.role)) {
      router.replace('/login');
    }
  }, [isLoading, session, allow, router]);

  if (isLoading || !session || !allow.includes(session.role)) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
