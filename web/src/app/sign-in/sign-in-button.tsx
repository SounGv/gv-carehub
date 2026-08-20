'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function SignInButton() {
  return (
    <Button variant="brand" size="lg" className="w-full" onClick={() => signIn('google', { callbackUrl: '/admin/dashboard' })}>
      เข้าสู่ระบบด้วยบัญชี Gadget Villa
    </Button>
  );
}
