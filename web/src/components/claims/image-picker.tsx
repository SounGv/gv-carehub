'use client';

import { useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { MAX_IMAGE_SIZE_BYTES } from '@/lib/upload';
import { toast } from 'sonner';

export function ImagePicker({
  label,
  files,
  onChange,
  maxFiles = 4,
}: {
  label: string;
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    const valid = picked.filter((f) => {
      if (!f.type.startsWith('image/')) {
        toast.error(`ไฟล์ ${f.name} ไม่ใช่รูปภาพ`);
        return false;
      }
      if (f.size > MAX_IMAGE_SIZE_BYTES) {
        toast.error(`ไฟล์ ${f.name} มีขนาดใหญ่เกิน 8MB`);
        return false;
      }
      return true;
    });
    onChange([...files, ...valid].slice(0, maxFiles));
    if (inputRef.current) inputRef.current.value = '';
  }

  function removeAt(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <div className="flex flex-wrap gap-2">
        {files.map((file, i) => (
          <div key={`${file.name}-${i}`} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={URL.createObjectURL(file)} alt={file.name} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {files.length < maxFiles && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-slate-400 hover:border-brand-lime hover:text-brand-charcoal"
          >
            <ImagePlus className="h-5 w-5" />
            <span className="text-[10px]">เพิ่มรูป</span>
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePick} />
    </div>
  );
}
