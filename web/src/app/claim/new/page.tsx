import Image from 'next/image';
import { NewClaimWizard } from '@/components/claims/new-claim-wizard';

export default function NewClaimPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <div className="flex items-center gap-2.5">
            <Image src="/gv-logo-icon.png" alt="Gadget Villa" width={36} height={36} className="rounded-lg" />
            <div>
              <div className="text-sm font-bold text-brand-charcoal">Gadget Villa</div>
              <div className="text-[11px] text-slate-500">แจ้งเคลมสินค้า</div>
            </div>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-xl font-bold text-brand-charcoal">แจ้งเคลมสินค้า</h1>
        <NewClaimWizard />
      </div>
    </div>
  );
}
