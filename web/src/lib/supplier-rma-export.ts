import { exportExcel, type ExportColumn } from './export';
import { formatThaiDate } from './formatters';
import type { SupplierRmaBatchItem } from './types';

interface SupplierRmaExportRow {
  serial_no: string;
  product_name: string;
  model: string;
  symptom: string;
  repair_date: string;
  bill_number: string;
  received_from_vendor: number;
  status: string;
}

const DEFAULT_RMA_EXPORT_COLUMNS: ExportColumn<SupplierRmaExportRow>[] = [
  { key: 'serial_no', label: 'Serial Number' },
  { key: 'product_name', label: 'ชื่อสินค้า' },
  { key: 'model', label: 'รุ่น' },
  { key: 'symptom', label: 'อาการเสีย' },
  { key: 'repair_date', label: 'วันที่รับเคลมจากลูกค้า' },
  { key: 'bill_number', label: 'เลขที่บิล/ออเดอร์อ้างอิง' },
  { key: 'received_from_vendor', label: 'เงินที่ได้รับจากผู้จำหน่าย (บาท)' },
  { key: 'status', label: 'สถานะ' },
];

/**
 * Each vendor's own RMA form tends to want different columns in a different
 * order (e.g. some want a warranty-type column, some don't need the bill
 * number). Add a vendor-specific override here as each supplier's real form
 * is confirmed — anything not listed falls back to the default set above,
 * so this never needs a code change just to onboard a vendor with no
 * special requirements.
 */
const VENDOR_RMA_EXPORT_COLUMNS: Record<string, ExportColumn<SupplierRmaExportRow>[]> = {};

function columnsForVendor(vendor: string): ExportColumn<SupplierRmaExportRow>[] {
  return VENDOR_RMA_EXPORT_COLUMNS[vendor] ?? DEFAULT_RMA_EXPORT_COLUMNS;
}

function toExportRows(items: SupplierRmaBatchItem[]): SupplierRmaExportRow[] {
  return items.map((item) => ({
    serial_no: item.serial_no,
    product_name: item.product_name,
    model: item.model,
    symptom: item.symptom,
    repair_date: item.repair_date ? formatThaiDate(item.repair_date) : '',
    bill_number: item.bill_number,
    received_from_vendor: item.received_from_vendor,
    status: item.reject_reason ? `ปฏิเสธ: ${item.reject_reason}` : item.returned_from_vendor_date ? 'ได้รับคืนแล้ว' : 'รอผลจากผู้จำหน่าย',
  }));
}

export function exportSupplierRmaBatchExcel(batchNo: string, vendor: string, items: SupplierRmaBatchItem[]) {
  const rows = toExportRows(items);
  exportExcel(rows, columnsForVendor(vendor), batchNo, batchNo.slice(0, 31));
}

function escapeHtml(value: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return value.replace(/[&<>"']/g, (c) => map[c] ?? c);
}

/**
 * No PDF library in this app yet — the browser's own print-to-PDF (via
 * window.print() on a purpose-built print window) produces a perfectly
 * usable document for emailing a vendor without adding a new dependency.
 */
export function exportSupplierRmaBatchPdf(batchNo: string, vendor: string, items: SupplierRmaBatchItem[]) {
  const rows = toExportRows(items);
  const columns = columnsForVendor(vendor);
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;

  const headHtml = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('');
  const bodyHtml = rows
    .map((row) => `<tr>${columns.map((c) => `<td>${escapeHtml(String(row[c.key] ?? ''))}</td>`).join('')}</tr>`)
    .join('');

  win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(batchNo)}</title>
<style>
  body { font-family: Arial, 'Tahoma', sans-serif; padding: 24px; color: #221E1A; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  p.meta { font-size: 12px; color: #555; margin: 0 0 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
  th { background: #f4f6f9; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>ใบส่งเคลมสินค้าคืนผู้จำหน่าย — ${escapeHtml(batchNo)}</h1>
  <p class="meta">ผู้จำหน่าย: ${escapeHtml(vendor || '-')} &nbsp;·&nbsp; จำนวน ${rows.length} รายการ &nbsp;·&nbsp; พิมพ์เมื่อ ${escapeHtml(formatThaiDate(new Date().toISOString()))}</p>
  <table>
    <thead><tr>${headHtml}</tr></thead>
    <tbody>${bodyHtml}</tbody>
  </table>
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`);
  win.document.close();
}
