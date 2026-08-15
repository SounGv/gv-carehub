'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { gvApi, GvApiError } from '@/lib/api';
import { useAuth } from '@/components/layout/auth-provider';
import { cn } from '@/lib/utils';

const DIRECT_STATUSES = ['รับเข้าคลังแล้ว', 'กำลังดำเนินการ', 'รออะไหล่', 'ดำเนินการเสร็จ', 'รอจัดส่งคืน', 'ปิดเคส'];

export function StatusActions({ claimNo, currentStatus, onChanged }: { claimNo: string; currentStatus: string; onChanged: () => void }) {
  const { session } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function changeTo(status: string) {
    if (!session || status === currentStatus) return;
    setPending(status);
    try {
      if (status === 'รับเข้าคลังแล้ว') {
        await gvApi.receive(claimNo, session.name);
      } else {
        await gvApi.service(claimNo, status, session.name);
      }
      toast.success(`เปลี่ยนสถานะเป็น "${status}" แล้ว`);
      onChanged();
    } catch (err) {
      toast.error(err instanceof GvApiError ? err.message : 'เปลี่ยนสถานะไม่สำเร็จ');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {DIRECT_STATUSES.map((status) => (
        <Button
          key={status}
          size="sm"
          variant={status === currentStatus ? 'default' : 'outline'}
          disabled={status === currentStatus}
          loading={pending === status}
          onClick={() => changeTo(status)}
          className={cn(status === currentStatus && 'bg-brand-charcoal')}
        >
          {status}
        </Button>
      ))}
      <Button size="sm" variant="outline" onClick={() => router.push(`/staff/ship?claim_no=${encodeURIComponent(claimNo)}`)}>
        <Truck className="h-3.5 w-3.5" /> จัดส่งแล้ว (กรอกข้อมูลขนส่ง)
      </Button>
    </div>
  );
}
