import { ChevronRight, ClipboardEdit, PackageCheck, ShieldCheck, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { icon: ClipboardEdit, title: 'แจ้งเคลมออนไลน์', subtitle: 'กรอกแบบฟอร์มด้านล่าง ใช้เวลาไม่ถึง 5 นาที' },
  { icon: PackageCheck, title: 'ส่งสินค้ามาที่ร้าน', subtitle: 'ส่งสินค้าที่ใช้งานไม่ได้มาให้กับร้าน Gadget Villa' },
  { icon: ShieldCheck, title: 'พนักงานตรวจสอบ', subtitle: 'พนักงานตรวจสอบสินค้า พร้อมแจ้งผล' },
  { icon: Truck, title: 'รอรับสินค้า', subtitle: 'รอรับสินค้าคืนภายใน 5-7 วัน' },
];

export function ClaimProcessSteps() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white">
      <div className="flex items-center justify-between bg-brand-lime px-5 py-3">
        <div className="text-base font-extrabold text-brand-charcoal sm:text-lg">
          วิธีเคลมสินค้าง่าย ๆ กับ <span className="italic">GV</span>
        </div>
        <div className="text-[11px] font-bold uppercase tracking-wide text-brand-charcoal/70">Gadget Villa</div>
      </div>

      <div className="grid grid-cols-4 items-start gap-1 p-4 sm:gap-2 sm:p-6">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="flex flex-col items-center gap-2">
              <div className="flex w-full items-center justify-center gap-1">
                <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-brand-lime text-brand-charcoal sm:h-16 sm:w-16">
                  <Icon className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
                {i < STEPS.length - 1 && <ChevronRight className="hidden h-6 w-6 flex-none text-brand-lime sm:block" />}
              </div>
              <div className="flex w-full items-start gap-1.5 sm:gap-2">
                <span className={cn('flex-none text-xl font-black leading-none text-brand-charcoal sm:text-3xl')}>{i + 1}</span>
                <div className="min-w-0 text-left">
                  <div className="text-[11px] font-bold leading-tight text-brand-charcoal sm:text-sm">{step.title}</div>
                  <div className="mt-0.5 hidden text-[11px] leading-snug text-slate-500 sm:block">{step.subtitle}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
