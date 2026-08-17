import { PublicHeader } from '@/components/layout/public-header';
import { ClaimProcessSteps } from '@/components/claims/claim-process-steps';
import { NewClaimWizard } from '@/components/claims/new-claim-wizard';

export default function NewClaimPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:py-8">
        <ClaimProcessSteps />
        <div>
          <h1 className="text-2xl font-extrabold text-brand-charcoal">แจ้งเคลมสินค้า</h1>
          <p className="mt-1 text-sm text-slate-500">กรอกข้อมูลให้ครบทั้ง 3 ขั้นตอน แล้วเราจะออกเลขเคสและลิงก์ติดตามสถานะให้ทันที</p>
        </div>
        <NewClaimWizard />
      </div>
    </div>
  );
}
