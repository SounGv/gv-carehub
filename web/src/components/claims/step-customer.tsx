'use client';

import { useFormContext } from 'react-hook-form';
import { Input, Label, Select } from '@/components/ui/input';
import type { NewClaimValues } from '@/lib/validators';

export function StepCustomer({ channels }: { channels: string[] }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<NewClaimValues>();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="channel">ช่องทางการซื้อ</Label>
        <Select id="channel" {...register('channel')}>
          <option value="">เลือกช่องทาง</option>
          {channels.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        {errors.channel && <p className="mt-1 text-xs text-error">{errors.channel.message}</p>}
      </div>
      <div>
        <Label htmlFor="order_no">เลขคำสั่งซื้อ</Label>
        <Input id="order_no" {...register('order_no')} placeholder="เช่น SP123456789" />
        {errors.order_no && <p className="mt-1 text-xs text-error">{errors.order_no.message}</p>}
      </div>
      <div>
        <Label htmlFor="customer_name">ชื่อลูกค้า</Label>
        <Input id="customer_name" {...register('customer_name')} placeholder="ชื่อ-นามสกุล" />
        {errors.customer_name && <p className="mt-1 text-xs text-error">{errors.customer_name.message}</p>}
      </div>
      <div>
        <Label htmlFor="phone">เบอร์โทร</Label>
        <Input id="phone" {...register('phone')} placeholder="08xxxxxxxx" inputMode="numeric" />
        {errors.phone && <p className="mt-1 text-xs text-error">{errors.phone.message}</p>}
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="email">อีเมล (ถ้ามี)</Label>
        <Input id="email" type="email" {...register('email')} placeholder="name@example.com" />
        {errors.email && <p className="mt-1 text-xs text-error">{errors.email.message}</p>}
      </div>
    </div>
  );
}
