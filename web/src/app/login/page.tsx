'use client';

import { Suspense, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/components/layout/auth-provider';
import type { UserRole } from '@/lib/types';
import { ROLE_LABELS } from '@/lib/constants';

const LOGIN_ROLES: UserRole[] = ['staff', 'manager', 'admin'];

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('staff');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    login(name, role);
    const redirect = searchParams.get('redirect');
    router.replace(redirect || (role === 'admin' || role === 'manager' ? '/admin/dashboard' : '/staff/receive'));
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <Image src="/gv-logo-icon.png" alt="Gadget Villa" width={56} height={56} className="mb-2 rounded-xl" />
        <CardTitle className="text-xl">GV CareHub</CardTitle>
        <CardDescription>เข้าสู่ระบบสำหรับพนักงานและผู้บริหาร</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
          <span>
            <b>โหมดทดสอบ:</b> ระบบยืนยันตัวตนจริงยังไม่ได้เชื่อมต่อ (ดู TODO ใน <code>lib/auth.ts</code>) การกรอกชื่อ/บทบาทนี้ใช้สำหรับพัฒนา
            และทดสอบเท่านั้น ห้ามใช้งานจริงจนกว่าจะต่อระบบ Login จริง
          </span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">ชื่อผู้ใช้งาน</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น สมชาย ใจดี" required />
          </div>
          <div>
            <Label htmlFor="role">บทบาท</Label>
            <Select id="role" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              {LOGIN_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" variant="brand" className="w-full">
            เข้าสู่ระบบ
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
