'use client';

import { useMemo, useState } from 'react';
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Coins,
  Download,
  FileSpreadsheet,
  HandCoins,
  Landmark,
  Search,
  Wallet,
  X,
} from 'lucide-react';
import { gvApi, type LegacyClsbsFilters, type LegacyServiceLogFilters } from '@/lib/api';
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
import type { LegacyClsbsRow, LegacyServiceLogRow } from '@/lib/types';

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

function ServiceLogDetail({ meta }: { meta: { channels: string[]; issue_groups: string[] } | null }) {
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
              {(meta?.channels ?? []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="กลุ่มปัญหา">
            <Select value={draft.issue_group} onChange={(e) => setDraft((f) => ({ ...f, issue_group: e.target.value }))}>
              <option value="">ทั้งหมด</option>
              {(meta?.issue_groups ?? []).map((g) => (
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!rows.length}
                onClick={() => exportCsv(rows, SERVICE_COLUMNS, 'gv-carehub-service-log')}
              >
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

function ClsbsDetail({ meta }: { meta: { brands: string[]; product_groups: string[]; statuses: string[] } | null }) {
  const [draft, setDraft] = useState(EMPTY_CLSBS_FILTERS);
  const [applied, setApplied] = useState(EMPTY_CLSBS_FILTERS);
  const [page, setPage] = useState(1);
  const result = useAsync(
    () => gvApi.legacyClsbsRows({ ...applied, page: String(page), page_size: String(PAGE_SIZE) }),
    [applied, page],
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setApplied(draft);
    setPage(1);
  }

  function handleClear() {
    setDraft(EMPTY_CLSBS_FILTERS);
    setApplied(EMPTY_CLSBS_FILTERS);
    setPage(1);
  }

  const rows = useMemo(() => result.data?.rows ?? [], [result.data]);

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch}>
        <FilterBar>
          <FilterField label="วันที่เริ่มต้น (รับซ่อม)">
            <Input type="date" value={draft.from} onChange={(e) => setDraft((f) => ({ ...f, from: e.target.value }))} />
          </FilterField>
          <FilterField label="วันที่สิ้นสุด (รับซ่อม)">
            <Input type="date" value={draft.to} onChange={(e) => setDraft((f) => ({ ...f, to: e.target.value }))} />
          </FilterField>
          <FilterField label="แบรนด์">
            <Select value={draft.brand} onChange={(e) => setDraft((f) => ({ ...f, brand: e.target.value }))}>
              <option value="">ทั้งหมด</option>
              {(meta?.brands ?? []).map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="กลุ่มสินค้า">
            <Select value={draft.product_group} onChange={(e) => setDraft((f) => ({ ...f, product_group: e.target.value }))}>
              <option value="">ทั้งหมด</option>
              {(meta?.product_groups ?? []).map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="สถานะ">
            <Select value={draft.status} onChange={(e) => setDraft((f) => ({ ...f, status: e.target.value }))}>
              <option value="">ทั้งหมด</option>
              {(meta?.statuses ?? []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="ค้นหา" className="min-w-[200px]">
            <Input
              placeholder="ชื่อลูกค้า, Serial, ชื่อสินค้า, ID..."
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!rows.length}
                onClick={() => exportCsv(rows, CLSBS_COLUMNS, 'gv-carehub-clsbs')}
              >
                <Download className="h-3.5 w-3.5" /> Export หน้านี้ ({rows.length})
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!rows.length}
                onClick={() => exportExcel(rows, CLSBS_COLUMNS, 'gv-carehub-clsbs', 'CLSBS')}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel หน้านี้
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

export default function AdminClsbsPage() {
  const legacy = useAsync(() => gvApi.legacyReport(), []);
  const meta = useAsync(() => gvApi.legacyMeta(), []);
  const [activeTab, setActiveTab] = useState<'service_log' | 'clsbs'>('service_log');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand-charcoal">CLSBS</h1>
          <p className="text-sm text-slate-500">
            ข้อมูลย้อนหลังจากชีต &quot;บริการหลังการขาย&quot; (บันทึกแจ้งเคลม) และ &quot;CLSBS&quot; (สินค้าที่รับเข้าระบบกับผู้จำหน่าย) — อ่านสดจากชีตเดิมโดยตรง
          </p>
        </div>
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
            <KpiCard label="เคสสะสม (บริการหลังการขาย)" value={legacy.data.service_log.total_cases} icon={ClipboardList} />
            <KpiCard label="รายการ CLSBS สะสม" value={legacy.data.clsbs.total_records} icon={Boxes} />
            <KpiCard label="จ่ายให้ผู้จำหน่าย" value={legacy.data.clsbs.money.paid_to_vendor} icon={HandCoins} isCurrency tone="warning" />
            <KpiCard label="ได้รับจากผู้จำหน่าย" value={legacy.data.clsbs.money.received_from_vendor} icon={Landmark} isCurrency tone="good" />
            <KpiCard label="เรียกเก็บจากลูกค้า" value={legacy.data.clsbs.money.charged_to_customer} icon={Wallet} isCurrency />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <KpiCard label="คืนให้ลูกค้า" value={legacy.data.clsbs.money.refunded_to_customer} icon={Coins} isCurrency tone="warning" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>จำนวนเคสรายเดือน (บริการหลังการขาย)</CardTitle>
              </CardHeader>
              <CardContent>
                <MonthlyTrendChart data={legacy.data.service_log.by_month} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>อาการเสียที่พบบ่อย (CLSBS)</CardTitle>
              </CardHeader>
              <CardContent>
                <RankedBarChart
                  data={legacy.data.clsbs.top_symptoms}
                  labelKey="label"
                  valueKey="count"
                  valueLabel="จำนวนครั้ง"
                  emptyTitle="ไม่มีข้อมูลอาการเสีย"
                />
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
                <CardTitle>แบรนด์ที่รับเคลมผ่าน CLSBS บ่อยสุด</CardTitle>
              </CardHeader>
              <CardContent>
                <RankedBarChart
                  data={legacy.data.clsbs.by_brand}
                  labelKey="label"
                  valueKey="count"
                  valueLabel="จำนวนครั้ง"
                  emptyTitle="ไม่มีข้อมูลแบรนด์"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>กลุ่มสินค้าที่รับเคลมผ่าน CLSBS บ่อยสุด</CardTitle>
              </CardHeader>
              <CardContent>
                <RankedBarChart
                  data={legacy.data.clsbs.by_product_group}
                  labelKey="label"
                  valueKey="count"
                  valueLabel="จำนวนครั้ง"
                  emptyTitle="ไม่มีข้อมูลกลุ่มสินค้า"
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
          </div>

          <div className="text-xs text-slate-400">
            ข้อมูลสรุปด้านบนแคชไว้สูงสุด 3 นาทีเพื่อความเร็ว — อัปเดตล่าสุด {formatThaiDateTime(legacy.data.generated_at)}
          </div>
        </>
      )}

      {legacy.isLoading && legacy.data && <LoadingState label="กำลังอัปเดตข้อมูล..." />}

      <div>
        <h2 className="text-lg font-bold text-brand-charcoal">รายละเอียดรายการ</h2>
        <p className="text-sm text-slate-500">ข้อมูลจริงรายเคส ค้นหา กรอง และแบ่งหน้าได้ — ดึงสดจากชีตเดิมโดยตรง</p>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant={activeTab === 'service_log' ? 'brand' : 'outline'} size="sm" onClick={() => setActiveTab('service_log')}>
          บริการหลังการขาย
        </Button>
        <Button type="button" variant={activeTab === 'clsbs' ? 'brand' : 'outline'} size="sm" onClick={() => setActiveTab('clsbs')}>
          CLSBS
        </Button>
      </div>

      {activeTab === 'service_log' ? <ServiceLogDetail meta={meta.data} /> : <ClsbsDetail meta={meta.data} />}
    </div>
  );
}
