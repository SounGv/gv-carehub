/**
 * GV CareHub API adapter.
 *
 * Single entry point for every call to the Google Apps Script backend.
 * No component should call `fetch` directly against the API — everything
 * goes through the functions exported here so the request/response shape
 * only needs to change in one place.
 */
import type {
  ApiError,
  ClaimDetailResponse,
  ClaimReportResponse,
  CreateClaimPayload,
  CreateClaimResult,
  DashboardResponse,
  LegacyClsbsRow,
  LegacyMetaResponse,
  LegacyReportResponse,
  LegacyRowsResponse,
  LegacyServiceLogRow,
  MetaResponse,
  ReportResponse,
  SearchResponse,
  SupplierRmaAnalyticsResponse,
  SupplierRmaBatchDetailResponse,
  SupplierRmaBatchSummary,
  SupplierRmaCandidateRow,
  SupplierRmaCreateBatchResult,
} from './types';

export class GvApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GvApiError';
  }
}

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_GV_API_URL;
  if (!url) {
    throw new GvApiError(
      'ยังไม่ได้ตั้งค่า NEXT_PUBLIC_GV_API_URL กรุณาตั้งค่า Environment Variable ให้เป็น URL ของ Google Apps Script Web App',
    );
  }
  return url.replace(/\/$/, '');
}

function friendlyError(err: unknown): GvApiError {
  if (err instanceof GvApiError) return err;
  if (err instanceof TypeError) {
    return new GvApiError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง');
  }
  if (err instanceof Error) return new GvApiError(err.message);
  return new GvApiError('เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ กรุณาลองใหม่อีกครั้ง');
}

async function apiGet<T>(action: string, params: Record<string, string | undefined> = {}): Promise<T> {
  try {
    const base = getBaseUrl();
    const query = new URLSearchParams({ action });
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') query.set(key, value);
    });
    const response = await fetch(`${base}?${query.toString()}`, { cache: 'no-store' });
    if (!response.ok) throw new GvApiError(`เซิร์ฟเวอร์ตอบกลับผิดพลาด (HTTP ${response.status})`);
    const data = (await response.json()) as T | ApiError;
    if ((data as ApiError).ok === false) throw new GvApiError((data as ApiError).error || 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์');
    return data as T;
  } catch (err) {
    throw friendlyError(err);
  }
}

async function apiPost<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  try {
    const base = getBaseUrl();
    const response = await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...payload, action }),
    });
    if (!response.ok) throw new GvApiError(`เซิร์ฟเวอร์ตอบกลับผิดพลาด (HTTP ${response.status})`);
    const data = (await response.json()) as T | ApiError;
    if ((data as ApiError).ok === false) throw new GvApiError((data as ApiError).error || 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์');
    return data as T;
  } catch (err) {
    throw friendlyError(err);
  }
}

export interface DashboardFilters {
  from?: string;
  to?: string;
  sku?: string;
  status?: string;
  channel?: string;
}

export interface ReportFilters {
  from?: string;
  to?: string;
  sku?: string;
  model?: string;
  brand?: string;
  status?: string;
  carrier?: string;
}

export interface ClaimReportFilters {
  from?: string;
  to?: string;
  sku?: string;
  model?: string;
  brand?: string;
  status?: string;
  channel?: string;
  resolution_method?: string;
}

export interface LegacyServiceLogFilters {
  from?: string;
  to?: string;
  channel?: string;
  issue_group?: string;
  q?: string;
  page?: string;
  page_size?: string;
}

export interface LegacyClsbsFilters {
  from?: string;
  to?: string;
  brand?: string;
  product_group?: string;
  status?: string;
  q?: string;
  page?: string;
  page_size?: string;
}

export interface SupplierRmaCandidateFilters {
  from?: string;
  to?: string;
  brand?: string;
  product_group?: string;
  q?: string;
  page?: string;
  page_size?: string;
}

export interface SupplierRmaBatchFilters {
  vendor?: string;
  status?: string;
}

export const gvApi = {
  health: () => apiGet<{ ok: true; service: string; server_time: string }>('health'),

  meta: () => apiGet<MetaResponse>('meta'),

  trackStatus: (token: string) => apiGet<{ ok: true; claim: import('./types').PublicClaim }>('status', { token }),

  search: (q: string) => apiGet<SearchResponse>('search', { q }),

  report: (filters: ReportFilters) => apiGet<ReportResponse>('report', filters as Record<string, string | undefined>),

  claimReport: (filters: ClaimReportFilters) => apiGet<ClaimReportResponse>('claim_report', filters as Record<string, string | undefined>),

  dashboard: (filters: DashboardFilters) => apiGet<DashboardResponse>('dashboard', filters as Record<string, string | undefined>),

  legacyReport: () => apiGet<LegacyReportResponse>('legacy_report'),

  legacyMeta: () => apiGet<LegacyMetaResponse>('legacy_meta'),

  legacyServiceLogRows: (filters: LegacyServiceLogFilters) =>
    apiGet<LegacyRowsResponse<LegacyServiceLogRow>>('legacy_service_log_rows', filters as Record<string, string | undefined>),

  legacyClsbsRows: (filters: LegacyClsbsFilters) =>
    apiGet<LegacyRowsResponse<LegacyClsbsRow>>('legacy_clsbs_rows', filters as Record<string, string | undefined>),

  claimDetail: (claimNo: string) => apiGet<ClaimDetailResponse>('claim_detail', { claim_no: claimNo }),

  createClaim: (payload: CreateClaimPayload) => apiPost<CreateClaimResult>('create_claim', payload as unknown as Record<string, unknown>),

  receive: (claimNo: string, actor: string, note?: string) =>
    apiPost<{ ok: true; claim_no: string; status: string; updated_at: string }>('receive', { claim_no: claimNo, actor, note }),

  service: (claimNo: string, toStatus: string, actor: string, note?: string) =>
    apiPost<{ ok: true; claim_no: string; status: string; updated_at: string }>('service', { claim_no: claimNo, to_status: toStatus, actor, note }),

  ship: (payload: { claim_no: string; carrier: string; tracking_no: string; ship_date?: string; label_image_url?: string; actor: string; note?: string; replacement_sku?: string }) =>
    apiPost<{ ok: true; claim_no: string; status: string; updated_at: string }>('ship', payload),

  linkClsbs: (payload: { claim_no: string; clsbs_id: string; bill_number?: string; sku?: string; serial_no?: string; actor: string; note?: string }) =>
    apiPost<{ ok: true; claim_no: string; clsbs_id: string }>('link_clsbs', payload),

  updateServiceDetail: (payload: {
    claim_no: string;
    inspection_result?: string;
    warranty_type?: string;
    resolution_method?: string;
    repair_cost?: number;
    technician_note?: string;
    actor: string;
  }) => apiPost<{ ok: true; claim_no: string; updated_at: string }>('update_service_detail', payload),

  createPending: (payload: { tracking_no?: string; order_no?: string; phone?: string; note?: string; actor: string }) =>
    apiPost<{ ok: true; message: string }>('create_pending', payload),

  uploadFile: (payload: { filename: string; mime_type: string; data_base64: string; claim_no?: string; image_type?: string }) =>
    apiPost<{ ok: true; url: string; file_id: string }>('upload_file', payload),

  supplierRmaCandidates: (filters: SupplierRmaCandidateFilters) =>
    apiGet<LegacyRowsResponse<SupplierRmaCandidateRow>>('supplier_rma_candidates', filters as Record<string, string | undefined>),

  supplierRmaCreateBatch: (payload: { ids: string[]; vendor: string; actor: string }) =>
    apiPost<SupplierRmaCreateBatchResult>('supplier_rma_create_batch', payload),

  supplierRmaBatches: (filters: SupplierRmaBatchFilters) =>
    apiGet<{ ok: true; batches: SupplierRmaBatchSummary[] }>('supplier_rma_batches', filters as Record<string, string | undefined>),

  supplierRmaBatchDetail: (batchNo: string) => apiGet<SupplierRmaBatchDetailResponse>('supplier_rma_batch_detail', { batch_no: batchNo }),

  supplierRmaUpdateItem: (payload: {
    id: string;
    returned_from_vendor_date?: string;
    received_from_vendor?: number;
    returned_sn?: string;
    reject_reason?: string;
    actor: string;
  }) => apiPost<{ ok: true; id: string }>('supplier_rma_update_item', payload),

  supplierRmaUpdateBatchStatus: (payload: { batch_no: string; status: string; actor: string; note?: string }) =>
    apiPost<{ ok: true; batch_no: string; status: string }>('supplier_rma_update_batch_status', payload),

  supplierRmaAnalytics: () => apiGet<SupplierRmaAnalyticsResponse>('supplier_rma_analytics'),
};
