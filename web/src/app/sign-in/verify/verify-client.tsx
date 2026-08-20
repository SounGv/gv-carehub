'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export function VerifyClient() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    const email = params.get('email');
    const token = params.get('token');
    if (!email || !token) {
      setError(true);
      return;
    }

    signIn('credentials', { email, token, redirect: false }).then((res) => {
      if (res?.error) {
        setError(true);
      } else {
        router.push('/admin/dashboard');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-3 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-600">ลิงก์หมดอายุหรือไม่ถูกต้อง กรุณาขอลิงก์ใหม่</p>
          <Link href="/sign-in" className="text-sm font-medium text-brand-lime underline">
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );
}
