'use client';

import { Coins, PackageCheck, TrendingUp } from 'lucide-react';
import { gvApi } from '@/lib/api';
import { useAsync } from '@/hooks/use-async';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/formatters';

export function SupplierRmaAnalyticsPanel() {
  const result = useAsync(() => gvApi.supplierRmaAnalytics(), []);
  const rows = result.data?.by_vendor ?? [];
  const totalSent = rows.reduce((s, r) => s + r.sent, 0);
  const totalReturned = rows.reduce((s, r) => s + r.returned, 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        วิเคราะห์เฉพาะรายการที่เคยสร้างเป็นชุดเคลม (RMA) ผ่านระบบนี้ — รายการ CLSBS เก่าที่ไม่เคยผ่านการสร้างชุดจะไม่นับรวม
      </p>

      {result.isLoading && !result.data && <LoadingState />}
      {result.error && !result.data && <ErrorState message={result.error} onRetry={result.refetch} />}
      {result.data && rows.length === 0 && <EmptyState title="ยังไม่มีข้อมูลชุดเคลม" description="สร้างชุดเคลมอย่างน้อย 1 ชุดก่อน จึงจะมีข้อมูลให้วิเคราะห์" />}

      {result.data && rows.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <KpiCard label="ส่งเคลมทั้งหมด" value={totalSent} icon={PackageCheck} suffix="รายการ" />
            <KpiCard
              label="อัตราได้รับคืนโดยรวม"
              value={totalSent > 0 ? Number(((totalReturned / totalSent) * 100).toFixed(1)) : 0}
              icon={TrendingUp}
              suffix="%"
              tone="good"
            />
            <KpiCard label="มูลค่าที่ยังไม่ได้คืน" value={result.data.total_unreturned_value} icon={Coins} isCurrency tone="warning" />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ผู้จำหน่าย</TableHead>
                <TableHead className="text-right">ส่งไป</TableHead>
                <TableHead className="text-right">ได้รับคืน</TableHead>
                <TableHead className="text-right">อัตราได้รับคืน</TableHead>
                <TableHead className="text-right">เวลาเฉลี่ย (วัน)</TableHead>
                <TableHead className="text-right">มูลค่าที่ยังไม่ได้คืน</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.vendor}>
                  <TableCell className="font-medium">{r.vendor}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(r.sent)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(r.returned)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPercent(r.approval_rate)}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.avg_turnaround_days ?? '-'}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(r.unreturned_value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
