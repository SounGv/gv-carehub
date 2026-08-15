import { cn } from '@/lib/utils';
import { DEFAULT_STATUS_STYLE, STATUS_STYLES } from '@/lib/constants';

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const style = STATUS_STYLES[status] ?? DEFAULT_STATUS_STYLE;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', style.bg, style.text, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
      {status}
    </span>
  );
}
