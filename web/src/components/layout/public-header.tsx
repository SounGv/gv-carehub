import Image from 'next/image';

export function PublicHeader({ subtitle }: { subtitle: string }) {
  return (
    <header className="border-b border-border bg-white">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
        <div className="flex items-center gap-2.5">
          <Image src="/gv-logo-icon.png" alt="Gadget Villa" width={36} height={36} className="rounded-lg" />
          <div>
            <div className="text-sm font-bold text-brand-charcoal">Gadget Villa</div>
            <div className="text-[11px] text-slate-500">{subtitle}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
