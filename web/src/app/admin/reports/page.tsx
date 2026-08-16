'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ReportTabBar } from '@/components/reports/report-tab-bar';
import { SkuReportTab } from '@/components/reports/sku-report-tab';
import { ClaimReportTab } from '@/components/reports/claim-report-tab';
import { ServiceLogTab } from '@/components/reports/service-log-tab';
import { ClsbsTab } from '@/components/reports/clsbs-tab';
import { LoadingState } from '@/components/ui/states';

type TabKey = 'sku' | 'claims' | 'service_log' | 'clsbs';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'sku', label: 'รายงาน SKU' },
  { key: 'claims', label: 'รายงานเคลม' },
  { key: 'service_log', label: 'บริการหลังการขาย' },
  { key: 'clsbs', label: 'CLSBS' },
];

function isTabKey(value: string | null): value is TabKey {
  return value === 'sku' || value === 'claims' || value === 'service_log' || value === 'clsbs';
}

function ReportsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab');
  const tab: TabKey = isTabKey(rawTab) ? rawTab : 'sku';

  function setTab(next: TabKey) {
    router.replace(`/admin/reports?tab=${next}`, { scroll: false });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-brand-charcoal">รายงาน</h1>
        <p className="text-sm text-slate-500">รายงานทุกรูปแบบรวมอยู่หน้าเดียว เลือกดูตามหัวข้อย่อยด้านล่าง</p>
      </div>

      <ReportTabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'sku' && <SkuReportTab />}
      {tab === 'claims' && <ClaimReportTab />}
      {tab === 'service_log' && <ServiceLogTab />}
      {tab === 'clsbs' && <ClsbsTab />}
    </div>
  );
}

export default function AdminReportsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ReportsPageContent />
    </Suspense>
  );
}
