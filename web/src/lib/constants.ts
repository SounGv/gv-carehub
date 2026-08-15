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
 * Chart data-ink, from the dataviz skill's validated reference palette
 * (references/palette.md) — passes contrast + CVD checks against a white
 * chart surface. Almost every dashboard chart here is a single ranked
 * measure with direct axis labels (identity carried by the label, not
 * color), so one validated hue covers it; CHART_STATUS is reserved for
 * KPI accents only, never reused as a "series color".
 */
export const CHART_BLUE = '#2a78d6';
export const CHART_STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
};
/** Sequential ramp (light -> dark) for the ordered claim-status workflow chart. */
export const STATUS_SEQUENTIAL_RAMP = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#1c5cab', '#104281', '#0d366b', '#082b57'];
