'use client';

import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { ImagePicker } from './image-picker';
import type { NewClaimValues } from '@/lib/validators';
import type { MetaResponse } from '@/lib/types';

export function StepProduct({
  issueGroups,
  carriers,
  products,
  productImages,
  onProductImagesChange,
  labelImages,
  onLabelImagesChange,
}: {
  issueGroups: string[];
  carriers: string[];
  products: MetaResponse['products'];
  productImages: File[];
  onProductImagesChange: (files: File[]) => void;
  labelImages: File[];
  onLabelImagesChange: (files: File[]) => void;
}) {
  const {
    register,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<NewClaimValues>();

  const sku = watch('sku');

  useEffect(() => {
    if (!sku) return;
    const match = products.find((p) => p.sku === sku);
    if (!match) return;
    if (!getValues('product_name')) setValue('product_name', match.product_name);
    if (!getValues('model') && match.model) setValue('model', match.model);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sku]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="sku">SKU (ถ้าทราบ)</Label>
          <Input id="sku" list="sku-options" {...register('sku')} placeholder="เช่น UG-001" />
          <datalist id="sku-options">
            {products.map((p) => (
              <option key={p.sku} value={p.sku}>
                {p.product_name}
              </option>
            ))}
          </datalist>
        </div>
        <div>
          <Label htmlFor="product_name">ชื่อสินค้า</Label>
          <Input id="product_name" {...register('product_name')} placeholder="ชื่อสินค้า" />
          {errors.product_name && <p className="mt-1 text-xs text-error">{errors.product_name.message}</p>}
        </div>
        <div>
          <Label htmlFor="model">รุ่น</Label>
          <Input id="model" {...register('model')} placeholder="รุ่นสินค้า (ถ้ามี)" />
        </div>
        <div>
          <Label htmlFor="serial_no">Serial Number (ไม่บังคับ)</Label>
          <Input id="serial_no" {...register('serial_no')} placeholder="S/N หากมีระบุไว้บนสินค้า" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="issue_group">กลุ่มปัญหา</Label>
          <Select id="issue_group" {...register('issue_group')}>
            <option value="">เลือกกลุ่มปัญหา</option>
            {issueGroups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
          {errors.issue_group && <p className="mt-1 text-xs text-error">{errors.issue_group.message}</p>}
        </div>
        <div className="sm:row-span-2">
          <Label htmlFor="issue_detail">รายละเอียดอาการเสีย</Label>
          <Textarea id="issue_detail" {...register('issue_detail')} placeholder="อธิบายอาการเสียโดยละเอียด" rows={4} />
          {errors.issue_detail && <p className="mt-1 text-xs text-error">{errors.issue_detail.message}</p>}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-slate-50/60 p-4">
        <div className="mb-3 text-sm font-semibold text-brand-charcoal">พัสดุขาเข้า (ที่ลูกค้าจะจัดส่งมา)</div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="carrier_in">ขนส่งขาเข้า</Label>
            <Select id="carrier_in" {...register('carrier_in')}>
              <option value="">เลือกขนส่ง</option>
              {carriers.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="tracking_no_in">Tracking Number</Label>
            <Input id="tracking_no_in" {...register('tracking_no_in')} placeholder="เลขพัสดุขาเข้า" />
          </div>
          <div>
            <Label htmlFor="ship_date_in">วันที่ส่งสินค้า</Label>
            <Input id="ship_date_in" type="date" {...register('ship_date_in')} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ImagePicker label="รูปสินค้า" files={productImages} onChange={onProductImagesChange} />
        <ImagePicker label="รูปใบปะหน้าพัสดุ" files={labelImages} onChange={onLabelImagesChange} />
      </div>
    </div>
  );
}
