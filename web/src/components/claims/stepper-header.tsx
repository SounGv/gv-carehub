import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = ['ข้อมูลลูกค้าและที่อยู่ส่งคืน', 'ข้อมูลสินค้าและปัญหา'];

export function StepperHeader({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const active = step === current;
        const done = step < current;
        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm font-semibold',
                done && 'bg-brand-lime text-brand-charcoal',
                active && !done && 'bg-brand-charcoal text-white',
                !active && !done && 'bg-slate-100 text-slate-400',
              )}
            >
              {done ? <Check className="h-4 w-4" /> : step}
            </div>
            <span className={cn('hidden text-xs font-medium sm:inline', active ? 'text-brand-charcoal' : 'text-slate-400')}>{label}</span>
            {step < STEPS.length && <div className={cn('mx-1 h-0.5 flex-1', done ? 'bg-brand-lime' : 'bg-slate-200')} />}
          </div>
        );
      })}
    </div>
  );
}
