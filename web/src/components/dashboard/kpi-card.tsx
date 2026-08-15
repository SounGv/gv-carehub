import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/formatters';

type Tone = 'neutral' | 'good' | 'warning' | 'critical';

const TONE_STYLES: Record<Tone, { icon: string; ring: string }> = {
  neutral: { icon: 'bg-slate-100 text-brand-charcoal', ring: '' },
  good: { icon: 'bg-green-100 text-success', ring: '' },
  warning: { icon: 'bg-amber-100 text-warning', ring: '' },
  critical: { icon: 'bg-red-100 text-error', ring: 'ring-1 ring-red-200' },
};

export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
  isCurrency,
  suffix,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: Tone;
  isCurrency?: boolean;
  suffix?: string;
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
      </div>
    </div>
  );
}
