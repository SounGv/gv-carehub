import { RefreshCw } from 'lucide-react';
import { Button } from './button';
import { formatThaiDateTime } from '@/lib/formatters';

export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-white p-4 shadow-sm">{children}</div>;
}

export function FilterField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-[140px] flex-1 ${className ?? ''}`}>
      <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
      {children}
    </div>
  );
}

export function RefreshButton({ onClick, isLoading, lastUpdatedAt }: { onClick: () => void; isLoading: boolean; lastUpdatedAt: Date | null }) {
  return (
    <div className="flex flex-none flex-col items-end gap-1">
      <Button type="button" variant="brand" size="sm" onClick={onClick} loading={isLoading}>
        <RefreshCw className="h-3.5 w-3.5" /> Refresh
      </Button>
      {lastUpdatedAt && <span className="text-[11px] text-slate-400">อัปเดตล่าสุด {formatThaiDateTime(lastUpdatedAt)}</span>}
    </div>
  );
}
