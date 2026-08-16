import { Button } from '@/components/ui/button';

export type ExportMode = 'detail' | 'summary';

export function ExportModeToggle({ mode, onChange }: { mode: ExportMode; onChange: (mode: ExportMode) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-white p-0.5 text-xs">
      <Button type="button" variant={mode === 'detail' ? 'brand' : 'ghost'} size="sm" className="h-7 px-2.5" onClick={() => onChange('detail')}>
        รายละเอียดทั้งหมด
      </Button>
      <Button type="button" variant={mode === 'summary' ? 'brand' : 'ghost'} size="sm" className="h-7 px-2.5" onClick={() => onChange('summary')}>
        สรุปยอดรวม
      </Button>
    </div>
  );
}
