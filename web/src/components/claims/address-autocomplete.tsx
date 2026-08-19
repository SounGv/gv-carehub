'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { searchThaiAddress, type ThaiAddressField, type ThaiAddressMatch } from '@/lib/thai-address';

/**
 * Type into any one of ตำบล/อำเภอ/จังหวัด/รหัสไปรษณีย์ and pick a suggestion — the
 * other three fill in automatically (mirrors the well-known jquery.Thailand.js UX),
 * so the customer only has to get one field right instead of all four.
 */
export function AddressAutocomplete({
  id,
  field,
  value,
  onChange,
  onSelect,
  placeholder,
  inputMode,
  maxLength,
}: {
  id: string;
  field: ThaiAddressField;
  value: string;
  onChange: (text: string) => void;
  onSelect: (match: ThaiAddressMatch) => void;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  maxLength?: number;
}) {
  const [suggestions, setSuggestions] = useState<ThaiAddressMatch[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleChange(text: string) {
    onChange(text);
    const results = searchThaiAddress(field, text);
    setSuggestions(results);
    setOpen(results.length > 0);
  }

  function handleSelect(match: ThaiAddressMatch) {
    onSelect(match);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        autoComplete="off"
      />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg">
          {suggestions.map((s, i) => (
            <li key={`${s.tambon}-${s.amphoe}-${s.zipcode}-${i}`}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-slate-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(s)}
              >
                <div className="font-medium text-foreground">
                  {s.tambon} · {s.amphoe}
                </div>
                <div className="text-xs text-slate-400">
                  {s.province} {s.zipcode}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
