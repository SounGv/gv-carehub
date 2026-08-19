'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { PackageCheck, SearchX } from 'lucide-react';
import { gvApi, GvApiError } from '@/lib/api';
import { useAuth } from '@/components/layout/auth-provider';
import { ScanInput } from '@/components/staff/scan-input';
import { ClaimCard, isNameOnlyMatch } from '@/components/staff/claim-card';
import { PendingReviewForm } from '@/components/staff/pending-review-form';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { EmptyState, ErrorState } from '@/components/ui/states';
import type { StaffClaim } from '@/lib/types';

export default function StaffReceivePage() {
  const { session } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StaffClaim[] | null>(null);
  const [selected, setSelected] = useState<StaffClaim | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showPending, setShowPending] = useState(false);
  const [warrantyRemaining, setWarrantyRemaining] = useState('');

  function resetSearch() {
    setQuery('');
    setResults(null);
    setSelected(null);
    setShowPending(false);
    setWarrantyRemaining('');
  }

  async function handleSearch(q: string) {
    setIsSearching(true);
    setSearchError(null);
    setSelected(null);
    setShowPending(false);
    setWarrantyRemaining('');
    setQuery(q);
    try {
      const res = await gvApi.search(q);
      setResults(res.claims);
      if (res.claims.length === 1) setSelected(res.claims[0] ?? null);
    } catch (err) {
      setResults(null);
      setSearchError(err instanceof GvApiError ? err.message : 'ค้นหาไม่สำเร็จ');
    } finally {
      setIsSearching(false);
    }
  }

  async function handleReceive(claim: StaffClaim) {
    if (!session) return;
    setIsReceiving(true);
    try {
      await gvApi.receive(claim.claim_no, session.name, undefined, warrantyRemaining || undefined);
      toast.success(`รับเข้าคลังเคส ${claim.claim_no} เรียบร้อย`);
      resetSearch();
    } catch (err) {
      toast.error(err instanceof GvApiError ? err.message : 'รับเข้าคลังไม่สำเร็จ');
    } finally {
      setIsReceiving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-brand-charcoal">รับพัสดุ (Scan Fast)</h1>
        <p className="text-sm text-slate-500">สแกน Tracking หรือค้นหาด้วยเลขเคส เลขคำสั่งซื้อ Serial หรือเบอร์โทร</p>
      </div>

      <ScanInput onSearch={handleSearch} isLoading={isSearching} />

      {searchError && <ErrorState message={searchError} onRetry={() => handleSearch(query)} />}

      {results && results.length === 0 && !showPending && (
        <div className="space-y-3">
          <EmptyState title="ไม่พบเคส" description={`ไม่พบข้อมูลที่ตรงกับ "${query}"`} />
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => setShowPending(true)}>
              <SearchX className="h-4 w-4" /> สร้างรายการรอตรวจสอบ
            </Button>
          </div>
        </div>
      )}

      {results && results.length === 0 && showPending && session && (
        <PendingReviewForm query={query} actor={session.name} onDone={resetSearch} />
      )}

      {results && results.length > 1 && !selected && (
        <div className="space-y-3">
          <div className="text-sm text-slate-500">พบ {results.length} เคสที่ตรงกัน กรุณาเลือกเคสที่ถูกต้อง</div>
          {results.map((claim) => (
            <button key={claim.claim_no} type="button" onClick={() => setSelected(claim)} className="block w-full text-left">
              <ClaimCard claim={claim} />
            </button>
          ))}
        </div>
      )}

      {selected && (
        <ClaimCard
          claim={selected}
          highlight
          footer={
            <div className="space-y-3">
              <div>
                <Label htmlFor="warranty_remaining">ประกันคงเหลือ</Label>
                <Input
                  id="warranty_remaining"
                  placeholder="เช่น 6 เดือน, หมดประกันแล้ว"
                  value={warrantyRemaining}
                  onChange={(e) => setWarrantyRemaining(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/staff/claims/${selected.claim_no}`} className="text-xs text-slate-500 underline">
                  ดูรายละเอียดเคส
                </Link>
                <div className="flex gap-2">
                  {results && results.length > 1 && (
                    <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
                      เลือกเคสอื่น
                    </Button>
                  )}
                  <Button
                    variant="success"
                    size="sm"
                    loading={isReceiving}
                    disabled={isNameOnlyMatch(selected)}
                    onClick={() => handleReceive(selected)}
                  >
                    <PackageCheck className="h-4 w-4" /> รับเข้าคลัง
                  </Button>
                </div>
              </div>
            </div>
          }
        />
      )}
    </div>
  );
}
