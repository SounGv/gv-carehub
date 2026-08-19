import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatThaiDateTime } from '@/lib/formatters';

interface TimelineStep {
  label: string;
  value?: string;
}

export function StatusTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const done = Boolean(step.value);
        const isLast = i === steps.length - 1;
        return (
          <div key={step.label} className="flex gap-3.5">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-10 w-10 flex-none items-center justify-center rounded-full border-2',
                  done ? 'border-brand-lime bg-brand-lime text-brand-charcoal' : 'border-slate-300 bg-white text-slate-400',
                )}
              >
                {done ? <Check className="h-5 w-5" strokeWidth={3} /> : <Circle className="h-4 w-4" />}
              </div>
              {!isLast && <div className={cn('w-1 flex-1 rounded-full', done ? 'bg-brand-lime' : 'bg-slate-200')} style={{ minHeight: 30 }} />}
            </div>
            <div className="pb-7">
              <div className={cn('text-base font-bold', done ? 'text-brand-charcoal' : 'text-slate-400')}>{step.label}</div>
              <div className={cn('text-sm', done ? 'text-slate-600' : 'text-slate-400')}>
                {done ? formatThaiDateTime(step.value) : 'ยังไม่ถึงขั้นตอนนี้'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
