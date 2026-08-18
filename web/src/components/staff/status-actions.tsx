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

/** Requires the technician to have saved a test/inspection result (ผลตรวจสินค้า)
 * before the case can move past the "testing" stage — mirrors the same gate
 * enforced server-side in updateStatus_/assertTestResultRecorded_, kept here
 * too so staff see *why* the button is disabled instead of hitting an error. */
const TEST_RESULT_REQUIRED_STATUSES = ['ดำเนินการเสร็จ', 'รอจัดส่งคืน'];
const NO_TEST_RESULT_MESSAGE = 'ต้องให้ช่างลงผลตรวจสอบ/ผลเทสในการ์ด "ผลตรวจสอบ" ก่อน ถึงจะเปลี่ยนสถานะนี้ได้';

export function StatusActions({
  claimNo,
  currentStatus,
  hasTestResult,
  onChanged,
}: {
  claimNo: string;
  currentStatus: string;
  hasTestResult: boolean;
  onChanged: () => void;
}) {
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

  const shipBlocked = !hasTestResult;

  return (
    <div className="flex flex-wrap items-start gap-2">
      {DIRECT_STATUSES.map((status) => {
        const blocked = !hasTestResult && TEST_RESULT_REQUIRED_STATUSES.includes(status) && status !== currentStatus;
        return (
          <Button
            key={status}
            size="sm"
            variant={status === currentStatus ? 'default' : 'outline'}
            disabled={status === currentStatus || blocked}
            loading={pending === status}
            onClick={() => changeTo(status)}
            title={blocked ? NO_TEST_RESULT_MESSAGE : undefined}
            className={cn(status === currentStatus && 'bg-brand-charcoal')}
          >
            {status}
          </Button>
        );
      })}
      <Button
        size="sm"
        variant="outline"
        disabled={shipBlocked}
        title={shipBlocked ? NO_TEST_RESULT_MESSAGE : undefined}
        onClick={() => router.push(`/staff/ship?claim_no=${encodeURIComponent(claimNo)}`)}
      >
        <Truck className="h-3.5 w-3.5" /> จัดส่งแล้ว (กรอกข้อมูลขนส่ง)
      </Button>
      {shipBlocked && <p className="w-full text-xs text-amber-600">{NO_TEST_RESULT_MESSAGE}</p>}
    </div>
  );
}
