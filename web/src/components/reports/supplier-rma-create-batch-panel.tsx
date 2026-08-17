'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, PackagePlus, Search, X } from 'lucide-react';
import { gvApi, type SupplierRmaCandidateFilters } from '@/lib/api';
import { useAsync } from '@/hooks/use-async';
import { useAuth } from '@/components/layout/auth-provider';
import { FilterBar, FilterField } from '@/components/ui/filter-bar';
import { Input, Label, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { formatThaiDate, formatNumber } from '@/lib/formatters';

const PAGE_SIZE = 50;
const EMPTY_FILTERS: SupplierRmaCandidateFilters = { from: '', to: '', brand: '', product_group: '', q: '' };

export function SupplierRmaCreateBatchPanel({ meta }: { meta: { brands: string[]; product_groups: string[] } | null }) {
  const { session } = useAuth();
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [vendor, setVendor] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const result = useAsync(
    () => gvApi.supplierRmaCandidates({ ...applied, page: String(page), page_size: String(PAGE_SIZE) }),
    [applied, page],
  );
  const rows = useMemo(() => result.data?.rows ?? [], [result.data]);
  const totalPages = result.data ? Math.max(1, Math.ceil(result.data.total_count / PAGE_SIZE)) : 1;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setApplied(draft);
    setPage(1);
  }

  /** Date/dropdown filters apply immediately on change — only the free-text
   * search box waits for the "ค้นหา" submit, since applying per keystroke
   * would fire a request per character. Without this, picking a date range
   * and never clicking "ค้นหา" silently leaves every result unfiltered. */
  function applyChange(patch: Partial<SupplierRmaCandidateFilters>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    setApplied(next);
    setPage(1);
  }

  function handleClear() {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(1);
  }

  function toggleOne(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage() {
    setSelected((s) => {
      const allSelected = rows.every((r) => s.has(r.id));
      const next = new Set(s);
      rows.forEach((r) => (allSelected ? next.delete(r.id) : next.add(r.id)));
      return next;
    });
  }

  async function handleCreateBatch() {
    if (!session) return;
    if (!vendor.trim()) {
      toast.error('กรุณาระบุชื่อผู้จำหน่าย/ผู้ผลิต');
      return;
    }
    if (selected.size === 0) {
      toast.error('กรุณาเลือกอย่างน้อย 1 รายการ');
      return;
    }
    setSubmitting(true);
    try {
      const res = await gvApi.supplierRmaCreateBatch({ ids: Array.from(selected), vendor: vendor.trim(), actor: session.name });
      toast.success(`สร้างชุดเคลม ${res.batch_no} สำเร็จ (${res.item_count} รายการ) — ดูสถานะได้ที่แท็บ "ติดตามสถานะ"`, { duration: 8000 });
      if (res.missing_ids.length) toast.warning(`ไม่พบ ${res.missing_ids.length} รายการ (อาจถูกแก้ไขไปแล้ว): ${res.missing_ids.join(', ')}`);
      setSelected(new Set());
      setVendor('');
      result.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'สร้างชุดเคลมไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  }

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        รายการที่ยังไม่ได้ส่งไปเคลมกับผู้จำหน่าย (ยังไม่มี &quot;วันที่ส่งสินค้าให้ผู้จำหน่าย&quot; ในชีต CLSBS) — เลือกรายการที่ต้องการจริง แล้วสร้างชุดเคลมส่งไปพร้อมกัน
      </p>

      <form onSubmit={handleSearch}>
        <FilterBar>
          <FilterField label="วันที่รับซ่อมเริ่มต้น">
            <Input type="date" value={draft.from} onChange={(e) => applyChange({ from: e.target.value })} />
          </FilterField>
          <FilterField label="วันที่รับซ่อมสิ้นสุด">
            <Input type="date" value={draft.to} onChange={(e) => applyChange({ to: e.target.value })} />
          </FilterField>
          <FilterField label="แบรนด์">
            <Select value={draft.brand} onChange={(e) => applyChange({ brand: e.target.value })}>
              <option value="">ทั้งหมด</option>
              {(meta?.brands ?? []).map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="กลุ่มสินค้า">
            <Select value={draft.product_group} onChange={(e) => applyChange({ product_group: e.target.value })}>
              <option value="">ทั้งหมด</option>
              {(meta?.product_groups ?? []).map((g) => (
                <option key={g} value={g}>
                  {g}
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

      {result.data && rows.length === 0 && <EmptyState title="ไม่พบรายการที่รอส่งเคลมตามตัวกรองที่เลือก" />}

      {result.data && rows.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input type="checkbox" checked={allOnPageSelected} onChange={toggleAllOnPage} className="h-4 w-4" />
                </TableHead>
                <TableHead>ID</TableHead>
                <TableHead>วันที่รับซ่อม</TableHead>
                <TableHead>ลูกค้า</TableHead>
                <TableHead>สินค้า</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>แบรนด์</TableHead>
                <TableHead>อาการเสีย</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className={selected.has(row.id) ? 'bg-lime-50/60' : undefined}>
                  <TableCell>
                    <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleOne(row.id)} className="h-4 w-4" />
                  </TableCell>
                  <TableCell className="font-medium">{row.id}</TableCell>
                  <TableCell>{row.repair_date ? formatThaiDate(row.repair_date) : '-'}</TableCell>
                  <TableCell>{row.customer_name || '-'}</TableCell>
                  <TableCell className="max-w-[220px] truncate" title={row.product_name}>
                    {row.product_name || '-'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.serial_no || '-'}</TableCell>
                  <TableCell>{row.brand || '-'}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={row.symptom}>
                    {row.symptom || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              หน้า {page} จาก {formatNumber(totalPages)} (ทั้งหมด {formatNumber(result.data.total_count)} รายการ)
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" /> ก่อนหน้า
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                ถัดไป <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-white p-4 shadow-sm">
        <div className="min-w-[220px] flex-1">
          <Label htmlFor="vendor">ผู้จำหน่าย / ผู้ผลิตที่จะส่งไป</Label>
          <Input id="vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="เช่น UGREEN Thailand, FANTECH Distributor" />
        </div>
        <div className="text-xs text-slate-400">เลือกไว้แล้ว {selected.size} รายการ</div>
        <Button type="button" variant="brand" loading={submitting} disabled={selected.size === 0} onClick={handleCreateBatch}>
          <PackagePlus className="h-4 w-4" /> สร้างชุดเคลม ({selected.size})
        </Button>
      </div>
    </div>
  );
}
