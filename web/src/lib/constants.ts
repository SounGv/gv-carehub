export const BRAND = {
  lime: '#C4D600',
  charcoal: '#221E1A',
  background: '#F4F6F9',
  text: '#1F2937',
  warning: '#F59E0B',
  success: '#16A34A',
  error: '#DC2626',
} as const;

/** Tailwind class pairs per status, so every status badge/chip stays consistent app-wide. */
export const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  แจ้งเคลมแล้ว: { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' },
  รอรับสินค้า: { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  รับเข้าคลังแล้ว: { bg: 'bg-sky-100', text: 'text-sky-800', dot: 'bg-sky-500' },
  กำลังดำเนินการ: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  รออะไหล่: { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500' },
  ดำเนินการเสร็จ: { bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  รอจัดส่งคืน: { bg: 'bg-violet-100', text: 'text-violet-800', dot: 'bg-violet-500' },
  จัดส่งแล้ว: { bg: 'bg-lime-100', text: 'text-lime-800', dot: 'bg-brand-lime' },
  ปิดเคส: { bg: 'bg-neutral-200', text: 'text-neutral-700', dot: 'bg-neutral-500' },
};

export const DEFAULT_STATUS_STYLE = { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' };

/**
 * Display-only relabeling — the stored/compared status value everywhere else
 * (Sheets, Supabase, OPEN_STATUSES, dashboard aggregation) stays "รออะไหล่" so
 * historical claims and every status===check keep working unchanged. Only
 * what staff/customers actually read is renamed, since in practice this
 * status covers any "on hold, waiting to reach the customer" case, not only
 * out-of-stock parts (e.g. discontinued model, awaiting a decision on
 * replace-vs-refund) — see StatusBadge/StatusActions.
 */
export const STATUS_LABELS: Record<string, string> = {
  รออะไหล่: 'รอดำเนินการ',
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

/**
 * Chart data-ink for single-series measures (line/area/ranked-bar charts).
 * Uses the same validated dark-lime as the donut chart's lead color (see
 * DONUT_COLORS below) instead of a generic blue, so every chart on the
 * dashboard reads as one brand-consistent surface rather than a mix of
 * an unrelated corporate blue and the app's actual lime/charcoal identity.
 */
export const CHART_PRIMARY = '#7a8a00';

/**
 * Per-chart accent hues, one slot each from the org's validated 8-hue
 * categorical palette (see the dataviz skill's palette.md) — so each ranked
 * chart on the dashboard reads as intentionally distinct instead of every
 * chart repeating CHART_PRIMARY. Single-series magnitude charts (not
 * identity/legend charts), so each keeps its own fixed hue rather than
 * cycling per bar.
 */
export const CHART_DAMAGE_SKU = '#4a3aa7'; // violet — SKU ที่เสียหายสูงสุด (มูลค่า)
export const CHART_CLAIMED_SKU = '#1baf7a'; // aqua — SKU ที่แจ้งเคลมบ่อยที่สุด (จำนวนครั้ง)
export const CHART_ISSUE = '#e34948'; // red — อาการเสียที่พบบ่อย
export const CHART_DAILY = '#008300'; // green — จำนวนเคลมรายวัน (ช่วงที่เลือก)
export const CHART_PREVIOUS_PERIOD = '#2a78d6'; // blue, dashed — จำนวนเคลมรายวัน (ช่วงก่อนหน้า)
export const CHART_OWNER_ASSIGNED = '#2a78d6'; // blue — เจ้าของเคสที่ระบุแล้ว
export const CHART_OWNER_UNASSIGNED = '#eb6834'; // orange — ยังไม่ระบุเจ้าของ

export const CHART_STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
};
/**
 * Per-status colors for the claim-status workflow chart, reusing the same
 * semantic hue family as each status's badge in STATUS_STYLES (slate/amber/
 * sky/blue/orange/emerald/violet/lime/neutral) — so the meaning of a color
 * carries over from badges elsewhere in the app instead of being relearned.
 * Mid-tone (500-weight) hexes throughout: the previous light-to-dark blue
 * ramp put several statuses in near-white pastel tones that were nearly
 * invisible against the chart's white background.
 */
export const STATUS_CHART_COLORS: Record<string, string> = {
  แจ้งเคลมแล้ว: '#94a3b8',
  รอรับสินค้า: '#f59e0b',
  รับเข้าคลังแล้ว: '#0ea5e9',
  กำลังดำเนินการ: '#3b82f6',
  รออะไหล่: '#f97316',
  ดำเนินการเสร็จ: '#10b981',
  รอจัดส่งคืน: '#8b5cf6',
  จัดส่งแล้ว: '#7a8a00',
  ปิดเคส: '#71717a',
};

/**
 * Brand-anchored categorical set for donut/pie charts (identity-by-color,
 * unlike the ranked bars above). Plain brand lime (#C4D600) fails the
 * lightness-band check as chart-ink — too pale to read as a fill — so this
 * leads with the darker brand shade instead, then the reference palette's
 * validated hues in an order that clears every adjacent-pair CVD/contrast
 * gate: `node validate_palette.js "#9AA600,#2a78d6,#e34948,#4a3aa7,#eb6834,#1baf7a"`.
 * Contrast lands in the WARN band (2.7–2.8:1), which is only legal with
 * direct labels next to each slice — always pair this with a visible
 * label+value legend, never bare color.
 */
export const DONUT_COLORS = ['#9AA600', '#2a78d6', '#e34948', '#4a3aa7', '#eb6834', '#1baf7a'];
export const DONUT_OTHER_COLOR = '#94a3b8';

/**
 * Fixed per-brand colors, matching each vendor's own real-world brand color
 * (UGREEN green, FANTECH red, ...) so a brand reads the same color on every
 * chart and every filter — never reassigned by rank. Any brand not listed
 * here falls back to a deterministic hash into DONUT_COLORS (see
 * colorForCategory in components/dashboard/charts.tsx), so it's still
 * stable across re-renders, just not hand-picked.
 */
export const BRAND_COLOR_MAP: Record<string, string> = {
  UGREEN: '#16A34A',
  FANTECH: '#DC2626',
  PHILIPS: '#2a78d6',
  GOLDSPIN: '#eda100',
  BOYA: '#4a3aa7',
};
