'use client';

import { useMemo, useState } from 'react';
import { Boxes, ChevronLeft, ChevronRight, Coins, Download, FileSpreadsheet, HandCoins, Landmark, Search, Wallet, X } from 'lucide-react';
import { gvApi, type LegacyClsbsFilters } from '@/lib/api';
import { useAsync } from '@/hooks/use-async';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { TopNDonutChart } from '@/components/dashboard/charts';
import { FilterBar, FilterField, RefreshButton } from '@/components/ui/filter-bar';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState, Skeleton } from '@/components/ui/states';
import { ExportModeToggle, type ExportMode } from '@/components/reports/export-mode-toggle';
import { formatCurrency, formatNumber, formatThaiDateTime } from '@/lib/formatters';
import { exportCsv, exportExcel, exportSummaryExcel } from '@/lib/export';
import type { LegacyClsbsRow } from '@/lib/types';

const PAGE_SIZE = 50;

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

const CLSBS_COLUMN_GROUPS: { title: string; columns: { key: keyof LegacyClsbsRow; label: string }[] }[] = [
  {
    title: 'เคสและลูกค้า',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'bill_number', label: 'Bill Number' },
      { key: 'repair_date', label: 'วันที่รับซ่อม' },
      { key: 'customer_name', label: 'ชื่อลูกค้า' },
      { key: 'phone', label: 'เบอร์โทร' },
    ],
  },
  {
    title: 'สินค้าและอาการเสีย',
    columns: [
      { key: 'product_name', label: 'ชื่อสินค้า' },
      { key: 'serial_no', label: 'Serial' },
      { key: 'product_group', label: 'กลุ่มสินค้า' },
      { key: 'brand', label: 'แบรนด์' },
      { key: 'model', label: 'รุ่น' },
      { key: 'symptom', label: 'อาการเสีย' },
    ],
  },
  {
    title: 'ผู้จำหน่ายและวันที่',
    columns: [
      { key: 'vendor_name', label: 'ผู้จำหน่าย' },
      { key: 'sent_to_vendor_date', label: 'วันที่ส่งผู้จำหน่าย' },
      { key: 'received_from_vendor_date', label: 'วันที่รับคืนจากผู้จำหน่าย' },
      { key: 'returned_to_customer_date', label: 'วันที่คืนลูกค้า' },
    ],
  },
  {
    title: 'การเงิน',
    columns: [
      { key: 'paid_to_vendor', label: 'จ่ายผู้จำหน่าย' },
      { key: 'received_from_vendor', label: 'ได้รับจากผู้จำหน่าย' },
      { key: 'charged_to_customer', label: 'เรียกเก็บลูกค้า' },
      { key: 'refunded_to_customer', label: 'คืนลูกค้า' },
    ],
  },
  { title: 'สถานะ', columns: [{ key: 'status', label: 'สถานะ' }] },
];
const CLSBS_COLUMNS = CLSBS_COLUMN_GROUPS.flatMap((g) => g.columns);
const CLSBS_MONEY_KEYS = new Set(['paid_to_vendor', 'received_from_vendor', 'charged_to_customer', 'refunded_to_customer']);

const EMPTY_CLSBS_FILTERS: LegacyClsbsFilters = { from: '', to: '', brand: '', product_group: '', status: '', q: '' };

export function ClsbsTab() {
  const legacy = useAsync(() => gvApi.legacyReport(), []);
  const meta = useAsync(() => gvApi.legacyMeta(), []);
  const [draft, setDraft] = useState(EMPTY_CLSBS_FILTERS);
  const [applied, setApplied] = useState(EMPTY_CLSBS_FILTERS);
  const [page, setPage] = useState(1);
  const [exportMode, setExportMode] = useState<ExportMode>('detail');
  const result = useAsync(() => gvApi.legacyClsbsRows({ ...applied, page: String(page), page_size: String(PAGE_SIZE) }), [applied, page]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setApplied(draft);
    setPage(1);
  }

  /** Date/dropdown filters apply immediately on change — only the free-text
   * search box waits for the "ค้นหา" submit, since applying per keystroke
   * would fire a request per character. Without this, picking a date range
   * and never clicking "ค้นหา" silently leaves every result unfiltered. */
  function applyChange(patch: Partial<LegacyClsbsFilters>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    setApplied(next);
    setPage(1);
  }

  function handleClear() {
    setDraft(EMPTY_CLSBS_FILTERS);
    setApplied(EMPTY_CLSBS_FILTERS);
    setPage(1);
  }

  const rows = useMemo(() => result.data?.rows ?? [], [result.data]);

  function handleExportExcel() {
    if (exportMode === 'detail') {
      exportExcel(rows, CLSBS_COLUMNS, 'gv-carehub-clsbs', 'CLSBS');
      return;
    }
    if (!legacy.data) return;
    const c = legacy.data.clsbs;
    exportSummaryExcel(
      [
        { name: 'อาการเสียยอดนิยม', rows: c.top_symptoms, columns: [{ key: 'label', label: 'อาการเสีย' }, { key: 'count', label: 'จำนวนครั้ง' }] },
        { name: 'ตามแบรนด์', rows: c.by_brand, columns: [{ key: 'label', label: 'แบรนด์' }, { key: 'count', label: 'จำนวนครั้ง' }] },
        { name: 'ตามกลุ่มสินค้า', rows: c.by_product_group, columns: [{ key: 'label', label: 'กลุ่มสินค้า' }, { key: 'count', label: 'จำนวนครั้ง' }] },
        {
          name: 'สรุปการเงิน',
          rows: [
            { label: 'รายการสะสม', value: c.total_records },
            { label: 'จ่ายให้ผู้จำหน่าย (บาท)', value: c.money.paid_to_vendor },
            { label: 'ได้รับจากผู้จำหน่าย (บาท)', value: c.money.received_from_vendor },
            { label: 'เรียกเก็บจากลูกค้า (บาท)', value: c.money.charged_to_customer },
            { label: 'คืนให้ลูกค้า (บาท)', value: c.money.refunded_to_customer },
          ],
          columns: [{ key: 'label', label: 'รายการ' }, { key: 'value', label: 'ค่า' }],
        },
      ],
      'gv-carehub-clsbs-summary',
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-slate-500">ข้อมูลจริงย้อนหลังจากชีต &quot;CLSBS&quot; (สินค้าที่ส่งซ่อม/เคลมผ่านผู้จำหน่าย) — อ่านสดจากชีตโดยตรง</p>
        <RefreshButton onClick={legacy.refetch} isLoading={legacy.isLoading} lastUpdatedAt={legacy.lastUpdatedAt} />
      </div>

      {legacy.isLoading && !legacy.data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      )}
      {legacy.error && !legacy.data && <ErrorState message={legacy.error} onRetry={legacy.refetch} />}

      {legacy.data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <KpiCard label="รายการสะสม" value={legacy.data.clsbs.total_records} icon={Boxes} />
            <KpiCard label="จ่ายให้ผู้จำหน่าย" value={legacy.data.clsbs.money.paid_to_vendor} icon={HandCoins} isCurrency tone="warning" />
            <KpiCard label="ได้รับจากผู้จำหน่าย" value={legacy.data.clsbs.money.received_from_vendor} icon={Landmark} isCurrency tone="good" />
            <KpiCard label="เรียกเก็บจากลูกค้า" value={legacy.data.clsbs.money.charged_to_customer} icon={Wallet} isCurrency />
            <KpiCard label="คืนให้ลูกค้า" value={legacy.data.clsbs.money.refunded_to_customer} icon={Coins} isCurrency tone="warning" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>อาการเสียที่พบบ่อย</CardTitle>
              </CardHeader>
              <CardContent>
                <TopNDonutChart data={legacy.data.clsbs.top_symptoms} labelKey="label" valueKey="count" emptyTitle="ไม่มีข้อมูลอาการเสีย" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>แบรนด์ที่รับเคลมบ่อยสุด</CardTitle>
              </CardHeader>
              <CardContent>
                <TopNDonutChart data={legacy.data.clsbs.by_brand} labelKey="label" valueKey="count" emptyTitle="ไม่มีข้อมูลแบรนด์" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>กลุ่มสินค้าที่รับเคลมบ่อยสุด</CardTitle>
              </CardHeader>
              <CardContent>
                <TopNDonutChart data={legacy.data.clsbs.by_product_group} labelKey="label" valueKey="count" emptyTitle="ไม่มีข้อมูลกลุ่มสินค้า" />
              </CardContent>
            </Card>
          </div>

          <div className="text-xs text-slate-400">ข้อมูลสรุปด้านบนแคชไว้สูงสุด 3 นาทีเพื่อความเร็ว — อัปเดตล่าสุด {formatThaiDateTime(legacy.data.generated_at)}</div>
        </>
      )}

      {legacy.isLoading && legacy.data && <LoadingState label="กำลังอัปเดตข้อมูล..." />}

      <div>
        <h2 className="text-lg font-bold text-brand-charcoal">รายละเอียดรายการ</h2>
        <p className="text-sm text-slate-500">ค้นหา กรอง และแบ่งหน้าได้ — ดึงสดจากชีตเดิมโดยตรง</p>
      </div>

      <form onSubmit={handleSearch}>
        <FilterBar>
          <FilterField label="วันที่เริ่มต้น (รับซ่อม)">
            <Input type="date" value={draft.from} onChange={(e) => applyChange({ from: e.target.value })} />
          </FilterField>
          <FilterField label="วันที่สิ้นสุด (รับซ่อม)">
            <Input type="date" value={draft.to} onChange={(e) => applyChange({ to: e.target.value })} />
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
          <FilterField label="กลุ่มสินค้า">
            <Select value={draft.product_group} onChange={(e) => applyChange({ product_group: e.target.value })}>
              <option value="">ทั้งหมด</option>
              {(meta.data?.product_groups ?? []).map((g) => (
                <option key={g} value={g}>
                  {g}
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
          <FilterField label="ค้นหา" className="min-w-[200px]">
            <Input placeholder="ชื่อลูกค้า, Serial, ชื่อสินค้า, ID..." value={draft.q} onChange={(e) => setDraft((f) => ({ ...f, q: e.target.value }))} />
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
            <div className="flex flex-wrap items-center gap-2">
              <ExportModeToggle mode={exportMode} onChange={setExportMode} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!rows.length || exportMode === 'summary'}
                title={exportMode === 'summary' ? 'สรุปยอดรวมมีหลายตารางย่อย ใช้ Export Excel แทน' : undefined}
                onClick={() => exportCsv(rows, CLSBS_COLUMNS, 'gv-carehub-clsbs')}
              >
                <Download className="h-3.5 w-3.5" /> Export หน้านี้ ({rows.length})
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={exportMode === 'detail' ? !rows.length : !legacy.data} onClick={handleExportExcel}>
                <FileSpreadsheet className="h-3.5 w-3.5" /> {exportMode === 'detail' ? 'Excel หน้านี้' : 'Excel สรุปทั้งหมด'}
              </Button>
            </div>
          </div>

          {rows.length === 0 && <EmptyState title="ไม่พบรายการตามตัวกรองที่เลือก" />}

          {rows.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  {CLSBS_COLUMN_GROUPS.map((g) => (
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
                  {CLSBS_COLUMNS.map((c) => (
                    <TableHead key={String(c.key)} className={CLSBS_MONEY_KEYS.has(String(c.key)) ? 'text-right' : ''}>
                      {c.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={`${row.id}-${i}`}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.bill_number || '-'}</TableCell>
                    <TableCell>{row.repair_date || '-'}</TableCell>
                    <TableCell>{row.customer_name || '-'}</TableCell>
                    <TableCell>{row.phone || '-'}</TableCell>
                    <TableCell className="max-w-[240px] truncate" title={row.product_name}>
                      {row.product_name || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.serial_no || '-'}</TableCell>
                    <TableCell>{row.product_group || '-'}</TableCell>
                    <TableCell>{row.brand || '-'}</TableCell>
                    <TableCell>{row.model || '-'}</TableCell>
                    <TableCell>{row.symptom || '-'}</TableCell>
                    <TableCell>{row.vendor_name || '-'}</TableCell>
                    <TableCell>{row.sent_to_vendor_date || '-'}</TableCell>
                    <TableCell>{row.received_from_vendor_date || '-'}</TableCell>
                    <TableCell>{row.returned_to_customer_date || '-'}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(row.paid_to_vendor)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(row.received_from_vendor)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(row.charged_to_customer)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(row.refunded_to_customer)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.status || '-'}</Badge>
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
