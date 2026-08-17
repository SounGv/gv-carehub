import { ClipboardEdit, PackageCheck, ShieldCheck, Truck } from 'lucide-react';

const STEPS = [
  { icon: ClipboardEdit, title: 'แจ้งเคลมออนไลน์', detail: 'กรอกแบบฟอร์มด้านล่าง ใช้เวลาไม่ถึง 5 นาที' },
  { icon: PackageCheck, title: 'ส่งสินค้ามาที่ร้าน', detail: 'แนบเลขเคสที่ได้รับไปกับพัสดุ' },
  { icon: ShieldCheck, title: 'พนักงานตรวจสอบ', detail: 'ทีมงานตรวจเช็กอาการเสียของสินค้า' },
  { icon: Truck, title: 'รอรับผลภายใน 5-7 วัน', detail: 'ติดตามสถานะได้ตลอดผ่านลิงก์ที่ส่งให้' },
];

export function ClaimProcessSteps() {
  return (
    <div className="rounded-2xl bg-brand-charcoal p-5 sm:p-6">
      <div className="mb-4 text-center">
        <div className="text-sm font-bold uppercase tracking-wide text-brand-lime">วิธีเคลมสินค้าง่าย ๆ กับ Gadget Villa</div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="relative flex flex-col items-center gap-2 rounded-xl bg-white/5 p-3 text-center sm:p-4">
              <div className="absolute -top-2.5 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-brand-lime text-[11px] font-bold text-brand-charcoal">
                {i + 1}
              </div>
              <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-full bg-brand-lime/15 text-brand-lime">
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-[13px] font-bold leading-tight text-white">{step.title}</div>
              <div className="text-[11px] leading-snug text-white/50">{step.detail}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
