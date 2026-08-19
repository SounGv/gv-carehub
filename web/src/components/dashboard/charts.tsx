'use client';

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  BRAND_COLOR_MAP,
  CHART_DAILY,
  CHART_PREVIOUS_PERIOD,
  CHART_PRIMARY,
  DONUT_COLORS,
  DONUT_OTHER_COLOR,
  STATUS_CHART_COLORS,
} from '@/lib/constants';
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

function DailyComparisonTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; dataKey: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const current = payload.find((p) => p.dataKey === 'current')?.value ?? 0;
  const previous = payload.find((p) => p.dataKey === 'previous')?.value ?? 0;
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 text-xs shadow-md">
      <div className="font-medium text-foreground">{formatThaiDate(String(label))}</div>
      <div className="mt-1 flex items-center gap-1.5 text-slate-500">
        <span className="h-2 w-2 flex-none rounded-full" style={{ backgroundColor: CHART_DAILY }} />
        ช่วงที่เลือก: <b className="text-foreground">{formatNumber(current)}</b>
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-slate-500">
        <span className="h-2 w-2 flex-none rounded-full" style={{ backgroundColor: CHART_PREVIOUS_PERIOD }} />
        ช่วงก่อนหน้า: <b className="text-foreground">{formatNumber(previous)}</b>
      </div>
    </div>
  );
}

/** Same-length day-by-day series for the currently selected range and the equal-length
 * period right before it, aligned by day offset (not date) so the two lines compare
 * "day 1 of period" to "day 1 of period" regardless of the actual calendar dates. */
export function DailyClaimsChart({ data }: { data: { date: string; current: number; previous: number }[] }) {
  if (!data.length) return <EmptyState title="ไม่มีข้อมูลเคลมในช่วงที่เลือก" />;
  return (
    <div>
      <div className="mb-1 flex items-center justify-end gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: CHART_DAILY }} />
          ช่วงวันที่เลือก
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 border-t-2 border-dashed" style={{ borderColor: CHART_PREVIOUS_PERIOD }} />
          ช่วงก่อนหน้า
        </span>
      </div>
      <ResponsiveContainer width="100%" height={244}>
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="dailyClaimsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_DAILY} stopOpacity={0.22} />
              <stop offset="100%" stopColor={CHART_DAILY} stopOpacity={0.015} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="date" tickFormatter={(v) => formatThaiDate(v)} tick={AXIS_TEXT} axisLine={{ stroke: GRID }} tickLine={false} minTickGap={24} />
          <YAxis tick={AXIS_TEXT} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
          <Tooltip content={<DailyComparisonTooltip />} labelFormatter={(v) => formatThaiDate(String(v))} cursor={{ stroke: GRID, strokeWidth: 1 }} />
          <Area
            type="natural"
            dataKey="previous"
            stroke={CHART_PREVIOUS_PERIOD}
            strokeWidth={2}
            strokeDasharray="5 4"
            fill="none"
            dot={false}
            activeDot={{ r: 4, fill: CHART_PREVIOUS_PERIOD, stroke: '#fff', strokeWidth: 2 }}
          />
          <Area
            type="natural"
            dataKey="current"
            stroke={CHART_DAILY}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="url(#dailyClaimsFill)"
            dot={false}
            activeDot={{ r: 5, fill: CHART_DAILY, stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
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

/**
 * Equal-width colored cells, one per workflow status, each showing its raw
 * count — a status ribbon rather than a proportional bar, since the point is
 * "how many are sitting in each stage right now," not comparing stage share.
 * Legend grid below carries the label so color is never the only cue. Used on
 * the main Dashboard; StatusWorkflowChart above still serves the SKU report tab.
 */
export function StatusProportionStrip({ data }: { data: Record<string, number> }) {
  const rows = CLAIM_STATUSES.map((status) => ({ status, count: data[status] || 0, color: STATUS_CHART_COLORS[status] ?? CHART_PRIMARY }));
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {rows.map((r) => (
          <div
            key={r.status}
            className="flex h-14 min-w-0 flex-1 flex-col items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: r.color }}
            title={`${r.status}: ${r.count}`}
          >
            <span className="text-lg font-bold tabular-nums">{formatNumber(r.count)}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        {rows.map((r) => (
          <div key={r.status} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ backgroundColor: r.color }} />
            <span className="truncate">{r.status}</span>
          </div>
        ))}
      </div>
    </div>
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
export function colorForCategory(label: string): string {
  return BRAND_COLOR_MAP[label] ?? DONUT_COLORS[hashToIndex(label, DONUT_COLORS.length)] ?? DONUT_OTHER_COLOR;
}

export function RankedBarChart({
  data,
  labelKey,
  valueKey,
  valueLabel,
  emptyTitle,
  formatValue,
  color = CHART_PRIMARY,
  colorFn,
}: {
  data: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  valueLabel: string;
  emptyTitle: string;
  formatValue?: (v: number) => string;
  /** Single-hue fill for this chart (each ranked chart gets its own accent — see CHART_* in constants.ts). */
  color?: string;
  /** When bars are separate identities (owners, brands) rather than one measure, color each row by its own label instead of one flat hue. */
  colorFn?: (label: string) => string;
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
        <Bar dataKey={valueKey} fill={color} radius={[0, 4, 4, 0]} maxBarSize={22}>
          {colorFn && data.map((row) => <Cell key={String(row[labelKey])} fill={colorFn(String(row[labelKey]))} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
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
