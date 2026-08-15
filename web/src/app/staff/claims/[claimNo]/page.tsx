'use client';

import { useParams } from 'next/navigation';
import { Mail, MapPin, Package, Phone, ShoppingBag, User, Wallet } from 'lucide-react';
import { gvApi } from '@/lib/api';
import { useAsync } from '@/hooks/use-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { StatusBadge } from '@/components/claims/status-badge';
import { StatusActions } from '@/components/staff/status-actions';
import { HistoryLog } from '@/components/staff/history-log';
import { ServiceDetailForm } from '@/components/staff/service-detail-form';
import { ImageGallery } from '@/components/staff/image-gallery';
import { formatCurrency, formatThaiDateTime } from '@/lib/formatters';

export default function StaffClaimDetailPage() {
  const params = useParams<{ claimNo: string }>();
  const claimNo = params.claimNo;
  const detail = useAsync(() => gvApi.claimDetail(claimNo), [claimNo]);

  if (detail.isLoading && !detail.data) return <LoadingState />;
  if (detail.error && !detail.data) return <ErrorState message={detail.error} onRetry={detail.refetch} />;
  if (!detail.data) return null;

  const { claim, items, shipments, history } = detail.data;
  const item = items[0];
  const inbound = shipments.filter((s) => s.direction === 'inbound');
  const outbound = shipments.filter((s) => s.direction === 'outbound');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-brand-charcoal">{claim.claim_no}</h1>
          <p className="text-sm text-slate-500">แจ้งเคลมเมื่อ {formatThaiDateTime(claim.submitted_at)}</p>
        </div>
        <StatusBadge status={claim.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>เปลี่ยนสถานะเคส</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusActions claimNo={claim.claim_no} currentStatus={claim.status} onChanged={detail.refetch} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4" /> ข้อมูลลูกค้าและคำสั่งซื้อ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-slate-400" /> {claim.customer_name}
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-slate-400" /> {claim.phone}
            </div>
            {claim.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-slate-400" /> {claim.email}
              </div>
            )}
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-3.5 w-3.5 text-slate-400" /> {claim.channel || '-'} · {claim.order_no}
            </div>
            <div className="flex items-center gap-2">
              <Wallet className="h-3.5 w-3.5 text-slate-400" /> มูลค่าสินค้าเคลม {formatCurrency(claim.product_value)}
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 flex-none text-slate-400" /> {claim.address || '-'}
            </div>
            {claim.note && <div className="rounded-lg bg-slate-50 p-2 text-xs text-slate-500">หมายเหตุ: {claim.note}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-4 w-4" /> ข้อมูลสินค้าและอาการเสีย
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {item ? (
              <>
                <div className="font-medium">
                  {item.product_name} {item.sku && <span className="text-slate-400">({item.sku})</span>}
                </div>
                <div className="text-slate-500">รุ่น: {item.model || '-'}</div>
                <div className="text-slate-500">Serial: {item.serial_no || 'ไม่ระบุ'}</div>
                <div className="text-slate-500">กลุ่มปัญหา: {item.issue_group}</div>
                <div className="rounded-lg bg-slate-50 p-2 text-xs">{item.issue_detail}</div>
              </>
            ) : (
              <p className="text-slate-400">ไม่มีข้อมูลสินค้า</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>พัสดุขาเข้า</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {inbound.length === 0 && <p className="text-slate-400">ไม่มีข้อมูลพัสดุขาเข้า</p>}
            {inbound.map((s) => (
              <div key={s.shipment_id} className="rounded-lg bg-slate-50 p-2">
                <div>
                  {s.carrier || 'ไม่ระบุขนส่ง'} · {s.tracking_no}
                </div>
                <div className="text-xs text-slate-400">ส่งเมื่อ {formatThaiDateTime(s.ship_date)}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>พัสดุขาออก</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {outbound.length === 0 && <p className="text-slate-400">ยังไม่มีข้อมูลจัดส่งคืน</p>}
            {outbound.map((s) => (
              <div key={s.shipment_id} className="rounded-lg bg-slate-50 p-2">
                <div>
                  {s.carrier} · {s.tracking_no}
                </div>
                <div className="text-xs text-slate-400">ส่งเมื่อ {formatThaiDateTime(s.ship_date)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {item && (
        <Card>
          <CardHeader>
            <CardTitle>รูปภาพ</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-6">
            <ImageGallery label="รูปสินค้า" urls={item.product_image_urls} />
            <ImageGallery label="รูปใบปะหน้าพัสดุ" urls={item.label_image_urls} />
          </CardContent>
        </Card>
      )}

      {item && (
        <Card>
          <CardHeader>
            <CardTitle>ผลตรวจสอบ / วิธีแก้ไข / ค่าใช้จ่าย</CardTitle>
          </CardHeader>
          <CardContent>
            <ServiceDetailForm claimNo={claim.claim_no} item={item} onSaved={detail.refetch} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>ประวัติการเปลี่ยนสถานะ</CardTitle>
        </CardHeader>
        <CardContent>
          <HistoryLog history={history} />
        </CardContent>
      </Card>
    </div>
  );
}
