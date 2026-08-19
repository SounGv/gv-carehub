'use client';

import { useController, useFormContext } from 'react-hook-form';
import { Input, Label } from '@/components/ui/input';
import { AddressAutocomplete } from '@/components/claims/address-autocomplete';
import type { ThaiAddressMatch } from '@/lib/thai-address';
import type { NewClaimValues } from '@/lib/validators';

export function StepAddress() {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<NewClaimValues>();
  const addressErrors = errors.address;

  const tambon = useController({ name: 'address.tambon', control });
  const amphoe = useController({ name: 'address.amphoe', control });
  const province = useController({ name: 'address.province', control });
  const zipcode = useController({ name: 'address.zipcode', control });

  function fillFromMatch(match: ThaiAddressMatch) {
    setValue('address.tambon', match.tambon, { shouldValidate: true });
    setValue('address.amphoe', match.amphoe, { shouldValidate: true });
    setValue('address.province', match.province, { shouldValidate: true });
    setValue('address.zipcode', match.zipcode, { shouldValidate: true });
  }

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
        <AddressAutocomplete id="tambon" field="tambon" value={tambon.field.value} onChange={tambon.field.onChange} onSelect={fillFromMatch} />
        {addressErrors?.tambon && <p className="mt-1 text-xs text-error">{addressErrors.tambon.message}</p>}
      </div>
      <div>
        <Label htmlFor="amphoe">อำเภอ/เขต</Label>
        <AddressAutocomplete id="amphoe" field="amphoe" value={amphoe.field.value} onChange={amphoe.field.onChange} onSelect={fillFromMatch} />
        {addressErrors?.amphoe && <p className="mt-1 text-xs text-error">{addressErrors.amphoe.message}</p>}
      </div>
      <div>
        <Label htmlFor="province">จังหวัด</Label>
        <AddressAutocomplete id="province" field="province" value={province.field.value} onChange={province.field.onChange} onSelect={fillFromMatch} />
        {addressErrors?.province && <p className="mt-1 text-xs text-error">{addressErrors.province.message}</p>}
      </div>
      <div>
        <Label htmlFor="zipcode">รหัสไปรษณีย์</Label>
        <AddressAutocomplete
          id="zipcode"
          field="zipcode"
          value={zipcode.field.value}
          onChange={zipcode.field.onChange}
          onSelect={fillFromMatch}
          inputMode="numeric"
          maxLength={5}
        />
        {addressErrors?.zipcode && <p className="mt-1 text-xs text-error">{addressErrors.zipcode.message}</p>}
      </div>
    </div>
  );
}
