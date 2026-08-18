import { z } from 'zod';

const normalizedPhone = z
  .string()
  .min(1, 'กรุณาระบุเบอร์โทร')
  .transform((v) => v.replace(/[^0-9]/g, ''))
  .refine((v) => v.length >= 9 && v.length <= 10, 'กรุณาระบุเบอร์โทรให้ถูกต้อง (9-10 หลัก)');

export const customerStepSchema = z.object({
  channel: z.string().min(1, 'กรุณาเลือกช่องทางการซื้อ'),
  order_no: z.string().min(1, 'กรุณาระบุเลขคำสั่งซื้อ'),
  customer_name: z.string().min(2, 'กรุณาระบุชื่อลูกค้า'),
  phone: normalizedPhone,
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง').optional().or(z.literal('')),
});

export type CustomerStepValues = z.infer<typeof customerStepSchema>;

export const productStepSchema = z.object({
  sku: z.string().optional().or(z.literal('')),
  product_name: z.string().min(1, 'กรุณาระบุชื่อสินค้า'),
  model: z.string().optional().or(z.literal('')),
  serial_no: z.string().optional().or(z.literal('')), // Optional: not every product carries a serial number
  issue_group: z.string().min(1, 'กรุณาเลือกกลุ่มปัญหา'),
  issue_detail: z.string().min(3, 'กรุณาระบุรายละเอียดอาการเสีย'),
  carrier_in: z.string().optional().or(z.literal('')),
  tracking_no_in: z.string().optional().or(z.literal('')),
  ship_date_in: z.string().optional().or(z.literal('')),
});

export type ProductStepValues = z.infer<typeof productStepSchema>;

export const addressStepSchema = z.object({
  house_no: z.string().min(1, 'กรุณาระบุบ้านเลขที่'),
  moo: z.string().optional().or(z.literal('')),
  soi: z.string().optional().or(z.literal('')),
  road: z.string().optional().or(z.literal('')),
  tambon: z.string().min(1, 'กรุณาระบุตำบล/แขวง'),
  amphoe: z.string().min(1, 'กรุณาระบุอำเภอ/เขต'),
  province: z.string().min(1, 'กรุณาระบุจังหวัด'),
  zipcode: z
    .string()
    .min(5, 'รหัสไปรษณีย์ต้องมี 5 หลัก')
    .max(5, 'รหัสไปรษณีย์ต้องมี 5 หลัก')
    .regex(/^[0-9]+$/, 'รหัสไปรษณีย์ต้องเป็นตัวเลข'),
});

export type AddressStepValues = z.infer<typeof addressStepSchema>;

export const newClaimSchema = customerStepSchema.merge(productStepSchema).extend({
  address: addressStepSchema,
});

export type NewClaimValues = z.infer<typeof newClaimSchema>;

export const shipFormSchema = z.object({
  claim_no: z.string().min(1, 'กรุณาเลือกเคส'),
  carrier: z.string().min(1, 'กรุณาเลือกขนส่ง'),
  tracking_no: z.string().min(3, 'กรุณาระบุเลข Tracking'),
  ship_date: z.string().min(1, 'กรุณาระบุวันที่ส่ง'),
  note: z.string().optional().or(z.literal('')),
  replacement_sku: z.string().optional().or(z.literal('')),
});

export type ShipFormValues = z.infer<typeof shipFormSchema>;

export const serviceDetailSchema = z.object({
  inspection_result: z.string().optional().or(z.literal('')),
  warranty_type: z.string().optional().or(z.literal('')),
  resolution_method: z.string().optional().or(z.literal('')),
  repair_cost: z.coerce.number().min(0, 'ค่าใช้จ่ายต้องไม่ติดลบ').optional(),
  technician_note: z.string().optional().or(z.literal('')),
});

export type ServiceDetailValues = z.infer<typeof serviceDetailSchema>;

export const pendingReviewSchema = z.object({
  tracking_no: z.string().optional().or(z.literal('')),
  order_no: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  note: z.string().min(1, 'กรุณาระบุหมายเหตุ'),
});

export type PendingReviewValues = z.infer<typeof pendingReviewSchema>;

export function isValidThaiZipcode(value: string): boolean {
  return /^[0-9]{5}$/.test(value);
}
