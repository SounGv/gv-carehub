'use client';

import { useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { Download, FileSpreadsheet, Search, X } from 'lucide-react';
import { gvApi, type ReportFilters } from '@/lib/api';
import { useAsync } from '@/hooks/use-async';
import { useMeta } from '@/hooks/use-meta';
import { FilterBar, FilterField } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { StatusWorkflowChart } from '@/components/dashboard/charts';
import { formatCurrency, formatNumber, formatPercent, formatThaiDateTime } from '@/lib/formatters';
import { exportCsv, exportExcel } from '@/lib/export';
import { CLAIM_STATUSES, type ReportRow } from '@/lib/types';

const today = () => format(new Date(), 'yyyy-MM-dd');
const defaultFrom = () => format(subDays(new Date(), 29), 'yyyy-MM-dd');

const EMPTY_FILTERS: ReportFilters = { from: defaultFrom(), to: today(), sku: '', model: '', brand: '', status: '', carrier: '' };

type FlatReportRow = Omit<ReportRow, 'status_counts'> & Record<string, string | number | null>;

const BASE_COLUMNS: { key: keyof FlatReportRow; label: string }[] = [
  { key: 'sku', label: 'SKU' },
  { key: 'product_name', label: 'ชื่อสินค้า' },
  { key: 'model', label: 'รุ่น' },
  { key: 'qty_sold', label: 'จำนวนขาย' },
  { key: 'qty_claimed', label: 'จำนวนเคลม' },
  { key: 'defect_rate', label: 'เปอร์เซ็นต์เสีย (%)' },
];

const STATUS_COLUMNS: { key: keyof FlatReportRow; label: string }[] = CLAIM_STATUSES.map((s) => ({ key: s, label: s }));

const TAIL_COLUMNS: { key: keyof FlatReportRow; label: string }[] = [{ key: 'damage_value', label: 'มูลค่าความเสียหาย' }];

const COLUMNS = [...BASE_COLUMNS, ...STATUS_COLUMNS, ...TAIL_COLUMNS];

const NUMERIC_KEYS = new Set([
  'qty_sold',
  'qty_claimed',
  'defect_rate',
  'damage_value',
  ...CLAIM_STATUSES,
]);

export default function AdminReportsPage() {
  const [draft, setDraft] = useState<ReportFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<ReportFilters>(EMPTY_FILTERS);
  const meta = useMeta();
  const report = useAsync(() => gvApi.report(applied), [applied]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setApplied(draft);
  }

  function handleClear() {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
  }

  const rows = useMemo(() => report.data?.rows ?? [], [report.data]);
  const flatRows: FlatReportRow[] = useMemo(
    () =>
      rows.map((row) => {
        const { status_counts, ...rest } = row;
        return { ...rest, ...status_counts };
      }),
    [rows],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-brand-charcoal">รายงาน SKU</h1>
        <p className="text-sm text-slate-500">สรุปจำนวนขาย เคลม และมูลค่าความเสียหายรายสินค้า ครบทุกสถานะ ตามตัวกรองที่เลือก</p>
      </div>

      <form onSubmit={handleSearch}>
        <FilterBar>
          <FilterField label="วันที่เริ่มต้น">
            <input
              type="date"
              className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime"
              value={draft.from}
              max={draft.to}
              onChange={(e) => setDraft((f) => ({ ...f, from: e.target.value }))}
            />
          </FilterField>
          <FilterField label="วันที่สิ้นสุด">
            <input
              type="date"
              className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime"
              value={draft.to}
              min={draft.from}
              onChange={(e) => setDraft((f) => ({ ...f, to: e.target.value }))}
            />
          </FilterField>
          <FilterField label="SKU">
            <Select value={draft.sku} onChange={(e) => setDraft((f) => ({ ...f, sku: e.target.value }))}>
              <option value="">ทั้งหมด</option>
              {(meta.data?.skus ?? []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="รุ่นสินค้า">
            <Select value={draft.model} onChange={(e) => setDraft((f) => ({ ...f, model: e.target.value }))}>
              <option value="">ทั้งหมด</option>
              {(meta.data?.models ?? []).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="แบรนด์">
            <Select value={draft.brand} onChange={(e) => setDraft((f) => ({ ...f, brand: e.target.value }))}>
              <option value="">ทั้งหมด</option>
              {(meta.data?.brands ?? []).map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="สถานะ">
            <Select value={draft.status} onChange={(e) => setDraft((f) => ({ ...f, status: e.target.value }))}>
              <option value="">ทั้งหมด</option>
              {(meta.data?.statuses ?? []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="ขนส่ง">
            <Select value={draft.carrier} onChange={(e) => setDraft((f) => ({ ...f, carrier: e.target.value }))}>
              <option value="">ทั้งหมด</option>
              {(meta.data?.carriers ?? []).map((c) => (
                <option key={c} value={c}>
                  {c}
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-slate-400">
          {report.lastUpdatedAt && `อัปเดตล่าสุด ${formatThaiDateTime(report.lastUpdatedAt)}`}
          {report.data && ` · พบ ${formatNumber(report.data.summary.total_sku)} SKU · มูลค่าความเสียหายรวม ${formatCurrency(report.data.summary.total_damage_value)}`}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={!rows.length} onClick={() => exportCsv(flatRows, COLUMNS, 'gv-carehub-sku-report')}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={!rows.length} onClick={() => exportExcel(flatRows, COLUMNS, 'gv-carehub-sku-report', 'SKU Report')}>
            <FileSpreadsheet className="h-3.5 w-3.5" /> Export Excel
          </Button>
        </div>
      </div>

      {report.isLoading && !report.data && <LoadingState />}
      {report.error && !report.data && <ErrorState message={report.error} onRetry={report.refetch} />}
      {report.data && rows.length === 0 && <EmptyState title="ไม่พบข้อมูลตามตัวกรองที่เลือก" />}

      {report.data && rows.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>สรุปจำนวนเคสตามสถานะ (ทุกสถานะ ตามตัวกรองที่เลือก)</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusWorkflowChart data={report.data.summary.by_status} />
            </CardContent>
          </Card>

          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((c) => (
                  <TableHead key={String(c.key)} className={NUMERIC_KEYS.has(String(c.key)) ? 'text-right' : ''}>
                    {c.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {flatRows.map((row) => (
                <TableRow key={row.sku || row.product_name}>
                  <TableCell className="font-medium">{row.sku || '-'}</TableCell>
                  <TableCell>{row.product_name || '-'}</TableCell>
                  <TableCell>{row.model || '-'}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(row.qty_sold as number)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(row.qty_claimed as number)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPercent(row.defect_rate as number | null)}</TableCell>
                  {CLAIM_STATUSES.map((s) => (
                    <TableCell key={s} className="text-right tabular-nums">
                      {formatNumber((row[s] as number) || 0)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right tabular-nums">{formatCurrency(row.damage_value as number)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
