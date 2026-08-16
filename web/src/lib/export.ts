import * as XLSX from 'xlsx';
import { downloadTextFile, toCsv } from './formatters';

export interface ExportColumn<T> {
  key: keyof T;
  label: string;
}

export function exportCsv<T extends object>(rows: T[], columns: ExportColumn<T>[], filename: string) {
  downloadTextFile(filename.endsWith('.csv') ? filename : `${filename}.csv`, toCsv(rows, columns));
}

export function exportExcel<T extends object>(rows: T[], columns: ExportColumn<T>[], filename: string, sheetName = 'Sheet1') {
  const data = rows.map((row) => {
    const record: Record<string, unknown> = {};
    columns.forEach((c) => {
      record[c.label] = row[c.key] ?? '';
    });
    return record;
  });
  const sheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export interface SummarySheet {
  /** Excel sheet tab name — truncated to 31 chars, Excel's hard limit. */
  name: string;
  rows: Record<string, unknown>[];
  columns: { key: string; label: string }[];
}

/** "สรุปยอดรวม" export mode — each aggregate (by status, by month, by brand, ...) as its
 * own tab in one workbook. CSV has no multi-table concept, so summary exports are Excel-only. */
export function exportSummaryExcel(sheets: SummarySheet[], filename: string) {
  const workbook = XLSX.utils.book_new();
  sheets.forEach((s) => {
    const data = s.rows.map((row) => {
      const record: Record<string, unknown> = {};
      s.columns.forEach((c) => {
        record[c.label] = row[c.key] ?? '';
      });
      return record;
    });
    const sheet = XLSX.utils.json_to_sheet(data.length ? data : [{}]);
    XLSX.utils.book_append_sheet(workbook, sheet, s.name.slice(0, 31));
  });
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}
