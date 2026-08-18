'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy } from 'lucide-react';

export function CopyAddressButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('คัดลอกที่อยู่ลูกค้าแล้ว');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('คัดลอกไม่สำเร็จ');
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-brand-charcoal shadow-sm hover:bg-slate-50"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-brand-lime" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'คัดลอกแล้ว' : 'คัดลอกที่อยู่'}
    </button>
  );
}
