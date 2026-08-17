-- GV CareHub Phase 1: Supabase schema mirroring the Base-10 Google Sheets schema
-- (apps-script/Code.gs HEADERS, lines 35-66), scoped to the tables the
-- Dashboard/Reports pages need (claims, items, products, sales, shipments,
-- config). Sheets remains the source of truth for writes in Phase 1 — this
-- is a read-optimized replica kept in sync one-way (Sheets -> Supabase).
--
-- Run this once in the Supabase SQL Editor for a fresh project.

create table if not exists claims (
  claim_no text primary key,
  claim_id text,
  submitted_at timestamptz,
  channel text,
  order_no text,
  customer_name text,
  phone text,
  email text,
  address text,
  status text,
  public_token_hash text,
  received_at timestamptz,
  completed_at timestamptz,
  shipped_at timestamptz,
  product_value numeric default 0,
  owner text,
  last_updated_at timestamptz,
  last_updated_by text,
  note text
);

create table if not exists claim_items (
  item_id text primary key,
  claim_no text references claims(claim_no) on delete cascade,
  sku text,
  product_name text,
  model text,
  serial_no text,
  issue_group text,
  issue_detail text,
  quantity numeric default 1,
  product_value numeric default 0,
  clsbs_id text,
  inspection_result text,
  warranty_type text,
  resolution_method text,
  repair_cost numeric default 0,
  technician_note text,
  product_image_urls text,
  label_image_urls text,
  service_updated_at timestamptz,
  service_updated_by text
);

create table if not exists products (
  sku text primary key,
  product_name text,
  brand text,
  model text,
  standard_value numeric default 0,
  active boolean default true
);

create table if not exists sales_daily (
  sale_date date not null,
  sku text not null,
  qty_sold numeric default 0,
  sales_value numeric default 0,
  primary key (sale_date, sku)
);

create table if not exists shipment_log (
  shipment_id text primary key,
  claim_no text references claims(claim_no) on delete cascade,
  direction text,
  carrier text,
  tracking_no text,
  ship_date timestamptz,
  received_date timestamptz,
  scanned_by text,
  label_image_url text,
  note text
);

create table if not exists config (
  key text primary key,
  value text
);

-- These indexes are the actual fix for the Sheets-based slowness: Postgres
-- can satisfy a date-range/status/sku filter via index lookup instead of
-- scanning every row, regardless of how large the tables grow.
create index if not exists idx_claims_submitted_at on claims(submitted_at);
create index if not exists idx_claims_status on claims(status);
create index if not exists idx_claims_channel on claims(channel);
create index if not exists idx_claim_items_claim_no on claim_items(claim_no);
create index if not exists idx_claim_items_sku on claim_items(sku);
create index if not exists idx_shipment_log_claim_no on shipment_log(claim_no);
create index if not exists idx_sales_daily_date on sales_daily(sale_date);
create index if not exists idx_sales_daily_sku on sales_daily(sku);

-- Defense-in-depth: these tables hold real customer names/phones/addresses.
-- "Automatically expose new tables" was deliberately left unchecked when
-- creating this project, but revoke explicitly too so a future config
-- change can't accidentally make these directly queryable via the public
-- (anon) API key. The only sanctioned access path is the RPC functions in
-- 002+, which are SECURITY DEFINER and return aggregates/rows they choose.
revoke all on claims, claim_items, products, sales_daily, shipment_log, config from anon, authenticated;

