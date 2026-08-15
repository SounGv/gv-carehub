import { describe, expect, it } from 'vitest';
import { addressStepSchema, customerStepSchema, newClaimSchema, shipFormSchema } from './validators';

describe('customerStepSchema', () => {
  it('normalizes a formatted phone number to digits only', () => {
    const result = customerStepSchema.parse({
      channel: 'Shopee',
      order_no: 'SP123',
      customer_name: 'สมชาย ใจดี',
      phone: '081-234-5678',
      email: '',
    });
    expect(result.phone).toBe('0812345678');
  });

  it('rejects a phone number that is too short', () => {
    const result = customerStepSchema.safeParse({
      channel: 'Shopee',
      order_no: 'SP123',
      customer_name: 'สมชาย ใจดี',
      phone: '12345',
    });
    expect(result.success).toBe(false);
  });
});

describe('addressStepSchema', () => {
  it('requires a 5-digit zipcode', () => {
    const base = { house_no: '99', tambon: 'บางรัก', amphoe: 'บางรัก', province: 'กรุงเทพมหานคร' };
    expect(addressStepSchema.safeParse({ ...base, zipcode: '1060' }).success).toBe(false);
    expect(addressStepSchema.safeParse({ ...base, zipcode: '10600' }).success).toBe(true);
  });
});

describe('newClaimSchema', () => {
  it('accepts a fully valid claim without a serial number (optional field)', () => {
    const result = newClaimSchema.safeParse({
      channel: 'Shopee',
      order_no: 'SP123',
      customer_name: 'สมชาย ใจดี',
      phone: '0812345678',
      email: '',
      sku: '',
      product_name: 'หูฟังไร้สาย',
      model: '',
      serial_no: '',
      issue_group: 'เปิดไม่ติด',
      issue_detail: 'เปิดเครื่องไม่ติดหลังชาร์จ',
      address: {
        house_no: '99/1',
        moo: '',
        soi: '',
        road: '',
        tambon: 'บางรัก',
        amphoe: 'บางรัก',
        province: 'กรุงเทพมหานคร',
        zipcode: '10500',
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('shipFormSchema', () => {
  it('requires a tracking number of at least 3 characters', () => {
    expect(
      shipFormSchema.safeParse({ claim_no: 'GV25083', carrier: 'Kerry Express', tracking_no: 'AB', ship_date: '2026-08-15' }).success,
    ).toBe(false);
    expect(
      shipFormSchema.safeParse({ claim_no: 'GV25083', carrier: 'Kerry Express', tracking_no: 'ABC123', ship_date: '2026-08-15' }).success,
    ).toBe(true);
  });
});
