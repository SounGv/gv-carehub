import { Button } from '@/components/ui/button';

export interface ReportTabDef<T extends string> {
  key: T;
  label: string;
}

export function ReportTabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: ReportTabDef<T>[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-border pb-3">
      {tabs.map((tab) => (
        <Button key={tab.key} type="button" variant={active === tab.key ? 'brand' : 'outline'} size="sm" onClick={() => onChange(tab.key)}>
          {tab.label}
        </Button>
      ))}
    </div>
  );
}
