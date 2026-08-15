'use client';

import { Boxes, ClipboardList, Coins, HandCoins, Landmark, Wallet } from 'lucide-react';
import { gvApi } from '@/lib/api';
import { useAsync } from '@/hooks/use-async';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { MonthlyTrendChart, RankedBarChart } from '@/components/dashboard/charts';
import { RefreshButton } from '@/components/ui/filter-bar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState, LoadingState, Skeleton } from '@/components/ui/states';
import { formatThaiDateTime } from '@/lib/formatters';

export default function AdminClsbsPage() {
  const legacy = useAsync(() => gvApi.legacyReport(), []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand-charcoal">CLSBS</h1>
          <p className="text-sm text-slate-500">
            ข้อมูลย้อนหลังจากชีต &quot;บริการหลังการขาย&quot; (บันทึกแจ้งเคลม) และ &quot;CLSBS&quot; (สินค้าที่รับเข้าระบบกับผู้จำหน่าย) — อ่านสดจากชีตเดิมโดยตรง
          </p>
        </div>
        <RefreshButton onClick={legacy.refetch} isLoading={legacy.isLoading} lastUpdatedAt={legacy.lastUpdatedAt} />
      </div>

      {legacy.isLoading && !legacy.data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      )}

      {legacy.error && !legacy.data && <ErrorState message={legacy.error} onRetry={legacy.refetch} />}

      {legacy.data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <KpiCard label="เคสสะสม (บริการหลังการขาย)" value={legacy.data.service_log.total_cases} icon={ClipboardList} />
            <KpiCard label="รายการ CLSBS สะสม" value={legacy.data.clsbs.total_records} icon={Boxes} />
            <KpiCard label="จ่ายให้ผู้จำหน่าย" value={legacy.data.clsbs.money.paid_to_vendor} icon={HandCoins} isCurrency tone="warning" />
            <KpiCard label="ได้รับจากผู้จำหน่าย" value={legacy.data.clsbs.money.received_from_vendor} icon={Landmark} isCurrency tone="good" />
            <KpiCard label="เรียกเก็บจากลูกค้า" value={legacy.data.clsbs.money.charged_to_customer} icon={Wallet} isCurrency />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <KpiCard label="คืนให้ลูกค้า" value={legacy.data.clsbs.money.refunded_to_customer} icon={Coins} isCurrency tone="warning" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>จำนวนเคสรายเดือน (บริการหลังการขาย)</CardTitle>
              </CardHeader>
              <CardContent>
                <MonthlyTrendChart data={legacy.data.service_log.by_month} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>อาการเสียที่พบบ่อย (CLSBS)</CardTitle>
              </CardHeader>
              <CardContent>
                <RankedBarChart
                  data={legacy.data.clsbs.top_symptoms}
                  labelKey="label"
                  valueKey="count"
                  valueLabel="จำนวนครั้ง"
                  emptyTitle="ไม่มีข้อมูลอาการเสีย"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>สินค้าที่แจ้งเคลมบ่อยสุด</CardTitle>
              </CardHeader>
              <CardContent>
                <RankedBarChart
                  data={legacy.data.service_log.top_products}
                  labelKey="label"
                  valueKey="count"
                  valueLabel="จำนวนครั้ง"
                  emptyTitle="ไม่มีข้อมูลสินค้า"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>แบรนด์ที่รับเคลมผ่าน CLSBS บ่อยสุด</CardTitle>
              </CardHeader>
              <CardContent>
                <RankedBarChart
                  data={legacy.data.clsbs.by_brand}
                  labelKey="label"
                  valueKey="count"
                  valueLabel="จำนวนครั้ง"
                  emptyTitle="ไม่มีข้อมูลแบรนด์"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>กลุ่มสินค้าที่รับเคลมผ่าน CLSBS บ่อยสุด</CardTitle>
              </CardHeader>
              <CardContent>
                <RankedBarChart
                  data={legacy.data.clsbs.by_product_group}
                  labelKey="label"
                  valueKey="count"
                  valueLabel="จำนวนครั้ง"
                  emptyTitle="ไม่มีข้อมูลกลุ่มสินค้า"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ช่องทางที่แจ้งเคลมบ่อยสุด</CardTitle>
              </CardHeader>
              <CardContent>
                <RankedBarChart
                  data={legacy.data.service_log.by_channel}
                  labelKey="label"
                  valueKey="count"
                  valueLabel="จำนวนครั้ง"
                  emptyTitle="ไม่มีข้อมูลช่องทาง"
                />
              </CardContent>
            </Card>
          </div>

          <div className="text-xs text-slate-400">
            ข้อมูลนี้แคชไว้สูงสุด 3 นาทีเพื่อความเร็ว (ไม่ใช่ทุก request ที่ไปสแกนชีตจริง) — อัปเดตล่าสุด {formatThaiDateTime(legacy.data.generated_at)}
          </div>
        </>
      )}

      {legacy.isLoading && legacy.data && <LoadingState label="กำลังอัปเดตข้อมูล..." />}
    </div>
  );
}
