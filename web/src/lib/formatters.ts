import { formatDistanceToNow, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

function toDate(value: string | Date | undefined | null): Date | null {
  if (!value) return null;
  const d = typeof value === 'string' ? parseISO(value) : value;
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Thai display date, Buddhist Era, e.g. "15 ส.ค. 2569" */
export function formatThaiDate(value: string | Date | undefined | null): string {
  const d = toDate(value);
  if (!d) return '-';
  return new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/** Thai display date + time, e.g. "15 ส.ค. 2569 14:30 น." */
export function formatThaiDateTime(value: string | Date | undefined | null): string {
  const d = toDate(value);
  if (!d) return '-';
  const datePart = formatThaiDate(d);
  const timePart = new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return `${datePart} ${timePart} น.`;
}

export function formatRelativeThai(value: string | Date | undefined | null): string {
  const d = toDate(value);
  if (!d) return '-';
  return formatDistanceToNow(d, { addSuffix: true, locale: th });
}

export function formatCurrency(value: number | string | undefined | null): string {
  const n = Number(value || 0);
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 2 }).format(n);
}

export function formatNumber(value: number | string | undefined | null): string {
  const n = Number(value || 0);
  return new Intl.NumberFormat('th-TH').format(n);
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return `${value.toFixed(digits)}%`;
}

/** Digits only, e.g. "08-1234-5678" -> "0812345678" */
export function normalizePhone(value: string | undefined | null): string {
  return String(value || '').replace(/[^0-9]/g, '');
}

/** Partial mask for staff-facing lists, e.g. "0812345678" -> "081-xxx-678" */
export function maskPhone(value: string | undefined | null): string {
  const digits = normalizePhone(value);
  if (digits.length < 7) return digits ? '•'.repeat(digits.length) : '-';
  const head = digits.slice(0, 3);
  const tail = digits.slice(-3);
  return `${head}-xxx-${tail}`;
}

export function toCsv<T extends object>(rows: T[], columns: { key: keyof T; label: string }[]): string {
  const escape = (value: unknown) => {
    const s = value === null || value === undefined ? '' : String(value);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = columns.map((c) => escape(c.label)).join(',');
  const body = rows.map((row) => columns.map((c) => escape(row[c.key])).join(',')).join('\n');
  return `﻿${header}\n${body}`;
}

export function downloadTextFile(filename: string, content: string, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
