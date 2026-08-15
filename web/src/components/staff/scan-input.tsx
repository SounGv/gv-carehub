'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, ScanLine, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ScanInput({
  onSearch,
  isLoading,
  autoFocus = true,
  placeholder = 'สแกนหรือพิมพ์ Tracking, เลขเคส, เลขคำสั่งซื้อ, Serial หรือเบอร์โทร แล้วกด Enter',
}: {
  onSearch: (query: string) => void;
  isLoading: boolean;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function submit() {
    const q = value.trim();
    if (q.length < 3) return;
    onSearch(q);
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-white p-3 shadow-sm">
      <ScanLine className="h-5 w-5 flex-none text-brand-charcoal" />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
        placeholder={placeholder}
        className="h-10 flex-1 border-none bg-transparent text-sm outline-none placeholder:text-slate-400"
      />
      <Button type="button" variant="brand" onClick={submit} loading={isLoading}>
        {!isLoading && <Search className="h-4 w-4" />} ค้นหา
      </Button>
      {isLoading && <Loader2 className="hidden h-4 w-4 animate-spin text-slate-300" />}
    </div>
  );
}
