# GV CareHub - Data Schema

ชุดนี้เป็นโครงสร้างกลางสำหรับเชื่อมกับ Google Sheets โดยไม่เขียนทับชีตเดิมทันที

## Source of truth

- ระยะแรก: Google Sheets เป็นฐานข้อมูลหลักสำหรับ MVP
- ระยะขยาย: ย้ายฐานข้อมูลหลักไป PostgreSQL/Supabase และให้ Sheets เป็นรายงาน

## Key rules

1. `claim_no` เช่น `GV25083` เป็นเลขอ้างอิงที่ผู้ใช้งานเห็น แต่ `claim_id` เป็น UUID ภายในระบบ
2. ลูกค้าเปิดสถานะผ่าน `public_token` เท่านั้น ไม่เปิดค้นด้วยชื่อหรือเบอร์โทร
3. การจับคู่พัสดุต้องใช้ Tracking, Claim No., Order No. หรือ Serial ก่อนชื่อ
4. ทุกการเปลี่ยนสถานะต้องเพิ่มแถวใน `Status_History`
5. Tracking เดียวกันห้ามถูกใช้ซ้ำกับขนส่งและทิศทางเดียวกัน
6. `CLSBS_Link` เป็นตารางเชื่อม ไม่แก้ข้อมูล CLSBS เดิมโดยตรง

## Status flow

```text
แจ้งเคลมแล้ว
  -> รอรับสินค้า
  -> รับเข้าคลังแล้ว
  -> กำลังดำเนินการ
  -> ดำเนินการเสร็จ
  -> กำลังจัดส่งคืน
  -> จัดส่งแล้ว
  -> ปิดเคส
```

## Existing sheet mapping

ชีตเดิม `บริการหลังการขาย` ควรใช้เป็นข้อมูลนำเข้า/ข้อมูลย้อนหลัง หรือค่อย ๆ map เข้าสู่ `Claim_Master` โดยไม่ลบคอลัมน์เดิม จนกว่าจะตรวจสอบข้อมูลครบ

## Dashboard definitions

- เคลมวันนี้: นับ `submitted_at` ของวันปัจจุบัน (ไม่ผูกกับตัวกรองวันที่)
- รับเข้าคลังแล้ว/กำลังดำเนินการ/รอจัดส่งคืน/จัดส่งแล้ว/ปิดเคส: นับจาก `status` ภายในช่วงวันที่ที่เลือก
- เคสเกิน SLA: เคสที่ยังไม่ปิด (`status` ไม่ใช่ จัดส่งแล้ว/ปิดเคส) และผ่านมาแล้วเกิน `Config.sla_days` วันนับจาก `submitted_at`
- มูลค่าสินค้าเคลม: รวม `Claim_Master.product_value` ของเคสในช่วงวันที่/ตัวกรอง
- มูลค่าความเสียหาย: รวม `Claim_Items.repair_cost` ของรายการสินค้าที่อยู่ในเคสตามตัวกรอง (ประเมินโดยช่างหลังตรวจสอบ)
- อัตราสินค้าเสีย: จำนวนเคลม (`Claim_Items.quantity`) / จำนวนขายจาก `Sales_Daily` ในช่วงเดียวกัน

## Additive schema extensions (beyond the base 10 sheets)

ไม่มีการเพิ่มชีตใหม่ ใช้วิธีต่อคอลัมน์ท้ายตารางเดิมและใช้ `Sync_Log` ที่มีอยู่แล้วแทนการสร้างชีตใหม่:

- `Claim_Items` มีคอลัมน์ต่อท้าย (หลัง `clsbs_id`) สำหรับหน้ารายละเอียดเคสของพนักงาน:
  `inspection_result, warranty_type, resolution_method, repair_cost, technician_note, product_image_urls, label_image_urls, service_updated_at, service_updated_by`
  (ค่า URL รูปภาพหลายรูปเก็บแบบคั่นด้วย comma)
- พัสดุขาเข้าตอนแจ้งเคลม (ขนส่ง/Tracking/วันที่ส่ง) บันทึกเป็นแถวใน `Shipment_Log` ที่ `direction = inbound` (ไม่ต้องเพิ่มคอลัมน์ใน `Claim_Master`)
- รายการ "รอตรวจสอบ" (พัสดุที่รับเข้ามาแต่หาเคสไม่พบ) และ audit log ของการแก้ไขข้อมูลสำคัญ บันทึกลง `Sync_Log` (คอลัมน์ `action`, `result`, `message` เป็น JSON แบบย่อ) แทนการสร้างชีตใหม่
- `Config` มีคีย์เพิ่ม: `sla_days`, `drive_folder_id` (โฟลเดอร์ Google Drive สำหรับรูปที่อัปโหลด), `channels`, `statuses`, `issue_groups`, `carriers` (comma-separated) เพื่อให้ Frontend ดึงตัวเลือกจาก API แทนการ Hardcode

## API actions (Apps Script Web App)

GET: `health`, `status&token=`, `search&q=`, `report&from&to&sku&model&brand&status&carrier` (ตาราง SKU), `dashboard&from&to&sku&status&channel` (KPI+กราฟ), `meta` (รายการตัวเลือกสำหรับ Filter/Form), `claim_detail&claim_no=`

POST: `create_claim`, `receive`, `service`, `ship`, `link_clsbs`, `update_service_detail`, `create_pending`, `upload_file`
