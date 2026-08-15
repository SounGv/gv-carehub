'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/layout/auth-provider';

export default function HomePage() {
  const router = useRouter();
  const { session, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!session) {
      router.replace('/login');
    } else if (session.role === 'admin' || session.role === 'manager') {
      router.replace('/admin/dashboard');
    } else {
      router.replace('/staff/receive');
    }
  }, [isLoading, session, router]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center text-slate-400">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}
