# GV CareHub MVP

ระบบบริการหลังการขายและเคลมสินค้าของ Gadget Villa เชื่อมต่อ Google Sheets ผ่าน Google Apps Script API
ประกอบด้วย 2 ส่วนหลัก:

- `apps-script/` — Backend API (Google Apps Script + Google Sheets เป็นฐานข้อมูล)
- `web/` — Frontend จริง (Next.js + TypeScript + Tailwind) ใช้แทน `prototype/` เดิมทั้งหมด
- `prototype/` และ `frontend/gv-carehub-api.js` — ต้นแบบ UI/UX และ adapter เวอร์ชันแรกที่เก็บไว้เป็นข้อมูลอ้างอิง (ไม่ใช้งานจริงแล้ว)

## สิ่งที่มีในระบบ

- Google Apps Script API ครบทุก action ที่ frontend ต้องใช้ (ดู `data-schema.md`)
- สร้างเลข GV แบบ Lock ไม่ให้ซ้ำแม้ส่งฟอร์มพร้อมกัน
- Public Token (hash เก็บใน Sheet, ส่ง token ดิบให้ลูกค้าเท่านั้น) สำหรับลิงก์ติดตามสถานะ
- รับเข้าคลัง เปลี่ยนสถานะ และบันทึกประวัติทุกครั้งใน `Status_History` + `Sync_Log`
- ตรวจ Tracking ซ้ำก่อนบันทึกพัสดุขาเข้า/ขาออก
- Dashboard/รายงาน SKU คำนวณจากข้อมูลจริงใน Sheets เท่านั้น ไม่มีตัวเลข Hardcode
- Frontend Next.js ครบ 7 หน้าตาม Requirement พร้อม Loading/Empty/Error state ทุกหน้า

## วิธีติดตั้ง Backend (Google Apps Script)

1. สร้างหรือเปิด Google Sheet สำหรับ GV CareHub
2. เปิด Extensions > Apps Script
3. นำไฟล์ `apps-script/Code.gs` ไปวางในโปรเจกต์ Apps Script
4. ตั้งค่า Script Property ชื่อ `SPREADSHEET_ID` เป็น ID ของ Google Sheet
5. รันฟังก์ชัน `doPost` ไม่ได้โดยตรง ให้เรียก POST action `setup` หนึ่งครั้ง หรือสร้างฟังก์ชันชั่วคราวดังนี้:

```javascript
function setup() { return setupSheets_(); }
```

6. Deploy > New deployment > Web app
7. Execute as: Me
8. Who has access: Anyone
9. คัดลอก URL ของ Web app แล้วนำไปตั้งค่าตัวแปรแวดล้อม `NEXT_PUBLIC_GV_API_URL` ของ frontend (ดูหัวข้อถัดไป)
10. (ทางเลือก) ถ้าต้องการอัปโหลดรูปภาพ (รูปสินค้า/ใบปะหน้าพัสดุ) ให้สร้างโฟลเดอร์ Google Drive แล้วนำ Folder ID
    ไปตั้งค่าใน Sheet `Config` แถว `drive_folder_id` (สร้างแถวนี้อัตโนมัติตอนรัน `setup` แล้ว แก้ค่าว่างให้เป็น Folder ID จริง)

> `frontend/gv-carehub-api.js` เป็น adapter เวอร์ชันแรก (vanilla JS) ที่เก็บไว้เป็นข้อมูลอ้างอิงเท่านั้น
> ระบบจริงใช้ `web/src/lib/api.ts` แทนทั้งหมด

## วิธีติดตั้ง Frontend (Next.js)

```bash
cd web
npm install
cp .env.example .env.local
# แก้ .env.local ให้ NEXT_PUBLIC_GV_API_URL = URL ของ Web app ที่ Deploy ไว้
npm run dev
```

เปิด http://localhost:3000 — หน้าแรกมีลิงก์ไปยัง "แจ้งเคลมสินค้า" (ลูกค้า) และ "พนักงาน/ผู้บริหาร เข้าสู่ระบบ"

### Environment Variables

| ตัวแปร | จำเป็น | คำอธิบาย |
|---|---|---|
| `NEXT_PUBLIC_GV_API_URL` | ใช่ | URL ของ Google Apps Script Web App เช่น `https://script.google.com/macros/s/XXXX/exec` |

ไม่มี Secret Key ใด ๆ ที่ต้องตั้งค่าฝั่ง Client — Apps Script Web App ที่ deploy แบบ "Execute as: Me / Anyone"
ทำหน้าที่เป็น API layer อยู่แล้ว

### โครงสร้างโค้ด Frontend

```text
web/src/
  app/            หน้าเว็บทั้งหมด (Next.js App Router)
  components/ui/  Component พื้นฐาน (shadcn-style, เขียนเอง ไม่ผูก Radix)
  components/dashboard, claims, staff, layout
  lib/            api.ts, types.ts, validators.ts, formatters.ts, auth.ts, export.ts, upload.ts
  hooks/          use-async.ts (loading/error/empty/refetch), use-meta.ts
```

### ทดสอบ (Testing)

```bash
cd web
npm run test     # Vitest: validators.ts และ formatters.ts (12 tests)
npm run lint     # ESLint (next/core-web-vitals)
npm run build    # Type-check แบบ strict + Production build
```

ผลทดสอบล่าสุด: `npm run test` ผ่านทั้งหมด 12/12, `npm run lint` ไม่มี warning/error,
`npm run build` compile และ generate หน้าเว็บทั้ง 10 route สำเร็จ (ดูรายละเอียดเพิ่มเติมท้ายไฟล์นี้)

รายการที่ยังต้องทดสอบกับ Google Sheets จริง (ทำไม่ได้ในสภาพแวดล้อมพัฒนานี้เพราะไม่มีการเชื่อมต่อ Google
Sheets จริงให้ทดสอบ) — ดูหัวข้อ "TODO ก่อนเปิดใช้จริง" ด้านล่าง

## Deploy

- **Frontend**: แนะนำ Vercel (`vercel deploy` หรือเชื่อม GitHub repo) — ตั้งค่า Environment Variable
  `NEXT_PUBLIC_GV_API_URL` ในหน้า Project Settings ของ Vercel ก่อน deploy หรือจะ deploy เป็น Node server
  ด้วย `npm run build && npm run start` บนเครื่องเองก็ได้
- **Backend**: Deploy ผ่าน Google Apps Script ตามขั้นตอนด้านบน ทุกครั้งที่แก้ `Code.gs` ต้องสร้าง
  "New deployment" หรือ "Manage deployments > Edit > New version" ใหม่ URL เดิมจะไม่อัปเดตโค้ดอัตโนมัติ

## ก่อนเปิดใช้จริง

- ตั้งค่า Script Property (`SPREADSHEET_ID`) และทดสอบสิทธิ์การเข้าถึงจริง
- ตั้งค่า `Config.drive_folder_id` หากต้องการให้ลูกค้าและพนักงานอัปโหลดรูปได้จริง
- ทดสอบเลข GV ด้วยการส่งฟอร์มพร้อมกันหลายรายการ (โหลดทดสอบ concurrency)
- ทดสอบการรับพัสดุ/จัดส่งคืนด้วย Tracking ซ้ำ ว่าระบบปฏิเสธจริง
- สำรอง Google Sheet และตั้งสิทธิ์การแก้ไขเฉพาะผู้ดูแล
- **ต่อระบบ Login จริง** — ดูหัวข้อ TODO ด้านล่าง, ปัจจุบัน `web/src/lib/auth.ts` เป็นเพียง Placeholder

## TODO ที่จำเป็นก่อนเปิดใช้จริง (Production)

1. **Authentication จริง** (`web/src/lib/auth.ts`, `web/src/app/login/page.tsx`) — ปัจจุบันเป็นแค่ localStorage
   mock ไม่มีการยืนยันตัวตนจริง ใครก็เข้าหน้า `/login` แล้วเลือก role เองได้ ต้องเปลี่ยนเป็นระบบ Login จริง
   (เช่น NextAuth + Google Workspace SSO) ก่อนใช้งานจริง และให้ Apps Script ตรวจสอบตัวตนผู้เรียก API ด้วย
   (ปัจจุบัน backend เชื่อค่า `actor` ที่ client ส่งมาตรงๆ)
2. **สิทธิ์แก้ไข Google Sheet** — ตั้งค่าเฉพาะผู้ดูแลให้แก้ไขชีตได้โดยตรง ป้องกันข้อมูลเพี้ยนนอกระบบ
3. **Google Drive สำหรับรูปภาพ** — ต้องตั้งค่า `Config.drive_folder_id` มิฉะนั้นการอัปโหลดรูป (ขั้นตอนที่ 2
   ของฟอร์มแจ้งเคลม) จะล้มเหลว โดยระบบยังให้ส่งเคลมต่อได้โดยไม่มีรูป (ไม่บล็อกการส่งฟอร์ม)
4. **เคลมหลายสินค้าต่อ 1 เคส** — ปัจจุบัน `create_claim` และ `update_service_detail` ออกแบบไว้สำหรับ 1 สินค้า
   ต่อ 1 เคส (ตรงกับฟอร์ม 3 ขั้นตอนที่ให้มา) หากต้องรองรับหลายสินค้าต่อเคสในอนาคต ต้องแก้
   `updateServiceDetail_` ใน `Code.gs` ให้ระบุ `item_id` แทนการค้นด้วย `claim_no` อย่างเดียว
5. **Rate limiting / ป้องกันการยิง API สแปม** — endpoint สาธารณะ (`create_claim`, `status`) ยังไม่มีการจำกัด
   จำนวนครั้ง ควรพิจารณา reCAPTCHA หรือ rate limit ก่อนเปิดใช้จริงในวงกว้าง
6. **รายการ "รอตรวจสอบ"** — ปัจจุบันบันทึกใน `Sync_Log` (action = `pending_review`) ยังไม่มีหน้าจอสำหรับ
   ผู้ดูแลมาไล่เคลียร์รายการเหล่านี้ ต้องต่อ UI เพิ่มหากใช้งานถี่
7. **ทดสอบกับ Google Sheets จริง** — สภาพแวดล้อมพัฒนานี้ไม่มีการเชื่อมต่อ Google Sheets จริง จึงยืนยันได้แค่ระดับ
   Build/Type-check/Unit test ของ frontend และอ่านตรรกะของ `Code.gs`; ต้อง deploy จริงแล้วทดสอบ end-to-end
   ตามรายการในหัวข้อ "ผลการทดสอบ" ก่อนเปิดใช้งานจริง
