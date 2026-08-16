import { PublicHeader } from '@/components/layout/public-header';
import { NewClaimWizard } from '@/components/claims/new-claim-wizard';

export default function NewClaimPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader subtitle="แจ้งเคลมสินค้า" />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-xl font-bold text-brand-charcoal">แจ้งเคลมสินค้า</h1>
        <NewClaimWizard />
      </div>
    </div>
  );
}
