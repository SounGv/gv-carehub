import { AlertTriangle, MapPin, Phone, Truck, User } from 'lucide-react';
import type { StaffClaim } from '@/lib/types';
import { StatusBadge } from '@/components/claims/status-badge';
import { maskPhone } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const MATCH_LABELS: Record<string, string> = {
  claim_no: 'เลขเคส',
  order_no: 'เลขคำสั่งซื้อ',
  phone: 'เบอร์โทร',
  serial_no: 'Serial',
  sku: 'SKU',
  product_name: 'ชื่อสินค้า',
  tracking_no: 'Tracking',
  customer_name: 'ชื่อลูกค้า',
};

export function isNameOnlyMatch(claim: StaffClaim): boolean {
  return !!claim.matched_fields && claim.matched_fields.length === 1 && claim.matched_fields[0] === 'customer_name';
}

export function ClaimCard({ claim, footer, highlight }: { claim: StaffClaim; footer?: React.ReactNode; highlight?: boolean }) {
  const nameOnly = isNameOnlyMatch(claim);
  const inbound = claim.shipments.find((s) => s.direction === 'inbound');

  return (
    <div className={cn('rounded-xl border bg-white p-4 shadow-sm', highlight ? 'border-brand-lime ring-1 ring-brand-lime' : 'border-border')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-lg font-bold text-brand-charcoal">{claim.claim_no}</div>
          <div className="text-xs text-slate-400">เลขคำสั่งซื้อ {claim.order_no || '-'}</div>
        </div>
        <StatusBadge status={claim.status} />
      </div>

      {claim.matched_fields && claim.matched_fields.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {claim.matched_fields.map((f) => (
            <span key={f} className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
              ตรงกับ {MATCH_LABELS[f] ?? f}
            </span>
          ))}
        </div>
      )}

      {nameOnly && (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" />
          <span>ตรงกับชื่อลูกค้าเพียงอย่างเดียว ห้ามยืนยันรับเข้าคลังจากชื่ออย่างเดียว กรุณาตรวจสอบด้วย Tracking, เลขคำสั่งซื้อ หรือเบอร์โทรเพิ่มเติม</span>
        </div>
      )}

      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex items-center gap-1.5 text-slate-600">
          <User className="h-3.5 w-3.5 flex-none text-slate-400" /> {claim.customer_name || '-'}
        </div>
        <div className="flex items-center gap-1.5 text-slate-600">
          <Phone className="h-3.5 w-3.5 flex-none text-slate-400" /> {maskPhone(claim.phone)}
        </div>
        {inbound && (
          <div className="flex items-center gap-1.5 text-slate-600 sm:col-span-2">
            <Truck className="h-3.5 w-3.5 flex-none text-slate-400" />
            {inbound.carrier || 'ไม่ระบุขนส่ง'} · {inbound.tracking_no || '-'}
          </div>
        )}
        {claim.address && (
          <div className="flex items-start gap-1.5 text-slate-600 sm:col-span-2">
            <MapPin className="mt-0.5 h-3.5 w-3.5 flex-none text-slate-400" /> <span className="line-clamp-2">{claim.address}</span>
          </div>
        )}
      </div>

      {claim.items.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-border pt-3">
          {claim.items.map((item) => (
            <div key={item.item_id} className="rounded-lg bg-slate-50 p-2 text-xs">
              <div className="font-medium text-foreground">
                {item.product_name || '-'} {item.sku && <span className="text-slate-400">({item.sku})</span>}
              </div>
              <div className="text-slate-500">
                {item.serial_no && `S/N: ${item.serial_no} · `}
                {item.issue_group} {item.issue_detail && `· ${item.issue_detail}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {footer && <div className="mt-3 border-t border-border pt-3">{footer}</div>}
    </div>
  );
}
