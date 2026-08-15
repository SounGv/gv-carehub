import { ImageOff } from 'lucide-react';

function parseUrls(value?: string): string[] {
  return (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ImageGallery({ label, urls }: { label: string; urls?: string }) {
  const list = parseUrls(urls);
  return (
    <div>
      <div className="mb-2 text-xs font-medium text-slate-500">{label}</div>
      {list.length === 0 ? (
        <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-slate-200 text-slate-300">
          <ImageOff className="h-5 w-5" />
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {list.map((url) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block h-20 w-20 overflow-hidden rounded-lg border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={label} className="h-full w-full object-cover" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
