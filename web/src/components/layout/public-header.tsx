export function PublicHeader() {
  return (
    <header className="bg-white">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-1.5 px-4 py-8 text-center">
        <div className="text-[40px] font-black italic leading-none tracking-tighter text-brand-lime">GV</div>
        <div className="text-[11px] font-semibold uppercase leading-tight tracking-[0.2em] text-slate-400">Gadget Villa</div>
        <div className="h-px w-10 bg-slate-200" />
        <div className="text-[19px] font-extrabold leading-tight text-brand-charcoal">CareHub</div>
        <div className="text-[10.5px] leading-tight text-slate-400">After-sales Claims Management</div>
      </div>
    </header>
  );
}
