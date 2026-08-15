'use client';

import { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, MessageCircleMore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function ClaimSuccess({ claimNo, publicToken }: { claimNo: string; publicToken: string }) {
  const [copied, setCopied] = useState<'link' | 'text' | null>(null);

  const trackUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/track/${publicToken}`;
  }, [publicToken]);

  const shareText = `แจ้งเคลมสำเร็จ เลขเคส ${claimNo}\nติดตามสถานะได้ที่: ${trackUrl}`;

  async function copy(kind: 'link' | 'text') {
    try {
      await navigator.clipboard.writeText(kind === 'link' ? trackUrl : shareText);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // clipboard API unavailable — user can still select the text manually
    }
  }

  function shareToLine() {
    const url = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(trackUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-success">
          <Check className="h-7 w-7" />
        </div>
        <div>
          <div className="text-sm text-slate-500">แจ้งเคลมสำเร็จ เลขเคสของคุณคือ</div>
          <div className="mt-1 text-3xl font-bold tracking-wide text-brand-charcoal">{claimNo}</div>
        </div>

        {trackUrl && (
          <div className="rounded-xl border border-border p-4">
            <QRCodeSVG value={trackUrl} size={160} fgColor="#221E1A" />
          </div>
        )}

        <div className="w-full max-w-sm space-y-2">
          <div className="truncate rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">{trackUrl}</div>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={() => copy('link')}>
              <Copy className="h-4 w-4" /> {copied === 'link' ? 'คัดลอกแล้ว' : 'Copy Link'}
            </Button>
            <Button type="button" variant="outline" onClick={() => copy('text')}>
              <Copy className="h-4 w-4" /> {copied === 'text' ? 'คัดลอกแล้ว' : 'คัดลอกข้อความ'}
            </Button>
          </div>
          <Button type="button" variant="brand" className="w-full" onClick={shareToLine}>
            <MessageCircleMore className="h-4 w-4" /> ส่งลิงก์ทาง LINE
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
