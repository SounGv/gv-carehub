'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { UserCircle2 } from 'lucide-react';
import { gvApi, GvApiError } from '@/lib/api';
import { useAuth } from '@/components/layout/auth-provider';
import { STAFF_NAMES } from '@/lib/auth';

/** Who talked to the customer and accepted this case — separate from the
 * "actor" stamped on receive/test/ship actions, since one person may take
 * ownership of a case while a different person physically receives/tests it. */
export function OwnerSelect({ claimNo, owner, onChanged }: { claimNo: string; owner: string; onChanged: () => void }) {
  const { session } = useAuth();
  const [saving, setSaving] = useState(false);

  async function handleChange(next: string) {
    setSaving(true);
    try {
      await gvApi.setOwner({ claim_no: claimNo, owner: next, actor: session.name });
      toast.success(next ? `กำหนดเจ้าของเคสเป็น ${next} แล้ว` : 'ล้างเจ้าของเคสแล้ว');
      onChanged();
    } catch (err) {
      toast.error(err instanceof GvApiError ? err.message : 'บันทึกเจ้าของเคสไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <UserCircle2 className="h-4 w-4 flex-none text-slate-400" />
      <span className="text-slate-500">เจ้าของเคส (ผู้รับเรื่อง/คุยกับลูกค้า):</span>
      <select
        value={owner}
        disabled={saving}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-brand-charcoal outline-none disabled:opacity-50"
      >
        <option value="">ยังไม่ระบุ</option>
        {STAFF_NAMES.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}
