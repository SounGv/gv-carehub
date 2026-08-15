'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Truck } from 'lucide-react';
import { gvApi, GvApiError } from '@/lib/api';
import { useAuth } from '@/components/layout/auth-provider';
import { useMeta } from '@/hooks/use-meta';
import { ScanInput } from '@/components/staff/scan-input';
import { ClaimCard } from '@/components/staff/claim-card';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { shipFormSchema, type ShipFormValues } from '@/lib/validators';
import type { StaffClaim } from '@/lib/types';

function StaffShipContent() {
  const { session } = useAuth();
  const meta = useMeta();
  const searchParams = useSearchParams();
  const prefilledRef = useRef(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StaffClaim[] | null>(null);
  const [selected, setSelected] = useState<StaffClaim | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ShipFormValues>({
    resolver: zodResolver(shipFormSchema),
    defaultValues: { claim_no: '', carrier: '', tracking_no: '', ship_date: format(new Date(), 'yyyy-MM-dd'), note: '' },
  });

  async function handleSearch(q: string) {
    setIsSearching(true);
    setSearchError(null);
    setQuery(q);
    try {
      const res = await gvApi.search(q);
      setResults(res.claims);
      if (res.claims.length === 1) selectClaim(res.claims[0] ?? null);
    } catch (err) {
      setResults(null);
      setSearchError(err instanceof GvApiError ? err.message : 'ค้นหาไม่สำเร็จ');
    } finally {
      setIsSearching(false);
    }
  }

  function selectClaim(claim: StaffClaim | null) {
    setSelected(claim);
    if (claim) form.setValue('claim_no', claim.claim_no);
  }

  useEffect(() => {
    const prefill = searchParams.get('claim_no');
    if (prefill && !prefilledRef.current) {
      prefilledRef.current = true;
      handleSearch(prefill);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function onSubmit(values: ShipFormValues) {
    if (!session || !selected) return;
    setSubmitting(true);
    try {
      await gvApi.ship({
        claim_no: values.claim_no,
        carrier: values.carrier,
        tracking_no: values.tracking_no,
        ship_date: values.ship_date,
        note: values.note || undefined,
        actor: session.name,
      });
      toast.success(`บันทึกจัดส่งคืนเคส ${values.claim_no} สำเร็จ`);
      setSelected(null);
      setResults(null);
      setQuery('');
      form.reset({ claim_no: '', carrier: '', tracking_no: '', ship_date: format(new Date(), 'yyyy-MM-dd'), note: '' });
    } catch (err) {
      toast.error(err instanceof GvApiError ? err.message : 'บันทึกจัดส่งคืนไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-brand-charcoal">ยืนยันจัดส่งคืน</h1>
        <p className="text-sm text-slate-500">ค้นหาด้วยเลขเคส Tracking ขาเข้า เลขคำสั่งซื้อ หรือชื่อลูกค้า</p>
      </div>

      <ScanInput
        onSearch={handleSearch}
        isLoading={isSearching}
        placeholder="ค้นหาด้วย Claim No. / Tracking ขาเข้า / Order No. / ชื่อลูกค้า"
      />

      {searchError && <ErrorState message={searchError} onRetry={() => handleSearch(query)} />}
      {results && results.length === 0 && <EmptyState title="ไม่พบเคส" description={`ไม่พบข้อมูลที่ตรงกับ "${query}"`} />}

      {results && results.length > 1 && !selected && (
        <div className="space-y-3">
          <div className="text-sm text-slate-500">พบ {results.length} เคส กรุณาเลือกเคสที่ต้องการยืนยันจัดส่งคืน</div>
          {results.map((claim) => (
            <button key={claim.claim_no} type="button" onClick={() => selectClaim(claim)} className="block w-full text-left">
              <ClaimCard claim={claim} />
            </button>
          ))}
        </div>
      )}

      {selected && (
        <>
          <ClaimCard
            claim={selected}
            highlight
            footer={
              results && results.length > 1 ? (
                <Button variant="outline" size="sm" onClick={() => selectClaim(null)}>
                  เลือกเคสอื่น
                </Button>
              ) : undefined
            }
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-4 w-4" /> ข้อมูลจัดส่งคืน
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="carrier">ขนส่งขาออก</Label>
                  <Select id="carrier" {...form.register('carrier')}>
                    <option value="">เลือกขนส่ง</option>
                    {(meta.data?.carriers ?? []).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                  {form.formState.errors.carrier && <p className="mt-1 text-xs text-error">{form.formState.errors.carrier.message}</p>}
                </div>
                <div>
                  <Label htmlFor="tracking_no">Tracking Number ใหม่</Label>
                  <Input id="tracking_no" {...form.register('tracking_no')} placeholder="เลข Tracking ขาออก" />
                  {form.formState.errors.tracking_no && <p className="mt-1 text-xs text-error">{form.formState.errors.tracking_no.message}</p>}
                </div>
                <div>
                  <Label htmlFor="ship_date">วันที่ส่ง</Label>
                  <Input id="ship_date" type="date" {...form.register('ship_date')} />
                  {form.formState.errors.ship_date && <p className="mt-1 text-xs text-error">{form.formState.errors.ship_date.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="note">หมายเหตุ</Label>
                  <Textarea id="note" {...form.register('note')} rows={2} />
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" variant="brand" loading={submitting}>
                    ยืนยันจัดส่งคืน
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function StaffShipPage() {
  return (
    <Suspense fallback={null}>
      <StaffShipContent />
    </Suspense>
  );
}
