'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardList, Download, FileSpreadsheet, Search, X } from 'lucide-react';
import { gvApi, type LegacyServiceLogFilters } from '@/lib/api';
import { useAsync } from '@/hooks/use-async';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { MonthlyTrendChart, RankedBarChart } from '@/components/dashboard/charts';
import { FilterBar, FilterField, RefreshButton } from '@/components/ui/filter-bar';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState, Skeleton } from '@/components/ui/states';
import { formatCurrency, formatNumber, formatThaiDate, formatThaiDateTime } from '@/lib/formatters';
import { exportCsv, exportExcel } from '@/lib/export';
import type { LegacyServiceLogRow } from '@/lib/types';

const PAGE_SIZE = 50;

const SERVICE_STATUS_TONE: Record<string, 'success' | 'warning' | 'default'> = {
  ส่งคืนลูกค้าแล้ว: 'success',
  รับเข้าระบบแล้ว: 'warning',
  รับสินค้าจากลูกค้าแล้ว: 'warning',
};

function Pagination({ page, totalCount, onChange }: { page: number; totalCount: number; onChange: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  return (
    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
      <span>
        หน้า {page} จาก {formatNumber(totalPages)} (ทั้งหมด {formatNumber(totalCount)} รายการ)
      </span>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" /> ก่อนหน้า
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          ถัดไป <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

const SERVICE_COLUMN_GROUPS: { title: string; columns: { key: keyof LegacyServiceLogRow; label: string }[] }[] = [
  {
    title: 'เคสและลูกค้า',
    columns: [
      { key: 'case_no', label: 'เลขเคส' },
      { key: 'date', label: 'วันที่แจ้ง' },
      { key: 'channel', label: 'ร้าน' },
      { key: 'customer_name', label: 'ชื่อลูกค้า' },
      { key: 'phone', label: 'เบอร์โทร' },
      { key: 'order_no', label: 'เลขที่ออเดอร์' },
    ],
  },
  {
    title: 'สินค้าและอาการเสีย',
    columns: [
      { key: 'product', label: 'สินค้า' },
      { key: 'serial_no', label: 'Serial' },
      { key: 'issue_group', label: 'กลุ่มปัญหา' },
      { key: 'issue_detail', label: 'รายละเอียดปัญหา' },
      { key: 'resolution_method', label: 'วิธีแก้ไข' },
    ],
  },
  {
    title: 'ไทม์ไลน์และขนส่ง',
    columns: [
      { key: 'received_date', label: 'วันที่รับของเสีย' },
      { key: 'returned_date', label: 'วันที่ส่งคืนลูกค้า' },
      { key: 'return_tracking_no', label: 'Tracking ส่งคืน' },
      { key: 'shipping_cost', label: 'ค่าขนส่ง' },
    ],
  },
  { title: 'สถานะ', columns: [{ key: 'status', label: 'สถานะ' }] },
];
const SERVICE_COLUMNS = SERVICE_COLUMN_GROUPS.flatMap((g) => g.columns);

const EMPTY_SERVICE_FILTERS: LegacyServiceLogFilters = { from: '', to: '', channel: '', issue_group: '', q: '' };

export function ServiceLogTab() {
  const legacy = useAsync(() => gvApi.legacyReport(), []);
  const meta = useAsync(() => gvApi.legacyMeta(), []);
  const [draft, setDraft] = useState(EMPTY_SERVICE_FILTERS);
  const [applied, setApplied] = useState(EMPTY_SERVICE_FILTERS);
  const [page, setPage] = useState(1);
  const result = useAsync(
    () => gvApi.legacyServiceLogRows({ ...applied, page: String(page), page_size: String(PAGE_SIZE) }),
    [applied, page],
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setApplied(draft);
    setPage(1);
  }

  function handleClear() {
    setDraft(EMPTY_SERVICE_FILTERS);
    setApplied(EMPTY_SERVICE_FILTERS);
    setPage(1);
  }

  const rows = useMemo(() => result.data?.rows ?? [], [result.data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-slate-500">
          ข้อมูลจริงย้อนหลังจากชีต &quot;บริการหลังการขาย&quot; (บันทึกแจ้งเคลมเดิม) — อ่านสดจากชีตโดยตรง
        </p>
        <RefreshButton onClick={legacy.refetch} isLoading={legacy.isLoading} lastUpdatedAt={legacy.lastUpdatedAt} />
      </div>

      {legacy.isLoading && !legacy.data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      )}
      {legacy.error && !legacy.data && <ErrorState message={legacy.error} onRetry={legacy.refetch} />}

      {legacy.data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <KpiCard label="เคสสะสมทั้งหมด" value={legacy.data.service_log.total_cases} icon={ClipboardList} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>จำนวนเคสรายเดือน</CardTitle>
              </CardHeader>
              <CardContent>
                <MonthlyTrendChart data={legacy.data.service_log.by_month} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>สินค้าที่แจ้งเคลมบ่อยสุด</CardTitle>
              </CardHeader>
              <CardContent>
                <RankedBarChart
                  data={legacy.data.service_log.top_products}
                  labelKey="label"
                  valueKey="count"
                  valueLabel="จำนวนครั้ง"
                  emptyTitle="ไม่มีข้อมูลสินค้า"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>ช่องทางที่แจ้งเคลมบ่อยสุด</CardTitle>
              </CardHeader>
              <CardContent>
                <RankedBarChart
                  data={legacy.data.service_log.by_channel}
                  labelKey="label"
                  valueKey="count"
                  valueLabel="จำนวนครั้ง"
                  emptyTitle="ไม่มีข้อมูลช่องทาง"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>กลุ่มปัญหาที่พบบ่อย</CardTitle>
              </CardHeader>
              <CardContent>
                <RankedBarChart
                  data={legacy.data.service_log.by_issue_group}
                  labelKey="label"
                  valueKey="count"
                  valueLabel="จำนวนครั้ง"
                  emptyTitle="ไม่มีข้อมูลกลุ่มปัญหา"
                />
              </CardContent>
            </Card>
          </div>

          <div className="text-xs text-slate-400">ข้อมูลสรุปด้านบนแคชไว้สูงสุด 3 นาทีเพื่อความเร็ว — อัปเดตล่าสุด {formatThaiDateTime(legacy.data.generated_at)}</div>
        </>
      )}

      {legacy.isLoading && legacy.data && <LoadingState label="กำลังอัปเดตข้อมูล..." />}

      <div>
        <h2 className="text-lg font-bold text-brand-charcoal">รายละเอียดรายเคส</h2>
        <p className="text-sm text-slate-500">ค้นหา กรอง และแบ่งหน้าได้ — ดึงสดจากชีตเดิมโดยตรง</p>
      </div>

      <form onSubmit={handleSearch}>
        <FilterBar>
          <FilterField label="วันที่เริ่มต้น">
            <Input type="date" value={draft.from} onChange={(e) => setDraft((f) => ({ ...f, from: e.target.value }))} />
          </FilterField>
          <FilterField label="วันที่สิ้นสุด">
            <Input type="date" value={draft.to} onChange={(e) => setDraft((f) => ({ ...f, to: e.target.value }))} />
          </FilterField>
          <FilterField label="ร้าน">
            <Select value={draft.channel} onChange={(e) => setDraft((f) => ({ ...f, channel: e.target.value }))}>
              <option value="">ทั้งหมด</option>
              {(meta.data?.channels ?? []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="กลุ่มปัญหา">
            <Select value={draft.issue_group} onChange={(e) => setDraft((f) => ({ ...f, issue_group: e.target.value }))}>
              <option value="">ทั้งหมด</option>
              {(meta.data?.issue_groups ?? []).map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="ค้นหา" className="min-w-[200px]">
            <Input
              placeholder="ชื่อลูกค้า, เบอร์โทร, เลขเคส, Serial..."
              value={draft.q}
              onChange={(e) => setDraft((f) => ({ ...f, q: e.target.value }))}
            />
          </FilterField>
          <div className="flex flex-none gap-2">
            <Button type="submit" variant="brand" size="sm">
              <Search className="h-3.5 w-3.5" /> ค้นหา
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleClear}>
              <X className="h-3.5 w-3.5" /> ล้างตัวกรอง
            </Button>
          </div>
        </FilterBar>
      </form>

      {result.isLoading && !result.data && <LoadingState />}
      {result.error && !result.data && <ErrorState message={result.error} onRetry={result.refetch} />}

      {result.data && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Pagination page={result.data.page} totalCount={result.data.total_count} onChange={setPage} />
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" disabled={!rows.length} onClick={() => exportCsv(rows, SERVICE_COLUMNS, 'gv-carehub-service-log')}>
                <Download className="h-3.5 w-3.5" /> Export หน้านี้ ({rows.length})
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!rows.length}
                onClick={() => exportExcel(rows, SERVICE_COLUMNS, 'gv-carehub-service-log', 'บริการหลังการขาย')}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel หน้านี้
              </Button>
            </div>
          </div>

          {rows.length === 0 && <EmptyState title="ไม่พบเคสตามตัวกรองที่เลือก" />}

          {rows.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  {SERVICE_COLUMN_GROUPS.map((g) => (
                    <TableHead
                      key={g.title}
                      colSpan={g.columns.length}
                      className="border-b border-border bg-slate-100/70 text-center text-[10px] tracking-wider text-slate-400"
                    >
                      {g.title}
                    </TableHead>
                  ))}
                </TableRow>
                <TableRow>
                  {SERVICE_COLUMNS.map((c) => (
                    <TableHead key={String(c.key)} className={c.key === 'shipping_cost' ? 'text-right' : ''}>
                      {c.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={`${row.case_no}-${i}`}>
                    <TableCell className="font-medium">{row.case_no}</TableCell>
                    <TableCell>{formatThaiDate(row.date)}</TableCell>
                    <TableCell>{row.channel || '-'}</TableCell>
                    <TableCell>{row.customer_name || '-'}</TableCell>
                    <TableCell>{row.phone || '-'}</TableCell>
                    <TableCell>{row.order_no || '-'}</TableCell>
                    <TableCell>{row.product || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{row.serial_no || '-'}</TableCell>
                    <TableCell>{row.issue_group || '-'}</TableCell>
                    <TableCell className="max-w-[240px] truncate" title={row.issue_detail}>
                      {row.issue_detail || '-'}
                    </TableCell>
                    <TableCell>{row.resolution_method || '-'}</TableCell>
                    <TableCell>{row.received_date ? formatThaiDate(row.received_date) : '-'}</TableCell>
                    <TableCell>{row.returned_date ? formatThaiDate(row.returned_date) : '-'}</TableCell>
                    <TableCell>{row.return_tracking_no || '-'}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(row.shipping_cost)}</TableCell>
                    <TableCell>
                      <Badge variant={SERVICE_STATUS_TONE[row.status] ?? 'default'}>{row.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}
    </div>
  );
}
