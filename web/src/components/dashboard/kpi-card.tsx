import type { LucideIcon } from 'lucide-react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/formatters';

type Tone = 'neutral' | 'good' | 'warning' | 'critical';

const TONE_STYLES: Record<Tone, { icon: string; ring: string }> = {
  neutral: { icon: 'bg-slate-100 text-brand-charcoal', ring: '' },
  good: { icon: 'bg-green-100 text-success', ring: '' },
  warning: { icon: 'bg-amber-100 text-warning', ring: '' },
  critical: { icon: 'bg-red-100 text-error', ring: 'ring-1 ring-red-200' },
};

/** current vs. previous equal-length period, from the real dashboard KPI numbers — never fabricated. */
export interface KpiDelta {
  current: number;
  previous: number;
  /** Whether an increase counts as good news (e.g. "shipped") or bad news (e.g. "overdue"). */
  goodWhenUp?: boolean;
}

function DeltaChip({ delta }: { delta: KpiDelta }) {
  const { current, previous, goodWhenUp = true } = delta;
  if (previous === 0) {
    if (current === 0) return null;
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-400">
        <ArrowUp className="h-3 w-3" /> ใหม่
      </span>
    );
  }
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.5) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-slate-400">
        <Minus className="h-3 w-3" /> เท่าเดิม
      </span>
    );
  }
  const isUp = pct > 0;
  const isGood = isUp === goodWhenUp;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[11px] font-semibold', isGood ? 'text-success' : 'text-error')}>
      {isUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(pct).toFixed(0)}% จากช่วงก่อนหน้า
    </span>
  );
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
  isCurrency,
  suffix,
  delta,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: Tone;
  isCurrency?: boolean;
  suffix?: string;
  delta?: KpiDelta;
}) {
  const style = TONE_STYLES[tone];
  const display = isCurrency
    ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value)
    : `${formatNumber(value)}${suffix ? ` ${suffix}` : ''}`;

  return (
    <div className={cn('flex items-start gap-3 rounded-xl border border-border bg-white p-4 shadow-sm', style.ring)}>
      <div className={cn('flex h-10 w-10 flex-none items-center justify-center rounded-lg', style.icon)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-xs font-medium text-slate-500">{label}</div>
        <div className="mt-0.5 text-xl font-bold tabular-nums text-foreground">{display}</div>
        {delta && <div className="mt-0.5">{<DeltaChip delta={delta} />}</div>}
      </div>
    </div>
  );
}
