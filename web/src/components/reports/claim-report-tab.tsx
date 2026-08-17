'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format, startOfMonth } from 'date-fns';
import { ClipboardList, Coins, Download, FileSpreadsheet, Percent, Search, Truck, Wrench, X } from 'lucide-react';
import { gvApi, type ClaimReportFilters } from '@/lib/api';
import { useAsync } from '@/hooks/use-async';
import { useMeta } from '@/hooks/use-meta';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { StatusBadge } from '@/components/claims/status-badge';
import { ExportModeToggle, type ExportMode } from '@/components/reports/export-mode-toggle';
import { FilterBar, FilterField } from '@/components/ui/filter-bar';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, ErrorState, LoadingState, Skeleton } from '@/components/ui/states';
import { formatCurrency, formatPercent, formatThaiDate, formatThaiDateTime } from '@/lib/formatters';
import { exportCsv, exportExcel, exportSummaryExcel } from '@/lib/export';
import type { ClaimReportRow } from '@/lib/types';

const today = () => format(new Date(), 'yyyy-MM-dd');
const defaultFrom = () => format(startOfMonth(new Date()), 'yyyy-MM-dd');

const RESOLUTION_METHODS = ['ซ่อม', 'เปลี่ยนสินค้าใหม่', 'คืนเงิน', 'ส่งเคลมผู้ผลิต', 'อื่นๆ'];

const EMPTY_FILTERS: ClaimReportFilters = {
  from: defaultFrom(),
  to: today(),
  sku: '',
  model: '',
  brand: '',
  status: '',
  channel: '',
  resolution_method: '',
};

/** Column groups mirror how RMA/warranty systems lay out case detail: identity, product,
 * issue, timeline, logistics, resolution — one wide, real data table, not an aggregate. */
const COLUMN_GROUPS: { title: string; columns: { key: keyof ClaimReportRow; label: string }[] }[] = [
  {
    title: 'เคสและลูกค้า',
    columns: [
      { key: 'claim_no', label: 'เลขเคส' },
      { key: 'customer_name', label: 'ชื่อลูกค้า' },
      { key: 'phone', label: 'เบอร์โทร' },
      { key: 'channel', label: 'ช่องทาง' },
      { key: 'order_no', label: 'เลขคำสั่งซื้อ' },
    ],
  },
  {
    title: 'สินค้า',
    columns: [
      { key: 'sku', label: 'SKU' },
      { key: 'product_name', label: 'ชื่อสินค้า' },
      { key: 'model', label: 'รุ่น' },
      { key: 'brand', label: 'แบรนด์' },
      { key: 'serial_no', label: 'Serial Number' },
    ],
  },
  {
    title: 'อาการเสีย',
    columns: [
      { key: 'issue_group', label: 'กลุ่มอาการเสีย' },
      { key: 'issue_detail', label: 'รายละเอียดอาการเสีย' },
    ],
  },
  {
    title: 'ไทม์ไลน์',
    columns: [
      { key: 'submitted_at', label: 'วันที่แจ้งเคลม' },
      { key: 'received_at', label: 'วันที่รับเข้าคลัง' },
      { key: 'shipped_at', label: 'วันที่ส่งคืน' },
    ],
  },
  {
    title: 'การขนส่ง',
    columns: [
      { key: 'inbound_carrier', label: 'ขนส่งขาเข้า' },
      { key: 'inbound_tracking_no', label: 'เลขพัสดุขาเข้า' },
      { key: 'outbound_carrier', label: 'ขนส่งขาออก' },
      { key: 'outbound_tracking_no', label: 'เลขพัสดุขาออก' },
    ],
  },
  {
    title: 'การแก้ไข',
    columns: [
      { key: 'warranty_type', label: 'ประเภทประกัน' },
      { key: 'resolution_method', label: 'วิธีแก้ไข' },
      { key: 'inspection_result', label: 'ผลตรวจสอบ' },
      { key: 'repair_cost', label: 'ค่าใช้จ่าย' },
    ],
  },
  {
    title: 'สถานะ',
    columns: [{ key: 'status', label: 'สถานะ' }],
  },
];

const COLUMNS = COLUMN_GROUPS.flatMap((g) => g.columns);
const NUMERIC_KEYS = new Set(['repair_cost']);
const SHIPPED_STATUSES = ['จัดส่งแล้ว', 'ปิดเคส'];

export function ClaimReportTab() {
  const [draft, setDraft] = useState<ClaimReportFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<ClaimReportFilters>(EMPTY_FILTERS);
  const [query, setQuery] = useState('');
  const [exportMode, setExportMode] = useState<ExportMode>('detail');
  const meta = useMeta();
  const report = useAsync(() => gvApi.claimReport(applied), [applied]);
  // Reuses the dashboard endpoint's claims-vs-sales ratio for the same date/SKU/status/channel
  // filters, instead of adding a new backend field just for this one number.
  const defectRate = useAsync(
    () => gvApi.dashboard({ from: applied.from, to: applied.to, sku: applied.sku, status: applied.status, channel: applied.channel }),
    [applied],
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setApplied(draft);
  }

  /** Every field here is a date/dropdown (no free-text box), so there's no
   * reason to make the user click "ค้นหา" separately — apply immediately.
   * Without this, picking a date range and never clicking "ค้นหา" silently
   * leaves every result unfiltered. */
  function applyChange(patch: Partial<ClaimReportFilters>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    setApplied(next);
  }

  function handleClear() {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
  }

  const allRows = useMemo(() => report.data?.rows ?? [], [report.data]);
  // Client-side only — filters the already-loaded page of rows, same identity fields
  // gvApi.search treats as a claim match (claim_no/customer_name/phone/order_no/serial_no).
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((r) =>
      [r.claim_no, r.customer_name, r.phone, r.order_no, r.serial_no].some((v) => (v ?? '').toLowerCase().includes(q)),
    );
  }, [allRows, query]);

  const shippedCount = useMemo(() => {
    if (!report.data) return 0;
    return SHIPPED_STATUSES.reduce((sum, s) => sum + (report.data!.summary.by_status[s] || 0), 0);
  }, [report.data]);
  const notShippedCount = report.data ? report.data.summary.total_cases - shippedCount : 0;

  function handleExportExcel() {
    if (exportMode === 'detail') {
      exportExcel(rows, COLUMNS, 'gv-carehub-claim-report', 'Claim Report');
      return;
    }
    if (!report.data) return;
    exportSummaryExcel(
      [
        {
          name: 'ตามสถานะ',
          rows: Object.entries(report.data.summary.by_status).map(([status, count]) => ({ status, count })),
          columns: [
            { key: 'status', label: 'สถานะ' },
            { key: 'count', label: 'จำนวนเคส' },
          ],
        },
        {
          name: 'ตามวิธีแก้ไข',
          rows: Object.entries(report.data.summary.by_resolution_method).map(([method, count]) => ({ method, count })),
          columns: [
            { key: 'method', label: 'วิธีแก้ไข' },
            { key: 'count', label: 'จำนวนเคส' },
          ],
        },
        {
          name: 'สรุปรวม',
          rows: [
            { label: 'เคสทั้งหมด', value: report.data.summary.total_cases },
            { label: 'ส่งคืนแล้ว', value: shippedCount },
            { label: 'ยังไม่ส่งคืน', value: notShippedCount },
            { label: 'ค่าซ่อม/เปลี่ยนรวม (บาท)', value: report.data.summary.total_repair_cost },
          ],
          columns: [
            { key: 'label', label: 'รายการ' },
            { key: 'value', label: 'ค่า' },
          ],
        },
      ],
      'gv-carehub-claim-report-summary',
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        ข้อมูลจริงรายเคส — สินค้า อาการเสีย ซีเรียล วันที่รับ/ส่งคืน และวิธีแก้ไข ตามช่วงเวลาที่เลือก (ดูภาพรวมและกราฟที่หน้า Dashboard)
      </p>

      <form onSubmit={handleSearch}>
        <FilterBar>
          <FilterField label="วันที่เริ่มต้น">
            <Input type="date" value={draft.from} max={draft.to} onChange={(e) => applyChange({ from: e.target.value })} />
          </FilterField>
          <FilterField label="วันที่สิ้นสุด">
            <Input type="date" value={draft.to} min={draft.from} onChange={(e) => applyChange({ to: e.target.value })} />
          </FilterField>
          <FilterField label="SKU">
            <Select value={draft.sku} onChange={(e) => applyChange({ sku: e.target.value })}>
              <option value="">ทั้งหมด</option>
              {(meta.data?.skus ?? []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="รุ่นสินค้า">
            <Select value={draft.model} onChange={(e) => applyChange({ model: e.target.value })}>
              <option value="">ทั้งหมด</option>
              {(meta.data?.models ?? []).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="แบรนด์">
            <Select value={draft.brand} onChange={(e) => applyChange({ brand: e.target.value })}>
              <option value="">ทั้งหมด</option>
              {(meta.data?.brands ?? []).map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="ช่องทาง">
            <Select value={draft.channel} onChange={(e) => applyChange({ channel: e.target.value })}>
              <option value="">ทั้งหมด</option>
              {(meta.data?.channels ?? []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="สถานะ">
            <Select value={draft.status} onChange={(e) => applyChange({ status: e.target.value })}>
              <option value="">ทั้งหมด</option>
              {(meta.data?.statuses ?? []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="วิธีแก้ไข">
            <Select value={draft.resolution_method} onChange={(e) => applyChange({ resolution_method: e.target.value })}>
              <option value="">ทั้งหมด</option>
              {RESOLUTION_METHODS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
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

      {report.isLoading && !report.data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      )}
      {report.error && !report.data && <ErrorState message={report.error} onRetry={report.refetch} />}

      {report.data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <KpiCard label="เคสทั้งหมดในช่วงที่เลือก" value={report.data.summary.total_cases} icon={ClipboardList} />
          <KpiCard label="ส่งคืนแล้ว" value={shippedCount} icon={Truck} tone="good" />
          <KpiCard label="ยังไม่ส่งคืน" value={notShippedCount} icon={Wrench} tone="warning" />
          <KpiCard label="ค่าซ่อม/เปลี่ยนรวม" value={report.data.summary.total_repair_cost} icon={Coins} isCurrency tone="warning" />
          <div className="flex items-start gap-3 rounded-xl border border-border bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-slate-100 text-brand-charcoal">
              <Percent className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-slate-500">อัตราเสีย (เคลม ÷ ยอดขาย)</div>
              <div className="mt-0.5 text-xl font-bold tabular-nums text-foreground">
                {defectRate.data ? formatPercent(defectRate.data.charts.defect_rate_vs_sales) : '-'}
              </div>
            </div>
          </div>
        </div>
      )}

      {report.data && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-[240px] flex-1 items-center gap-2">
              <Search className="h-4 w-4 flex-none text-slate-400" />
              <Input
                type="text"
                placeholder="ค้นหา เลขเคส / ชื่อลูกค้า / เบอร์โทร / เลขคำสั่งซื้อ / Serial"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="text-xs text-slate-400">
              {report.lastUpdatedAt && `อัปเดตล่าสุด ${formatThaiDateTime(report.lastUpdatedAt)}`}
              {` · พบ ${rows.length} เคส`}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ExportModeToggle mode={exportMode} onChange={setExportMode} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!rows.length || exportMode === 'summary'}
                title={exportMode === 'summary' ? 'สรุปยอดรวมมีหลายตารางย่อย ใช้ Export Excel แทน' : undefined}
                onClick={() => exportCsv(rows, COLUMNS, 'gv-carehub-claim-report')}
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={!rows.length} onClick={handleExportExcel}>
                <FileSpreadsheet className="h-3.5 w-3.5" /> Export Excel
              </Button>
            </div>
          </div>

          {rows.length === 0 && <EmptyState title="ไม่พบเคสตามตัวกรองที่เลือก" />}

          {rows.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  {COLUMN_GROUPS.map((g) => (
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
                  {COLUMNS.map((c) => (
                    <TableHead key={String(c.key)} className={NUMERIC_KEYS.has(String(c.key)) ? 'text-right' : ''}>
                      {c.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={`${row.claim_no}-${i}`} className="hover:bg-slate-50">
                    <TableCell className="font-medium">
                      <Link href={`/staff/claims/${row.claim_no}`} className="text-brand-charcoal underline-offset-2 hover:underline">
                        {row.claim_no}
                      </Link>
                    </TableCell>
                    <TableCell>{row.customer_name || '-'}</TableCell>
                    <TableCell>{row.phone || '-'}</TableCell>
                    <TableCell>{row.channel || '-'}</TableCell>
                    <TableCell>{row.order_no || '-'}</TableCell>
                    <TableCell>{row.sku || '-'}</TableCell>
                    <TableCell>{row.product_name || '-'}</TableCell>
                    <TableCell>{row.model || '-'}</TableCell>
                    <TableCell>{row.brand || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{row.serial_no || '-'}</TableCell>
                    <TableCell>{row.issue_group || '-'}</TableCell>
                    <TableCell className="max-w-[240px] truncate" title={row.issue_detail}>
                      {row.issue_detail || '-'}
                    </TableCell>
                    <TableCell>{formatThaiDate(row.submitted_at)}</TableCell>
                    <TableCell>{row.received_at ? formatThaiDate(row.received_at) : '-'}</TableCell>
                    <TableCell>{row.shipped_at ? formatThaiDate(row.shipped_at) : '-'}</TableCell>
                    <TableCell>{row.inbound_carrier || '-'}</TableCell>
                    <TableCell>{row.inbound_tracking_no || '-'}</TableCell>
                    <TableCell>{row.outbound_carrier || '-'}</TableCell>
                    <TableCell>{row.outbound_tracking_no || '-'}</TableCell>
                    <TableCell>{row.warranty_type || '-'}</TableCell>
                    <TableCell>{row.resolution_method || '-'}</TableCell>
                    <TableCell className="max-w-[220px] truncate" title={row.inspection_result}>
                      {row.inspection_result || '-'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(row.repair_cost)}</TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
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
