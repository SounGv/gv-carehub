'use client';

import { useState } from 'react';
import { Loader2, Mail, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SignInButton() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus('sending');
    try {
      await fetch('/api/staff-login/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } finally {
      // Always show the same confirmation regardless of the API result —
      // this endpoint never reveals whether an email is on the staff list.
      setStatus('sent');
    }
  }

  if (status === 'sent') {
    return (
      <div className="flex flex-col items-center gap-2 text-sm text-slate-600">
        <Mail className="h-8 w-8 text-brand-lime" />
        <p>เช็คอีเมลของคุณ — เราได้ส่งลิงก์เข้าสู่ระบบไปแล้ว (ถ้ามีในระบบ)</p>
        <p className="text-xs text-slate-400">ลิงก์มีอายุ 15 นาที</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 text-left">
      <Input
        type="email"
        required
        placeholder="ชื่อ@gadgetvilla.co.th"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={status === 'sending'}
      />
      <Button type="submit" variant="brand" size="lg" className="w-full" disabled={status === 'sending'}>
        {status === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        ส่งลิงก์เข้าสู่ระบบ
      </Button>
    </form>
  );
}
