import { cn } from '@/lib/utils';
import { DEFAULT_STATUS_STYLE, STATUS_STYLES } from '@/lib/constants';

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const style = STATUS_STYLES[status] ?? DEFAULT_STATUS_STYLE;
  return (
    <span className={cn('inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold', style.bg, style.text, className)}>
      <span className={cn('h-2 w-2 flex-none rounded-full', style.dot)} />
      {status}
    </span>
  );
}
