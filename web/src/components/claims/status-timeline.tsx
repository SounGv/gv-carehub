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
          <div key={step.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-7 w-7 flex-none items-center justify-center rounded-full',
                  done ? 'bg-brand-lime text-brand-charcoal' : 'bg-slate-100 text-slate-300',
                )}
              >
                {done ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
              </div>
              {!isLast && <div className={cn('w-0.5 flex-1', done ? 'bg-brand-lime' : 'bg-slate-200')} style={{ minHeight: 28 }} />}
            </div>
            <div className="pb-6">
              <div className={cn('text-sm font-medium', done ? 'text-foreground' : 'text-slate-400')}>{step.label}</div>
              <div className="text-xs text-slate-400">{done ? formatThaiDateTime(step.value) : 'ยังไม่ถึงขั้นตอนนี้'}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
