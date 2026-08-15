import { describe, expect, it } from 'vitest';
import { formatThaiDate, maskPhone, normalizePhone, toCsv } from './formatters';

describe('normalizePhone', () => {
  it('strips non-digit characters', () => {
    expect(normalizePhone('08-1234-5678')).toBe('0812345678');
  });
  it('handles empty input', () => {
    expect(normalizePhone(undefined)).toBe('');
  });
});

describe('maskPhone', () => {
  it('masks the middle digits, keeping head and tail', () => {
    expect(maskPhone('0812345678')).toBe('081-xxx-678');
  });
  it('returns dots for very short numbers instead of throwing', () => {
    expect(maskPhone('123')).toBe('•••');
  });
});

describe('formatThaiDate', () => {
  it('renders the Buddhist-era year (CE + 543)', () => {
    const result = formatThaiDate('2026-08-15T00:00:00.000Z');
    expect(result).toContain('2569');
  });
  it('returns a placeholder for missing values', () => {
    expect(formatThaiDate(undefined)).toBe('-');
  });
});

describe('toCsv', () => {
  it('escapes commas and quotes and includes a header row', () => {
    const csv = toCsv([{ name: 'Acme, Inc.', note: 'say "hi"' }], [
      { key: 'name', label: 'Name' },
      { key: 'note', label: 'Note' },
    ]);
    const lines = csv.replace(/^﻿/, '').split('\n');
    expect(lines[0]).toBe('Name,Note');
    expect(lines[1]).toBe('"Acme, Inc.","say ""hi"""');
  });
});
