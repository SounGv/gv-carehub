'use client';

import { useMemo, useState } from 'react';
import { addDays, differenceInCalendarDays, format, subDays } from 'date-fns';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Coins,
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
import { colorForCategory, DailyClaimsChart, RankedBarChart, StatusProportionStrip } from '@/components/dashboard/charts';
import { CHART_CLAIMED_SKU, CHART_DAMAGE_SKU, CHART_ISSUE, CHART_OWNER_ASSIGNED, CHART_OWNER_UNASSIGNED, statusLabel } from '@/lib/constants';
import { FilterBar, FilterField, RefreshButton } from '@/components/ui/filter-bar';
import { Input, Select } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState, LoadingState, Skeleton } from '@/components/ui/states';
import { formatCurrency, formatPercent, formatThaiDate } from '@/lib/formatters';

const today = () => format(new Date(), 'yyyy-MM-dd');
const defaultFrom = () => format(subDays(new Date(), 29), 'yyyy-MM-dd');

/** Dense day-by-day series across [from, to] — fills in zero-count days the API
 * omits, so two periods of the same length can be aligned by day offset. */
function fillDailyRange(from: string | undefined, to: string | undefined, data: { date: string; count: number }[]) {
  const counts = new Map(data.map((d) => [d.date, d.count]));
  const out: { date: string; count: number }[] = [];
  let cursor = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (isNaN(cursor.getTime()) || isNaN(end.getTime())) return out;
  while (cursor <= end) {
    const key = format(cursor, 'yyyy-MM-dd');
    out.push({ date: key, count: counts.get(key) ?? 0 });
    cursor = addDays(cursor, 1);
  }
  return out;
}

export default function AdminDashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>({ from: defaultFrom(), to: today(), sku: '', status: '', channel: '' });
  const meta = useMeta();
  const dashboard = useAsync(() => gvApi.dashboard(filters), [filters.from, filters.to, filters.sku, filters.status, filters.channel]);

  // "10-second" comparison: same filters, the equal-length period immediately before `from`.
  const previousFilters = useMemo<DashboardFilters>(() => {
    const from = new Date(`${filters.from}T00:00:00`);
    const to = new Date(`${filters.to}T00:00:00`);
    const lengthDays = Math.max(1, differenceInCalendarDays(to, from) + 1);
    const prevTo = subDays(from, 1);
    const prevFrom = subDays(prevTo, lengthDays - 1);
    return { ...filters, from: format(prevFrom, 'yyyy-MM-dd'), to: format(prevTo, 'yyyy-MM-dd') };
  }, [filters]);
  const previous = useAsync(
    () => gvApi.dashboard(previousFilters),
    [previousFilters.from, previousFilters.to, previousFilters.sku, previousFilters.status, previousFilters.channel],
  );
  const prevKpi = previous.data?.kpi;

  const topSkuRows = useMemo(
    () => (dashboard.data?.charts.top_skus_damage ?? []).map((r) => ({ ...r, label: r.product_name ? `${r.sku} · ${r.product_name}` : r.sku })),
    [dashboard.data],
  );
  const topClaimedSkuRows = useMemo(
    () =>
      (dashboard.data?.charts.top_skus_by_claim_count ?? []).map((r) => ({
        ...r,
        label: r.product_name ? `${r.sku} · ${r.product_name}` : r.sku,
      })),
    [dashboard.data],
  );
  const topIssueRows = useMemo(() => dashboard.data?.charts.top_issues ?? [], [dashboard.data]);
  const brandRows = useMemo(() => dashboard.data?.charts.damage_by_brand ?? [], [dashboard.data]);
  const ownerRows = useMemo(() => dashboard.data?.charts.by_owner ?? [], [dashboard.data]);

  const dailyCombined = useMemo(() => {
    const cur = fillDailyRange(filters.from, filters.to, dashboard.data?.charts.daily_claims ?? []);
    const prev = fillDailyRange(previousFilters.from, previousFilters.to, previous.data?.charts.daily_claims ?? []);
    return cur.map((c, i) => ({ date: c.date, current: c.count, previous: prev[i]?.count ?? 0 }));
  }, [dashboard.data, previous.data, filters.from, filters.to, previousFilters.from, previousFilters.to]);

  const ownerUnassignedPct = useMemo(() => {
    const total = ownerRows.reduce((sum, r) => sum + r.count, 0);
    const unassigned = ownerRows.find((r) => r.owner === 'ยังไม่ระบุ')?.count ?? 0;
    return total > 0 ? Math.round((unassigned / total) * 100) : 0;
  }, [ownerRows]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-brand-charcoal">Dashboard</h1>
        <p className="text-sm text-slate-500">
          หน้านี้คือภาพรวมงานเคลมสินค้าทั้งหมด — ใช้ดูว่าวันนี้มีเคสอะไรเข้าใหม่ ค้างอยู่กี่เคส และมีเคสไหนเกินกำหนดต้องรีบจัดการ
        </p>
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
                {statusLabel(s)}
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
            <KpiCard
              label="รอรับสินค้า"
              value={dashboard.data.kpi.waiting_receive}
              icon={PackageSearch}
              tone="warning"
              delta={prevKpi && { current: dashboard.data.kpi.waiting_receive, previous: prevKpi.waiting_receive, goodWhenUp: false }}
            />
            <KpiCard
              label="รับเข้าคลังแล้ว"
              value={dashboard.data.kpi.received}
              icon={PackageCheck}
              delta={prevKpi && { current: dashboard.data.kpi.received, previous: prevKpi.received }}
            />
            <KpiCard
              label="กำลังดำเนินการ"
              value={dashboard.data.kpi.in_progress}
              icon={Wrench}
              delta={prevKpi && { current: dashboard.data.kpi.in_progress, previous: prevKpi.in_progress, goodWhenUp: false }}
            />
            <KpiCard
              label="รอจัดส่งคืน"
              value={dashboard.data.kpi.waiting_ship}
              icon={Truck}
              delta={prevKpi && { current: dashboard.data.kpi.waiting_ship, previous: prevKpi.waiting_ship, goodWhenUp: false }}
            />
            <KpiCard
              label="จัดส่งแล้ว"
              value={dashboard.data.kpi.shipped}
              icon={Truck}
              tone="good"
              delta={prevKpi && { current: dashboard.data.kpi.shipped, previous: prevKpi.shipped }}
            />
            <KpiCard
              label="ปิดเคส"
              value={dashboard.data.kpi.closed}
              icon={CheckCircle2}
              tone="good"
              delta={prevKpi && { current: dashboard.data.kpi.closed, previous: prevKpi.closed }}
            />
            <KpiCard
              label="เคสเกิน SLA"
              value={dashboard.data.kpi.overdue_sla}
              icon={AlertOctagon}
              tone="critical"
              delta={prevKpi && { current: dashboard.data.kpi.overdue_sla, previous: prevKpi.overdue_sla, goodWhenUp: false }}
            />
            <KpiCard
              label="มูลค่าสินค้าเคลม"
              value={dashboard.data.kpi.product_value}
              icon={Wallet}
              isCurrency
              delta={prevKpi && { current: dashboard.data.kpi.product_value, previous: prevKpi.product_value, goodWhenUp: false }}
            />
            <KpiCard
              label="มูลค่าความเสียหาย"
              value={dashboard.data.kpi.damage_value}
              icon={Coins}
              isCurrency
              tone="warning"
              delta={prevKpi && { current: dashboard.data.kpi.damage_value, previous: prevKpi.damage_value, goodWhenUp: false }}
            />
          </div>
          <p className="text-xs text-slate-400">
            ลูกศรเทียบกับช่วง {formatThaiDate(previousFilters.from)} - {formatThaiDate(previousFilters.to)} (ช่วงก่อนหน้าที่มีความยาวเท่ากัน)
          </p>

          <Card>
            <CardHeader>
              <CardTitle>จำนวนเคสที่แต่ละคนรับเรื่อง (เจ้าของเคส)</CardTitle>
            </CardHeader>
            <CardContent>
              <RankedBarChart
                data={ownerRows}
                labelKey="owner"
                valueKey="count"
                valueLabel="จำนวนเคส"
                emptyTitle="ยังไม่มีเคสที่กำหนดเจ้าของในช่วงที่เลือก"
                colorFn={(label) => (label === 'ยังไม่ระบุ' ? CHART_OWNER_UNASSIGNED : CHART_OWNER_ASSIGNED)}
              />
              {ownerUnassignedPct > 0 && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4 flex-none" />
                  <span>ต้องระบุผู้รับผิดชอบ: {ownerUnassignedPct}% ของเคสยังไม่ระบุเจ้าของ</span>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>จำนวนเคลมรายวัน</CardTitle>
              </CardHeader>
              <CardContent>
                <DailyClaimsChart data={dailyCombined} />
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
                <StatusProportionStrip data={dashboard.data.charts.by_status} />
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
                  color={CHART_DAMAGE_SKU}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SKU ที่แจ้งเคลมบ่อยที่สุด (Top 10)</CardTitle>
              </CardHeader>
              <CardContent>
                <RankedBarChart
                  data={topClaimedSkuRows}
                  labelKey="label"
                  valueKey="count"
                  valueLabel="จำนวนเคลม"
                  emptyTitle="ไม่มีข้อมูล SKU ในช่วงที่เลือก"
                  color={CHART_CLAIMED_SKU}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>อาการเสียที่พบบ่อย</CardTitle>
              </CardHeader>
              <CardContent>
                <RankedBarChart data={topIssueRows} labelKey="issue" valueKey="count" valueLabel="จำนวนครั้ง" emptyTitle="ไม่มีข้อมูลอาการเสีย" color={CHART_ISSUE} />
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
                  colorFn={colorForCategory}
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
