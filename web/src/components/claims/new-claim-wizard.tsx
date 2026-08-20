'use client';

import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Loader2, Send } from 'lucide-react';
import { newClaimSchema, type NewClaimValues } from '@/lib/validators';
import { useMeta } from '@/hooks/use-meta';
import { gvApi, GvApiError } from '@/lib/api';
import { compressImageForUpload } from '@/lib/upload';
import { sha256Hex } from '@/lib/hash';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { StepperHeader } from './stepper-header';
import { StepCustomer } from './step-customer';
import { StepProduct } from './step-product';
import { StepAddress } from './step-address';
import { ClaimSuccess } from './claim-success';
import type { CreateClaimPayload, CreateClaimResult, MirrorClaimPayload } from '@/lib/types';

const STEP_FIELDS: Record<number, (keyof NewClaimValues | 'address')[]> = {
  1: ['channel', 'order_no', 'customer_name', 'phone', 'email'],
  2: ['sku', 'product_name', 'serial_no', 'issue_detail'],
  3: ['address'],
};

/** Uploads every file concurrently instead of one-at-a-time — each upload is its
 * own Apps Script round-trip (Drive can take a couple seconds per file), and
 * doing them all in parallel is what actually makes claim submission fast when
 * a customer attaches photos, rather than paying that cost N times over. Each
 * file is also re-encoded down from phone-camera resolution first (see
 * compressImageForUpload) — that's what was actually making submission feel
 * stuck on a spinner, since a multi-MB base64 payload over an Apps Script Web
 * App round-trip is far slower than the same photo resized for a defect report. */
async function uploadImages(files: File[], imageType: string): Promise<string[]> {
  const results = await Promise.all(
    files.map(async (file) => {
      try {
        const { base64, mimeType, filename } = await compressImageForUpload(file);
        const result = await gvApi.uploadFile({ filename, mime_type: mimeType, data_base64: base64, image_type: imageType });
        return result.url;
      } catch (err) {
        const message = err instanceof GvApiError ? err.message : 'อัปโหลดรูปไม่สำเร็จ';
        toast.warning(`ไม่สามารถอัปโหลด ${file.name}: ${message}`);
        return null;
      }
    }),
  );
  return results.filter((url): url is string => url !== null);
}

/** create_claim now runs against Supabase first (see gvApi.createClaim) —
 * fast, but invisible to every other page (staff receive/ship/claim-detail,
 * /track/[token]) until it's mirrored into Sheets. This call is what does
 * that, retried a few times on failure; if all retries fail, the claim is
 * still safe — the Apps Script reconciliation cron (every 5 minutes) sweeps
 * up anything left unmirrored, so it's a delay, never a loss. */
async function mirrorClaimWithRetry(payload: MirrorClaimPayload, attempts = 3): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      await gvApi.mirrorClaim(payload);
      return;
    } catch (err) {
      if (i === attempts - 1) {
        console.error('mirrorClaim failed after retries — the 5-minute reconciliation cron will pick this claim up', err);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

export function NewClaimWizard() {
  const meta = useMeta();
  const [step, setStep] = useState(1);
  const [productImages, setProductImages] = useState<File[]>([]);
  const [labelImages, setLabelImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ claim_no: string; public_token: string } | null>(null);

  const form = useForm<NewClaimValues>({
    resolver: zodResolver(newClaimSchema),
    defaultValues: {
      channel: '',
      order_no: '',
      customer_name: '',
      phone: '',
      email: '',
      sku: '',
      product_name: '',
      serial_no: '',
      issue_detail: '',
      carrier_in: '',
      tracking_no_in: '',
      ship_date_in: '',
      address: { house_no: '', moo: '', soi: '', road: '', tambon: '', amphoe: '', province: '', zipcode: '' },
    },
    mode: 'onSubmit',
  });

  async function goNext() {
    const fields = STEP_FIELDS[step] ?? [];
    const valid = await form.trigger(fields as (keyof NewClaimValues)[]);
    if (valid) setStep((s) => Math.min(3, s + 1));
  }

  function goBack() {
    setStep((s) => Math.max(1, s - 1));
  }

  // Photos are never on the critical path for showing the customer their
  // claim number — the claim already exists (in Supabase) and the customer
  // doesn't need to wait on Drive uploads to see success. This uploads them
  // and mirrors the whole claim into Sheets afterward, in the background.
  async function finishInBackground(created: CreateClaimResult, payload: CreateClaimPayload) {
    const [productImageUrls, labelImageUrls] = await Promise.all([
      uploadImages(productImages, 'product'),
      uploadImages(labelImages, 'label'),
    ]);

    const mirrorPayload: MirrorClaimPayload = {
      ...payload,
      claim_no: created.claim_no,
      claim_id: created.claim_id,
      public_token_hash: await sha256Hex(created.public_token),
      public_token: created.public_token,
      item: {
        ...payload.item,
        product_image_urls: productImageUrls.length ? productImageUrls : undefined,
        label_image_urls: labelImageUrls.length ? labelImageUrls : undefined,
      },
    };
    await mirrorClaimWithRetry(mirrorPayload);
  }

  async function onSubmit(values: NewClaimValues) {
    setSubmitting(true);
    try {
      const payload: CreateClaimPayload = {
        channel: values.channel,
        order_no: values.order_no,
        customer_name: values.customer_name,
        phone: values.phone,
        email: values.email || undefined,
        address_detail: values.address,
        item: {
          sku: values.sku || undefined,
          product_name: values.product_name,
          serial_no: values.serial_no || undefined,
          issue_detail: values.issue_detail,
        },
        inbound: values.tracking_no_in
          ? { carrier: values.carrier_in || undefined, tracking_no: values.tracking_no_in, ship_date: values.ship_date_in || undefined }
          : undefined,
      };

      const created = await gvApi.createClaim(payload);
      setResult({ claim_no: created.claim_no, public_token: created.public_token });
      toast.success(`สร้างเคส ${created.claim_no} สำเร็จ`);
      void finishInBackground(created, payload);
    } catch (err) {
      const message = err instanceof GvApiError ? err.message : 'ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) return <ClaimSuccess claimNo={result.claim_no} publicToken={result.public_token} />;

  if (meta.isLoading) return <LoadingState label="กำลังเตรียมแบบฟอร์ม..." />;
  if (meta.error || !meta.data) return <ErrorState message={meta.error ?? 'ไม่สามารถโหลดข้อมูลแบบฟอร์มได้'} onRetry={meta.refetch} />;

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <StepperHeader current={step} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {step === 1 && <StepCustomer channels={meta.data.channels} />}
            {step === 2 && (
              <StepProduct
                carriers={meta.data.carriers}
                products={meta.data.products}
                productImages={productImages}
                onProductImagesChange={setProductImages}
                labelImages={labelImages}
                onLabelImagesChange={setLabelImages}
              />
            )}
            {step === 3 && <StepAddress />}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={goBack} disabled={step === 1 || submitting}>
            <ArrowLeft className="h-4 w-4" /> ย้อนกลับ
          </Button>
          {step < 3 ? (
            <Button type="button" variant="brand" onClick={goNext}>
              ถัดไป <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" variant="brand" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              ส่งเรื่องเคลม
            </Button>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
