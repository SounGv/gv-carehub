'use client';

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BRAND_COLOR_MAP, CHART_PRIMARY, DONUT_COLORS, DONUT_OTHER_COLOR, STATUS_CHART_COLORS } from '@/lib/constants';
import { formatNumber, formatPercent, formatThaiDate } from '@/lib/formatters';
import { EmptyState } from '@/components/ui/states';
import { CLAIM_STATUSES } from '@/lib/types';

const GRID = '#e1e0d9';
const AXIS_TEXT = { fill: '#6b6a63', fontSize: 12 };

function ChartTooltip({ active, payload, label, valueLabel }: { active?: boolean; payload?: { value: number }[]; label?: string; valueLabel?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 text-xs shadow-md">
      <div className="font-medium text-foreground">{label}</div>
      <div className="text-slate-500">
        {valueLabel ?? 'จำนวน'}: <b className="text-foreground">{formatNumber(payload[0]?.value ?? 0)}</b>
      </div>
    </div>
  );
}

export function DailyClaimsChart({ data }: { data: { date: string; count: number }[] }) {
  if (!data.length) return <EmptyState title="ไม่มีข้อมูลเคลมในช่วงที่เลือก" />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="dailyClaimsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_PRIMARY} stopOpacity={0.32} />
            <stop offset="100%" stopColor={CHART_PRIMARY} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={(v) => formatThaiDate(v)} tick={AXIS_TEXT} axisLine={{ stroke: GRID }} tickLine={false} minTickGap={24} />
        <YAxis tick={AXIS_TEXT} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
        <Tooltip content={<ChartTooltip valueLabel="เคลม" />} labelFormatter={(v) => formatThaiDate(String(v))} />
        <Area type="monotone" dataKey="count" stroke={CHART_PRIMARY} strokeWidth={2.5} fill="url(#dailyClaimsFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MonthlyTrendChart({ data }: { data: { month: string; count: number }[] }) {
  if (!data.length) return <EmptyState title="ไม่มีข้อมูลย้อนหลัง" />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="monthlyTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_PRIMARY} stopOpacity={0.32} />
            <stop offset="100%" stopColor={CHART_PRIMARY} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis
          dataKey="month"
          tick={AXIS_TEXT}
          axisLine={{ stroke: GRID }}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <YAxis tick={AXIS_TEXT} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
        <Tooltip content={<ChartTooltip valueLabel="เคส" />} />
        <Area type="monotone" dataKey="count" stroke={CHART_PRIMARY} strokeWidth={2.5} fill="url(#monthlyTrendFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function StatusWorkflowChart({ data }: { data: Record<string, number> }) {
  const rows = CLAIM_STATUSES.map((status) => ({ status, count: data[status] || 0, color: STATUS_CHART_COLORS[status] ?? CHART_PRIMARY }));
  const hasData = rows.some((r) => r.count > 0);
  if (!hasData) return <EmptyState title="ไม่มีข้อมูลสถานะในช่วงที่เลือก" />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, rows.length * 34)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }} barCategoryGap={10}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
        <XAxis type="number" tick={AXIS_TEXT} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="status" tick={AXIS_TEXT} axisLine={false} tickLine={false} width={110} />
        <Tooltip content={<ChartTooltip valueLabel="เคส" />} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {rows.map((r) => (
            <Cell key={r.status} fill={r.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RankedBarChart({
  data,
  labelKey,
  valueKey,
  valueLabel,
  emptyTitle,
  formatValue,
}: {
  data: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  valueLabel: string;
  emptyTitle: string;
  formatValue?: (v: number) => string;
}) {
  const hasNonZeroValue = data.some((row) => Number(row[valueKey] ?? 0) > 0);
  if (!data.length || !hasNonZeroValue) return <EmptyState title={emptyTitle} />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }} barCategoryGap={10}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
        <XAxis type="number" tick={AXIS_TEXT} axisLine={false} tickLine={false} tickFormatter={(v) => (formatValue ? formatValue(v) : formatNumber(v))} />
        <YAxis type="category" dataKey={labelKey} tick={AXIS_TEXT} axisLine={false} tickLine={false} width={120} />
        <Tooltip content={<ChartTooltip valueLabel={valueLabel} />} formatter={(v: number) => (formatValue ? formatValue(v) : formatNumber(v))} />
        <Bar dataKey={valueKey} fill={CHART_PRIMARY} radius={[0, 4, 4, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Simple string hash so an unmapped category still gets a *stable* color across
 * re-renders/filters — never one that shifts because its rank changed. */
function hashToIndex(label: string, mod: number): number {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return hash % mod;
}

/** Color follows the entity, never its rank: a fixed brand keeps its own color (see
 * BRAND_COLOR_MAP), and everything else hashes to a fixed slot instead of being
 * assigned by sort position — so filtering/re-ranking never repaints a survivor. */
function colorForCategory(label: string): string {
  return BRAND_COLOR_MAP[label] ?? DONUT_COLORS[hashToIndex(label, DONUT_COLORS.length)] ?? DONUT_OTHER_COLOR;
}

/**
 * Donut + legend for a ranked top-N list. Pie/donut slices only stay legible
 * up to a handful of categories — past that, arcs become impossible to
 * compare — so this always folds everything outside the top `maxSlices`
 * into a single "อื่นๆ" (other) slice rather than rendering all of them.
 * The legend (name, count, percentage) sits beside the donut so identity is
 * never color-alone, satisfying the "needs relief" contrast warning on the
 * darker brand-lime fallback slice.
 */
export function TopNDonutChart({
  data,
  labelKey,
  valueKey,
  emptyTitle,
  maxSlices = 5,
}: {
  data: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  emptyTitle: string;
  maxSlices?: number;
}) {
  if (!data.length) return <EmptyState title={emptyTitle} />;
  const sorted = [...data].sort((a, b) => Number(b[valueKey]) - Number(a[valueKey]));
  const top = sorted.slice(0, maxSlices);
  const rest = sorted.slice(maxSlices);
  const restTotal = rest.reduce((sum, r) => sum + Number(r[valueKey] || 0), 0);
  const slices = [
    ...top.map((r) => ({ label: String(r[labelKey]), value: Number(r[valueKey] || 0), color: colorForCategory(String(r[labelKey])) })),
    ...(restTotal > 0 ? [{ label: `อื่นๆ (${rest.length} รายการ)`, value: restTotal, color: DONUT_OTHER_COLOR }] : []),
  ];
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center">
      <ResponsiveContainer width={180} height={180} className="flex-none">
        <PieChart>
          <Pie data={slices} dataKey="value" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={1.5} stroke="#ffffff" strokeWidth={2}>
            {slices.map((s) => (
              <Cell key={s.label} fill={s.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip valueLabel="จำนวน" />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex w-full flex-col gap-1.5 sm:max-w-[220px]">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ backgroundColor: s.color }} />
            <span className="min-w-0 flex-1 truncate text-slate-600" title={s.label}>
              {s.label}
            </span>
            <span className="flex-none font-semibold tabular-nums text-foreground">{formatNumber(s.value)}</span>
            <span className="w-12 flex-none text-right tabular-nums text-slate-400">{formatPercent(total > 0 ? (s.value / total) * 100 : 0, 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
