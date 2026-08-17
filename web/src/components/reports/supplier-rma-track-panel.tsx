'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, FileSpreadsheet, FileText, Save, X } from 'lucide-react';
import { gvApi } from '@/lib/api';
import { useAsync } from '@/hooks/use-async';
import { useAuth } from '@/components/layout/auth-provider';
import { FilterBar, FilterField } from '@/components/ui/filter-bar';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { formatCurrency, formatNumber, formatThaiDate } from '@/lib/formatters';
import { exportSupplierRmaBatchExcel, exportSupplierRmaBatchPdf } from '@/lib/supplier-rma-export';
import type { SupplierRmaBatchItem } from '@/lib/types';

const STATUS_OPTIONS = ['รอผลจากผู้จำหน่าย', 'ได้รับคืนบางส่วน', 'ได้รับคืนครบแล้ว', 'ปฏิเสธ'];

const STATUS_TONE: Record<string, 'success' | 'warning' | 'default' | 'error'> = {
  'ได้รับคืนครบแล้ว': 'success',
  'ได้รับคืนบางส่วน': 'warning',
  'รอผลจากผู้จำหน่าย': 'default',
  'ปฏิเสธ': 'error',
};

function ItemUpdateRow({ item, onSaved }: { item: SupplierRmaBatchItem; onSaved: () => void }) {
  const { session } = useAuth();
  const [returnedDate, setReturnedDate] = useState(item.returned_from_vendor_date ? item.returned_from_vendor_date.slice(0, 10) : '');
  const [receivedMoney, setReceivedMoney] = useState(String(item.received_from_vendor || 0));
  const [returnedSn, setReturnedSn] = useState(item.returned_sn || '');
  const [rejectReason, setRejectReason] = useState(item.reject_reason || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!session) return;
    setSaving(true);
    try {
      await gvApi.supplierRmaUpdateItem({
        id: item.id,
        returned_from_vendor_date: returnedDate || undefined,
        received_from_vendor: Number(receivedMoney || 0),
        returned_sn: returnedSn,
        reject_reason: rejectReason || undefined,
        actor: session.name,
      });
      toast.success(`บันทึกผล ID ${item.id} แล้ว`);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{item.id}</TableCell>
      <TableCell className="max-w-[180px] truncate" title={item.product_name}>
        {item.product_name || '-'}
      </TableCell>
      <TableCell className="font-mono text-xs">{item.serial_no || '-'}</TableCell>
      <TableCell>
        <Input type="date" className="h-8 text-xs" value={returnedDate} onChange={(e) => setReturnedDate(e.target.value)} />
      </TableCell>
      <TableCell>
        <Input type="text" inputMode="numeric" className="h-8 w-24 text-xs" value={returnedSn} onChange={(e) => setReturnedSn(e.target.value)} placeholder="SN ที่ได้คืน" />
      </TableCell>
      <TableCell>
        <Input type="number" min={0} className="h-8 w-24 text-right text-xs" value={receivedMoney} onChange={(e) => setReceivedMoney(e.target.value)} />
      </TableCell>
      <TableCell>
        <Input type="text" className="h-8 text-xs" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="เหตุผล (ถ้าปฏิเสธ)" />
      </TableCell>
      <TableCell>
        <Button type="button" size="sm" variant="outline" loading={saving} onClick={handleSave}>
          <Save className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function BatchDetail({ batchNo, onClose }: { batchNo: string; onClose: () => void }) {
  const { session } = useAuth();
  const detail = useAsync(() => gvApi.supplierRmaBatchDetail(batchNo), [batchNo]);
  const [statusSaving, setStatusSaving] = useState(false);

  async function handleStatusChange(status: string) {
    if (!session) return;
    setStatusSaving(true);
    try {
      await gvApi.supplierRmaUpdateBatchStatus({ batch_no: batchNo, status, actor: session.name });
      toast.success(`เปลี่ยนสถานะชุด ${batchNo} เป็น "${status}" แล้ว`);
      detail.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'เปลี่ยนสถานะไม่สำเร็จ');
    } finally {
      setStatusSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>ชุดเคลม {batchNo}</CardTitle>
          {detail.data && <p className="mt-1 text-xs text-slate-400">ผู้จำหน่าย: {detail.data.vendor || '-'}</p>}
        </div>
        <div className="flex items-center gap-2">
          {detail.data && (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => exportSupplierRmaBatchExcel(batchNo, detail.data!.vendor, detail.data!.items)}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => exportSupplierRmaBatchPdf(batchNo, detail.data!.vendor, detail.data!.items)}
              >
                <FileText className="h-3.5 w-3.5" /> PDF
              </Button>
              <Select className="h-8 w-48 text-xs" value={detail.data.status} disabled={statusSaving} onChange={(e) => handleStatusChange(e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </>
          )}
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {detail.isLoading && !detail.data && <LoadingState />}
        {detail.error && !detail.data && <ErrorState message={detail.error} onRetry={detail.refetch} />}
        {detail.data && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>สินค้า</TableHead>
                <TableHead>Serial ส่งไป</TableHead>
                <TableHead>วันที่ได้คืน</TableHead>
                <TableHead>Serial ที่ได้คืน</TableHead>
                <TableHead className="text-right">เงินที่ได้รับ</TableHead>
                <TableHead>เหตุผล (ถ้าปฏิเสธ)</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.data.items.map((item) => (
                <ItemUpdateRow key={item.id} item={item} onSaved={detail.refetch} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function SupplierRmaTrackPanel() {
  const [vendor, setVendor] = useState('');
  const [status, setStatus] = useState('');
  const [openBatch, setOpenBatch] = useState<string | null>(null);
  const result = useAsync(() => gvApi.supplierRmaBatches({ vendor, status }), [vendor, status]);
  const batches = result.data?.batches ?? [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">ชุดเคลมทั้งหมดที่เคยส่งไปผู้จำหน่าย — คลิกที่แถวเพื่อดู/อัปเดตรายละเอียดแต่ละชิ้น</p>

      <FilterBar>
        <FilterField label="ผู้จำหน่าย">
          <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="ค้นหาชื่อผู้จำหน่าย" />
        </FilterField>
        <FilterField label="สถานะ">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">ทั้งหมด</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </FilterField>
      </FilterBar>

      {result.isLoading && !result.data && <LoadingState />}
      {result.error && !result.data && <ErrorState message={result.error} onRetry={result.refetch} />}
      {result.data && batches.length === 0 && <EmptyState title="ยังไม่มีชุดเคลมที่ตรงกับตัวกรอง" description="สร้างชุดเคลมได้ที่แท็บ 'สร้างชุดเคลม'" />}

      {result.data && batches.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>เลขที่ชุด</TableHead>
              <TableHead>ผู้จำหน่าย</TableHead>
              <TableHead className="text-right">จำนวนรายการ</TableHead>
              <TableHead>วันที่ส่ง</TableHead>
              <TableHead className="text-right">ค้าง (วัน)</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">ยังไม่ได้คืน (บาท)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.map((b) => (
              <TableRow key={b.batch_no} className="cursor-pointer" onClick={() => setOpenBatch(b.batch_no)}>
                <TableCell className="font-medium">{b.batch_no}</TableCell>
                <TableCell>{b.vendor || '-'}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(b.item_count)}</TableCell>
                <TableCell>{b.sent_date ? formatThaiDate(b.sent_date) : '-'}</TableCell>
                <TableCell className="text-right tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    {b.overdue && <AlertTriangle className="h-3.5 w-3.5 text-error" />}
                    {b.days_since_sent ?? '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_TONE[b.status] ?? 'default'}>{b.status}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(b.total_paid_to_vendor - b.total_received_from_vendor)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {openBatch && <BatchDetail batchNo={openBatch} onClose={() => setOpenBatch(null)} />}
    </div>
  );
}
