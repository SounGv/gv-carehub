/**
 * Shared domain types for GV CareHub.
 * These mirror the Google Sheets schema documented in data-schema.md and
 * the Apps Script API responses in apps-script/Code.gs.
 */

export const CLAIM_STATUSES = [
  'แจ้งเคลมแล้ว',
  'รอรับสินค้า',
  'รับเข้าคลังแล้ว',
  'กำลังดำเนินการ',
  'รออะไหล่',
  'ดำเนินการเสร็จ',
  'รอจัดส่งคืน',
  'จัดส่งแล้ว',
  'ปิดเคส',
] as const;

export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const CLOSED_STATUSES: ClaimStatus[] = ['จัดส่งแล้ว', 'ปิดเคส'];

export const STAFF_ACTIONABLE_STATUSES: ClaimStatus[] = [
  'รับเข้าคลังแล้ว',
  'กำลังดำเนินการ',
  'รออะไหล่',
  'ดำเนินการเสร็จ',
  'รอจัดส่งคืน',
  'จัดส่งแล้ว',
  'ปิดเคส',
];

export interface ClaimItem {
  claim_no: string;
  item_id: string;
  sku: string;
  product_name: string;
  model: string;
  serial_no: string;
  issue_group: string;
  issue_detail: string;
  quantity: number;
  product_value: number;
  clsbs_id?: string;
  inspection_result?: string;
  warranty_type?: string;
  resolution_method?: string;
  repair_cost?: number;
  technician_note?: string;
  product_image_urls?: string; // comma-separated
  label_image_urls?: string; // comma-separated
  service_updated_at?: string;
  service_updated_by?: string;
}

export interface ShipmentLog {
  shipment_id: string;
  claim_no: string;
  direction: 'inbound' | 'outbound';
  carrier: string;
  tracking_no: string;
  ship_date: string;
  received_date: string;
  scanned_by: string;
  label_image_url: string;
  note: string;
}

export interface StatusHistoryEntry {
  event_id: string;
  claim_no: string;
  from_status: string;
  to_status: string;
  changed_at: string;
  changed_by: string;
  note: string;
}

export interface StaffClaim {
  claim_no: string;
  order_no: string;
  channel?: string;
  customer_name: string;
  phone: string;
  address?: string;
  status: ClaimStatus | string;
  submitted_at: string;
  received_at?: string;
  completed_at?: string;
  shipped_at?: string;
  product_value: number;
  items: ClaimItem[];
  shipments: ShipmentLog[];
  matched_fields?: string[];
}

export interface ClaimDetail {
  claim_no: string;
  order_no: string;
  channel: string;
  customer_name: string;
  phone: string;
  email: string;
  address: string;
  status: ClaimStatus | string;
  submitted_at: string;
  received_at: string;
  completed_at: string;
  shipped_at: string;
  product_value: number;
  owner: string;
  note: string;
  last_updated_at: string;
  last_updated_by: string;
}

export interface PublicClaimItem {
  product_name: string;
  sku: string;
  issue_group: string;
}

export interface PublicClaim {
  claim_no: string;
  status: ClaimStatus | string;
  submitted_at: string;
  received_at: string;
  completed_at: string;
  shipped_at: string;
  items: PublicClaimItem[];
}

export interface DashboardKpi {
  claims_today: number;
  waiting_receive: number;
  received: number;
  in_progress: number;
  waiting_ship: number;
  shipped: number;
  closed: number;
  overdue_sla: number;
  product_value: number;
  damage_value: number;
}

export interface DashboardCharts {
  daily_claims: { date: string; count: number }[];
  by_status: Record<string, number>;
  top_skus_damage: { sku: string; product_name: string; value: number; qty: number }[];
  top_issues: { issue: string; count: number }[];
  damage_by_brand: { brand: string; value: number }[];
  defect_rate_vs_sales: number | null;
}

export interface DashboardResponse {
  ok: true;
  generated_at: string;
  filters: { from: string; to: string; sku: string; status: string; channel: string };
  kpi: DashboardKpi;
  charts: DashboardCharts;
}

export interface ReportRow {
  sku: string;
  product_name: string;
  model: string;
  brand: string;
  qty_sold: number;
  qty_claimed: number;
  defect_rate: number | null;
  in_progress_count: number;
  shipped_count: number;
  status_counts: Record<ClaimStatus, number>;
  damage_value: number;
}

export interface ReportResponse {
  ok: true;
  filters: Record<string, string>;
  rows: ReportRow[];
  summary: { total_sku: number; total_qty_claimed: number; total_damage_value: number; by_status: Record<ClaimStatus, number> };
}

export interface MetaResponse {
  ok: true;
  channels: string[];
  statuses: string[];
  issue_groups: string[];
  carriers: string[];
  skus: string[];
  brands: string[];
  models: string[];
  products: { sku: string; product_name: string; brand: string; model: string; standard_value: number; active: string }[];
}

export interface ClaimDetailResponse {
  ok: true;
  claim: ClaimDetail;
  items: ClaimItem[];
  shipments: ShipmentLog[];
  history: StatusHistoryEntry[];
  clsbs: { claim_no: string; clsbs_id: string; bill_number: string; sku: string; serial_no: string; linked_at: string; linked_by: string; note: string }[];
}

export interface SearchResponse {
  ok: true;
  count: number;
  claims: StaffClaim[];
}

export type LegacyCountRow = { label: string; count: number };

export type LegacyMonthRow = { month: string; count: number };

/** Aggregates from the pre-existing "บริการหลังการขาย" sheet — data entry log, no workflow status. */
export interface LegacyServiceLogStats {
  total_cases: number;
  by_channel: LegacyCountRow[];
  by_issue_group: LegacyCountRow[];
  top_products: LegacyCountRow[];
  by_month: LegacyMonthRow[];
}

/** Aggregates from the pre-existing "CLSBS" sheet — products already received/repaired via vendors. */
export interface LegacyClsbsStats {
  total_records: number;
  top_symptoms: LegacyCountRow[];
  by_brand: LegacyCountRow[];
  by_product_group: LegacyCountRow[];
  money: {
    paid_to_vendor: number;
    received_from_vendor: number;
    charged_to_customer: number;
    refunded_to_customer: number;
  };
}

export interface LegacyReportResponse {
  ok: true;
  generated_at: string;
  service_log: LegacyServiceLogStats;
  clsbs: LegacyClsbsStats;
}

/** One row per claim item — the detailed "รายงานเคลม" report, joined across claim/item/shipment data. */
export interface ClaimReportRow {
  claim_no: string;
  customer_name: string;
  phone: string;
  channel: string;
  order_no: string;
  sku: string;
  product_name: string;
  model: string;
  brand: string;
  issue_group: string;
  issue_detail: string;
  submitted_at: string;
  received_at: string;
  inbound_carrier: string;
  inbound_tracking_no: string;
  warranty_type: string;
  resolution_method: string;
  inspection_result: string;
  repair_cost: number;
  technician_note: string;
  outbound_carrier: string;
  outbound_tracking_no: string;
  shipped_at: string;
  status: ClaimStatus | string;
}

export interface ClaimReportResponse {
  ok: true;
  filters: Record<string, string>;
  rows: ClaimReportRow[];
  summary: {
    total_cases: number;
    total_repair_cost: number;
    by_status: Record<string, number>;
    by_resolution_method: Record<string, number>;
  };
}

export interface CreateClaimResult {
  ok: true;
  claim_no: string;
  claim_id: string;
  public_token: string;
}

/** Response from action=reserve_claim_no — pulls from the same atomic counter createClaim_ uses. */
export interface ReserveClaimNoResponse {
  ok: true;
  claim_no: string;
}

export interface ApiError {
  ok: false;
  error: string;
}

/** Payload sent to POST action=create_claim */
export interface CreateClaimPayload {
  channel: string;
  order_no: string;
  customer_name: string;
  phone: string;
  email?: string;
  note?: string;
  product_value?: number;
  address?: string;
  address_detail?: {
    house_no?: string;
    moo?: string;
    soi?: string;
    road?: string;
    tambon?: string;
    amphoe?: string;
    province?: string;
    zipcode?: string;
  };
  item: {
    sku?: string;
    product_name: string;
    model?: string;
    serial_no?: string;
    issue_group: string;
    issue_detail: string;
    quantity?: number;
    product_value?: number;
    product_image_urls?: string[];
    label_image_urls?: string[];
  };
  inbound?: {
    carrier?: string;
    tracking_no?: string;
    ship_date?: string;
    label_image_url?: string;
  };
}
