'use client';

import { useState } from 'react';
import { gvApi } from '@/lib/api';
import { useAsync } from '@/hooks/use-async';
import { ReportTabBar } from './report-tab-bar';
import { SupplierRmaCreateBatchPanel } from './supplier-rma-create-batch-panel';
import { SupplierRmaTrackPanel } from './supplier-rma-track-panel';
import { SupplierRmaAnalyticsPanel } from './supplier-rma-analytics-panel';

type SubTabKey = 'create' | 'track' | 'analytics';

const SUB_TABS: { key: SubTabKey; label: string }[] = [
  { key: 'create', label: 'สร้างชุดเคลม' },
  { key: 'track', label: 'ติดตามสถานะ' },
  { key: 'analytics', label: 'วิเคราะห์' },
];

export function SupplierRmaTab() {
  const [subTab, setSubTab] = useState<SubTabKey>('create');
  // legacyMeta already reads brand/product-group lists off the same CLSBS sheet — reused here
  // instead of adding a second meta endpoint for this feature.
  const meta = useAsync(() => gvApi.legacyMeta(), []);

  return (
    <div className="space-y-4">
      <ReportTabBar tabs={SUB_TABS} active={subTab} onChange={setSubTab} />
      {subTab === 'create' && <SupplierRmaCreateBatchPanel meta={meta.data} />}
      {subTab === 'track' && <SupplierRmaTrackPanel />}
      {subTab === 'analytics' && <SupplierRmaAnalyticsPanel />}
    </div>
  );
}
