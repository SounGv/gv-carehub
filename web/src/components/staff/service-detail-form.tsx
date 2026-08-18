'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label, Select, Textarea } from '@/components/ui/input';
import { gvApi, GvApiError } from '@/lib/api';
import { useAuth } from '@/components/layout/auth-provider';
import { serviceDetailSchema, type ServiceDetailValues } from '@/lib/validators';
import type { ClaimItem } from '@/lib/types';

const WARRANTY_TYPES = ['ในประกัน', 'นอกประกัน', 'ประกันเคลมเทียบเท่า', 'อื่นๆ'];
const RESOLUTION_METHODS = ['ซ่อม', 'เปลี่ยนสินค้าใหม่', 'คืนเงิน', 'ส่งเคลมผู้ผลิต', 'อื่นๆ'];

export function ServiceDetailForm({ claimNo, item, onSaved }: { claimNo: string; item: ClaimItem; onSaved: () => void }) {
  const { session } = useAuth();
  const form = useForm<ServiceDetailValues>({
    resolver: zodResolver(serviceDetailSchema),
    defaultValues: {
      inspection_result: item.inspection_result || '',
      warranty_type: item.warranty_type || '',
      resolution_method: item.resolution_method || '',
      repair_cost: item.repair_cost || 0,
      technician_note: item.technician_note || '',
    },
  });

  async function onSubmit(values: ServiceDetailValues) {
    if (!session) return;
    try {
      await gvApi.updateServiceDetail({ claim_no: claimNo, ...values, actor: session.name });
      toast.success('บันทึกผลตรวจสอบแล้ว');
      onSaved();
    } catch (err) {
      toast.error(err instanceof GvApiError ? err.message : 'บันทึกไม่สำเร็จ');
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="inspection_result">ผลตรวจสินค้า</Label>
        <Textarea id="inspection_result" {...form.register('inspection_result')} rows={2} placeholder="สรุปผลการตรวจสอบของช่าง" />
      </div>
      <div>
        <Label htmlFor="warranty_type">ประเภทประกัน</Label>
        <Select id="warranty_type" {...form.register('warranty_type')}>
          <option value="">เลือกประเภทประกัน</option>
          {WARRANTY_TYPES.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="resolution_method">วิธีแก้ไข</Label>
        <Select id="resolution_method" {...form.register('resolution_method')}>
          <option value="">เลือกวิธีแก้ไข</option>
          {RESOLUTION_METHODS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="technician_note">หมายเหตุช่าง</Label>
        <Textarea id="technician_note" {...form.register('technician_note')} rows={2} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" variant="brand" loading={form.formState.isSubmitting}>
          <Save className="h-4 w-4" /> บันทึกผลตรวจสอบ
        </Button>
      </div>
    </form>
  );
}
