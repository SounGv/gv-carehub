'use client';

import { useFormContext } from 'react-hook-form';
import { Input, Label } from '@/components/ui/input';
import type { NewClaimValues } from '@/lib/validators';

export function StepAddress() {
  const {
    register,
    formState: { errors },
  } = useFormContext<NewClaimValues>();
  const addressErrors = errors.address;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="house_no">บ้านเลขที่</Label>
        <Input id="house_no" {...register('address.house_no')} />
        {addressErrors?.house_no && <p className="mt-1 text-xs text-error">{addressErrors.house_no.message}</p>}
      </div>
      <div>
        <Label htmlFor="moo">หมู่</Label>
        <Input id="moo" {...register('address.moo')} />
      </div>
      <div>
        <Label htmlFor="soi">ซอย</Label>
        <Input id="soi" {...register('address.soi')} />
      </div>
      <div>
        <Label htmlFor="road">ถนน</Label>
        <Input id="road" {...register('address.road')} />
      </div>
      <div>
        <Label htmlFor="tambon">ตำบล/แขวง</Label>
        <Input id="tambon" {...register('address.tambon')} />
        {addressErrors?.tambon && <p className="mt-1 text-xs text-error">{addressErrors.tambon.message}</p>}
      </div>
      <div>
        <Label htmlFor="amphoe">อำเภอ/เขต</Label>
        <Input id="amphoe" {...register('address.amphoe')} />
        {addressErrors?.amphoe && <p className="mt-1 text-xs text-error">{addressErrors.amphoe.message}</p>}
      </div>
      <div>
        <Label htmlFor="province">จังหวัด</Label>
        <Input id="province" {...register('address.province')} />
        {addressErrors?.province && <p className="mt-1 text-xs text-error">{addressErrors.province.message}</p>}
      </div>
      <div>
        <Label htmlFor="zipcode">รหัสไปรษณีย์</Label>
        <Input id="zipcode" {...register('address.zipcode')} inputMode="numeric" maxLength={5} />
        {addressErrors?.zipcode && <p className="mt-1 text-xs text-error">{addressErrors.zipcode.message}</p>}
      </div>
    </div>
  );
}
