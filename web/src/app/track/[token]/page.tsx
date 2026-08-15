'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PackageSearch } from 'lucide-react';
import { gvApi } from '@/lib/api';
import { useAsync } from '@/hooks/use-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { StatusBadge } from '@/components/claims/status-badge';
import { StatusTimeline } from '@/components/claims/status-timeline';
import { formatThaiDate } from '@/lib/formatters';

export default function TrackClaimPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const track = useAsync(() => gvApi.trackStatus(token), [token]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/gv-logo-icon.png" alt="Gadget Villa" width={36} height={36} className="rounded-lg" />
            <div>
              <div className="text-sm font-bold text-brand-charcoal">Gadget Villa</div>
              <div className="text-[11px] text-slate-500">ติดตามสถานะเคลม</div>
            </div>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
        {track.isLoading && <LoadingState label="กำลังตรวจสอบสถานะเคส..." />}
        {track.error && <ErrorState message={track.error} onRetry={track.refetch} />}

        {track.data && (
          <>
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <PackageSearch className="h-3.5 w-3.5" /> เลขเคส
                  </div>
                  <CardTitle className="text-2xl">{track.data.claim.claim_no}</CardTitle>
                </div>
                <StatusBadge status={track.data.claim.status} />
              </CardHeader>
              <CardContent>
                <div className="text-xs text-slate-400">แจ้งเคลมเมื่อ {formatThaiDate(track.data.claim.submitted_at)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>รายการสินค้า</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {track.data.claim.items.map((item, i) => (
                  <div key={i} className="rounded-lg border border-border p-3">
                    <div className="text-sm font-medium">{item.product_name || item.sku || 'ไม่ระบุสินค้า'}</div>
                    <div className="text-xs text-slate-400">
                      {item.sku && `SKU: ${item.sku}`} {item.issue_group && `· กลุ่มปัญหา: ${item.issue_group}`}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ไทม์ไลน์สถานะ</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusTimeline
                  steps={[
                    { label: 'แจ้งเคลมแล้ว', value: track.data.claim.submitted_at },
                    { label: 'รับเข้าคลังแล้ว', value: track.data.claim.received_at },
                    { label: 'ดำเนินการเสร็จ', value: track.data.claim.completed_at },
                    { label: 'จัดส่งคืนแล้ว', value: track.data.claim.shipped_at },
                  ]}
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
