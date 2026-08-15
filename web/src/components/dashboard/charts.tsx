'use client';

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART_BLUE, STATUS_SEQUENTIAL_RAMP } from '@/lib/constants';
import { formatNumber, formatThaiDate } from '@/lib/formatters';
import { EmptyState } from '@/components/ui/states';
import { CLAIM_STATUSES } from '@/lib/types';

const GRID = '#e1e0d9';
const AXIS_TEXT = { fill: '#898781', fontSize: 12 };

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
            <stop offset="0%" stopColor={CHART_BLUE} stopOpacity={0.28} />
            <stop offset="100%" stopColor={CHART_BLUE} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={(v) => formatThaiDate(v)} tick={AXIS_TEXT} axisLine={{ stroke: GRID }} tickLine={false} minTickGap={24} />
        <YAxis tick={AXIS_TEXT} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
        <Tooltip content={<ChartTooltip valueLabel="เคลม" />} labelFormatter={(v) => formatThaiDate(String(v))} />
        <Area type="monotone" dataKey="count" stroke={CHART_BLUE} strokeWidth={2} fill="url(#dailyClaimsFill)" />
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
            <stop offset="0%" stopColor={CHART_BLUE} stopOpacity={0.28} />
            <stop offset="100%" stopColor={CHART_BLUE} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tick={AXIS_TEXT} axisLine={{ stroke: GRID }} tickLine={false} minTickGap={16} />
        <YAxis tick={AXIS_TEXT} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
        <Tooltip content={<ChartTooltip valueLabel="เคส" />} />
        <Area type="monotone" dataKey="count" stroke={CHART_BLUE} strokeWidth={2} fill="url(#monthlyTrendFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function StatusWorkflowChart({ data }: { data: Record<string, number> }) {
  const rows = CLAIM_STATUSES.map((status, i) => ({ status, count: data[status] || 0, color: STATUS_SEQUENTIAL_RAMP[i] ?? CHART_BLUE }));
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
  if (!data.length) return <EmptyState title={emptyTitle} />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }} barCategoryGap={10}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
        <XAxis type="number" tick={AXIS_TEXT} axisLine={false} tickLine={false} tickFormatter={(v) => (formatValue ? formatValue(v) : formatNumber(v))} />
        <YAxis type="category" dataKey={labelKey} tick={AXIS_TEXT} axisLine={false} tickLine={false} width={120} />
        <Tooltip content={<ChartTooltip valueLabel={valueLabel} />} formatter={(v: number) => (formatValue ? formatValue(v) : formatNumber(v))} />
        <Bar dataKey={valueKey} fill={CHART_BLUE} radius={[0, 4, 4, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
