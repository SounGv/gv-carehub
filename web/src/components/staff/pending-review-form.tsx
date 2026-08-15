'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ClipboardPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { gvApi, GvApiError } from '@/lib/api';

export function PendingReviewForm({ query, actor, onDone }: { query: string; actor: string; onDone: () => void }) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) {
      toast.error('กรุณาระบุหมายเหตุ');
      return;
    }
    setSubmitting(true);
    try {
      await gvApi.createPending({ tracking_no: query, note, actor });
      toast.success('บันทึกรายการรอตรวจสอบแล้ว');
      onDone();
    } catch (err) {
      toast.error(err instanceof GvApiError ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-brand-charcoal">
        <ClipboardPlus className="h-4 w-4" /> สร้างรายการ &ldquo;รอตรวจสอบ&rdquo;
      </div>
      <p className="text-xs text-slate-500">
        ใช้เมื่อรับพัสดุแล้วแต่หาเคสไม่พบ ระบบจะ<strong>ไม่</strong>สร้างเลข GV ใหม่โดยอัตโนมัติ — บันทึกไว้ให้ผู้ดูแลตรวจสอบภายหลัง
      </p>
      <div>
        <Label htmlFor="pending-code">ค่าที่ค้นหา</Label>
        <Input id="pending-code" value={query} disabled />
      </div>
      <div>
        <Label htmlFor="pending-note">หมายเหตุ</Label>
        <Textarea id="pending-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น พัสดุไม่มีเลขเคสแนบมา ระบุเบอร์โทรผู้ส่ง..." rows={3} />
      </div>
      <Button type="submit" variant="brand" loading={submitting}>
        บันทึกรอตรวจสอบ
      </Button>
    </form>
  );
}
