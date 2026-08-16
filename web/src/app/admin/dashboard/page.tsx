'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format, subDays } from 'date-fns';
import {
  AlertOctagon,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Coins,
  HandCoins,
  Landmark,
  PackageCheck,
  PackageSearch,
  Truck,
  Wallet,
  Wrench,
} from 'lucide-react';
import { gvApi, type DashboardFilters } from '@/lib/api';
import { useAsync } from '@/hooks/use-async';
import { useMeta } from '@/hooks/use-meta';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { DailyClaimsChart, MonthlyTrendChart, RankedBarChart, StatusWorkflowChart } from '@/components/dashboard/charts';
import { FilterBar, FilterField, RefreshButton } from '@/components/ui/filter-bar';
import { Input, Select } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState, LoadingState, Skeleton } from '@/components/ui/states';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const today = () => format(new Date(), 'yyyy-MM-dd');
const defaultFrom = () => format(subDays(new Date(), 29), 'yyyy-MM-dd');

export default function AdminDashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>({ from: defaultFrom(), to: today(), sku: '', status: '', channel: '' });
  const meta = useMeta();
  const dashboard = useAsync(() => gvApi.dashboard(filters), [filters.from, filters.to, filters.sku, filters.status, filters.channel]);
  const legacy = useAsync(() => gvApi.legacyReport(), []);

  const topSkuRows = useMemo(
    () => (dashboard.data?.charts.top_skus_damage ?? []).map((r) => ({ ...r, label: r.product_name ? `${r.sku} · ${r.product_name}` : r.sku })),
    [dashboard.data],
  );
  const topIssueRows = useMemo(() => dashboard.data?.charts.top_issues ?? [], [dashboard.data]);
  const brandRows = useMemo(() => dashboard.data?.charts.damage_by_brand ?? [], [dashboard.data]);
  const totalOpen = dashboard.data
    ? dashboard.data.kpi.waiting_receive + dashboard.data.kpi.received + dashboard.data.kpi.in_progress + dashboard.data.kpi.waiting_ship
    : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-brand-charcoal">Dashboard</h1>
        <p className="text-sm text-slate-500">
          หน้านี้คือภาพรวมงานเคลมสินค้าทั้งหมด — ใช้ดูว่าวันนี้มีเคสอะไรเข้าใหม่ ค้างอยู่กี่เคส และมีเคสไหนเกินกำหนดต้องรีบจัดการ
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-2xl bg-brand-charcoal p-5 text-white shadow-sm sm:grid-cols-4">
        {dashboard.isLoading && !dashboard.data
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg bg-white/10" />)
          : dashboard.data && (
              <>
                <div>
                  <div className="text-3xl font-bold tabular-nums">{formatNumber(dashboard.data.kpi.claims_today)}</div>
                  <div className="mt-0.5 text-xs text-white/60">เคลมเข้าใหม่วันนี้</div>
                </div>
                <div>
                  <div className="text-3xl font-bold tabular-nums">{formatNumber(totalOpen)}</div>
                  <div className="mt-0.5 text-xs text-white/60">ค้างดำเนินการทั้งหมด</div>
                </div>
                <div>
                  <div className={cn('text-3xl font-bold tabular-nums', dashboard.data.kpi.overdue_sla > 0 && 'text-red-400')}>
                    {formatNumber(dashboard.data.kpi.overdue_sla)}
                  </div>
                  <div className="mt-0.5 text-xs text-white/60">เกิน SLA ต้องรีบจัดการ</div>
                </div>
                <div>
                  <div className="text-3xl font-bold tabular-nums">{formatNumber(dashboard.data.kpi.closed)}</div>
                  <div className="mt-0.5 text-xs text-white/60">ปิดเคสแล้ว (ช่วงที่เลือก)</div>
                </div>
              </>
            )}
      </div>

      <FilterBar>
        <FilterField label="วันที่เริ่มต้น">
          <Input
            type="date"
            value={filters.from}
            max={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
          />
        </FilterField>
        <FilterField label="วันที่สิ้นสุด">
          <Input
            type="date"
            value={filters.to}
            min={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
          />
        </FilterField>
        <FilterField label="SKU">
          <Select value={filters.sku} onChange={(e) => setFilters((f) => ({ ...f, sku: e.target.value }))}>
            <option value="">ทั้งหมด</option>
            {(meta.data?.skus ?? []).map((sku) => (
              <option key={sku} value={sku}>
                {sku}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label="สถานะ">
          <Select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            <option value="">ทั้งหมด</option>
            {(meta.data?.statuses ?? []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label="ช่องทางการขาย">
          <Select value={filters.channel} onChange={(e) => setFilters((f) => ({ ...f, channel: e.target.value }))}>
            <option value="">ทั้งหมด</option>
            {(meta.data?.channels ?? []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </FilterField>
        <RefreshButton onClick={dashboard.refetch} isLoading={dashboard.isLoading} lastUpdatedAt={dashboard.lastUpdatedAt} />
      </FilterBar>

      {dashboard.isLoading && !dashboard.data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      )}

      {dashboard.error && !dashboard.data && <ErrorState message={dashboard.error} onRetry={dashboard.refetch} />}

      {dashboard.data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <KpiCard label="เคลมวันนี้" value={dashboard.data.kpi.claims_today} icon={ClipboardList} />
            <KpiCard label="รอรับสินค้า" value={dashboard.data.kpi.waiting_receive} icon={PackageSearch} tone="warning" />
            <KpiCard label="รับเข้าคลังแล้ว" value={dashboard.data.kpi.received} icon={PackageCheck} />
            <KpiCard label="กำลังดำเนินการ" value={dashboard.data.kpi.in_progress} icon={Wrench} />
            <KpiCard label="รอจัดส่งคืน" value={dashboard.data.kpi.waiting_ship} icon={Truck} />
            <KpiCard label="จัดส่งแล้ว" value={dashboard.data.kpi.shipped} icon={Truck} tone="good" />
            <KpiCard label="ปิดเคส" value={dashboard.data.kpi.closed} icon={CheckCircle2} tone="good" />
            <KpiCard label="เคสเกิน SLA" value={dashboard.data.kpi.overdue_sla} icon={AlertOctagon} tone="critical" />
            <KpiCard label="มูลค่าสินค้าเคลม" value={dashboard.data.kpi.product_value} icon={Wallet} isCurrency />
            <KpiCard label="มูลค่าความเสียหาย" value={dashboard.data.kpi.damage_value} icon={Coins} isCurrency tone="warning" />
          </div>

          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
              <div>
                <CardTitle>ภาพรวมข้อมูลสะสมทั้งหมด (บริการหลังการขาย + CLSBS)</CardTitle>
                <p className="mt-1 text-xs text-slate-400">ข้อมูลย้อนหลังทั้งหมดจากชีตเดิม อ่านสดโดยตรง แคชไว้สูงสุด 3 นาที</p>
              </div>
              <Link
                href="/admin/clsbs"
                className="flex flex-none items-center gap-1 whitespace-nowrap rounded-lg bg-brand-charcoal px-3 py-2 text-xs font-semibold text-white hover:bg-brand-charcoal/90"
              >
                ดูรายละเอียดทั้งหมด <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  <div>
                    <div className="mb-2 text-xs font-semibold text-slate-500">จำนวนเคสรายเดือน (บริการหลังการขาย)</div>
                    <MonthlyTrendChart data={legacy.data.service_log.by_month} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>จำนวนเคลมรายวัน</CardTitle>
              </CardHeader>
              <CardContent>
                <DailyClaimsChart data={dashboard.data.charts.daily_claims} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>อัตราสินค้าเสียเทียบยอดขาย</CardTitle>
              </CardHeader>
              <CardContent className="flex h-[260px] flex-col items-center justify-center gap-2">
                <div className="text-4xl font-bold tabular-nums text-brand-charcoal">
                  {formatPercent(dashboard.data.charts.defect_rate_vs_sales)}
                </div>
                <p className="text-center text-xs text-slate-400">
                  จำนวนเคลม ÷ จำนวนขายในช่วงวันที่เลือก
                  {dashboard.data.charts.defect_rate_vs_sales === null && ' (ไม่มีข้อมูลยอดขายในช่วงนี้)'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>สัดส่วนตามสถานะ</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusWorkflowChart data={dashboard.data.charts.by_status} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SKU ที่เสียหายสูงสุด</CardTitle>
              </CardHeader>
              <CardContent>
                <RankedBarChart
                  data={topSkuRows}
                  labelKey="label"
                  valueKey="value"
                  valueLabel="มูลค่าความเสียหาย"
                  emptyTitle="ไม่มีข้อมูล SKU ในช่วงที่เลือก"
                  formatValue={(v) => formatCurrency(v)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>อาการเสียที่พบบ่อย</CardTitle>
              </CardHeader>
              <CardContent>
                <RankedBarChart data={topIssueRows} labelKey="issue" valueKey="count" valueLabel="จำนวนครั้ง" emptyTitle="ไม่มีข้อมูลอาการเสีย" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>มูลค่าความเสียหายตามแบรนด์</CardTitle>
              </CardHeader>
              <CardContent>
                <RankedBarChart
                  data={brandRows}
                  labelKey="brand"
                  valueKey="value"
                  valueLabel="มูลค่าความเสียหาย"
                  emptyTitle="ไม่มีข้อมูลแบรนด์ในช่วงที่เลือก"
                  formatValue={(v) => formatCurrency(v)}
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {dashboard.isLoading && dashboard.data && <LoadingState label="กำลังอัปเดตข้อมูล..." />}
    </div>
  );
}
