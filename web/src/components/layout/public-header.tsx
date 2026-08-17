export function PublicHeader() {
  return (
    <header className="bg-brand-charcoal">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-1.5 px-4 py-8 text-center">
        <div className="text-[40px] font-black italic leading-none tracking-tighter text-brand-lime">GV</div>
        <div className="text-[11px] font-semibold uppercase leading-tight tracking-[0.2em] text-white/60">Gadget Villa</div>
        <div className="h-px w-10 bg-white/20" />
        <div className="text-[19px] font-extrabold leading-tight text-white">CareHub</div>
        <div className="text-[10.5px] leading-tight text-white/50">After-sales Claims Management</div>
      </div>
    </header>
  );
}
