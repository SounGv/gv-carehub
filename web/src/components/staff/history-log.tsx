import { ArrowRight, History } from 'lucide-react';
import { formatThaiDateTime } from '@/lib/formatters';
import type { StatusHistoryEntry } from '@/lib/types';

export function HistoryLog({ history }: { history: StatusHistoryEntry[] }) {
  if (!history.length) {
    return <p className="text-sm text-slate-400">ยังไม่มีประวัติการเปลี่ยนสถานะ</p>;
  }
  return (
    <ol className="space-y-3">
      {[...history].reverse().map((entry) => (
        <li key={entry.event_id} className="flex gap-3 text-sm">
          <History className="mt-0.5 h-4 w-4 flex-none text-slate-300" />
          <div>
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              {entry.from_status && (
                <>
                  <span className="text-slate-400">{entry.from_status}</span>
                  <ArrowRight className="h-3 w-3 text-slate-300" />
                </>
              )}
              <span>{entry.to_status}</span>
            </div>
            <div className="text-xs text-slate-400">
              {formatThaiDateTime(entry.changed_at)} · โดย {entry.changed_by}
              {entry.note && ` · ${entry.note}`}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
