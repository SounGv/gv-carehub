-- create_claim: SQL translation of createClaim_ + validateClaim_ + buildAddress_
-- + assertTrackingAvailable_ (apps-script/Code.gs:174, 237, 361, 1571), so
-- web/src/lib/api.ts can call this via supabase.rpc('create_claim', { p: payload })
-- and get the claim_no/token back fast (sub-second) instead of paying Apps
-- Script's ~1.1-3s per-call latency floor.
--
-- Sheets stays the source of truth for every OTHER page (staff receive/ship/
-- claim-detail, the customer's own /track/[token]) — none of those read
-- Supabase. So a claim created here is invisible to the rest of the app until
-- it's mirrored into Google Sheets by the new `mirror_claim` Apps Script
-- action (client-triggered right after this call succeeds, with a 5-minute
-- cron sweep as the guaranteed backstop — see Code.gs). The `sheets_synced`
-- columns below track that handoff.
--
-- Run this once in the Supabase SQL Editor after 001_schema.sql and
-- 002_dashboard_report.sql.

-- Needed for gen_random_bytes()/digest() (the public token + its sha256 hash)
-- — gen_random_uuid() is core Postgres since v13, but those two are not.
create extension if not exists pgcrypto;

alter table claims add column if not exists sheets_synced boolean not null default false;
alter table claims add column if not exists sheets_sync_attempts int not null default 0;
alter table claims add column if not exists sheets_sync_last_error text;

create index if not exists idx_claims_sheets_unsynced on claims(submitted_at) where sheets_synced = false;

-- claim_no generation: no such sequence exists yet — claim_no has always been
-- a bare text column, with Sheets' Config.last_claim_number (+ a legacy-sheet
-- max-number scan) as the only counter. Seed this sequence from the REAL
-- current max, read live via GET ?action=claim_no_status immediately before
-- running this file, plus a safety buffer — never hardcode a guessed number.
--
-- As of this migration being written, that live check returned
-- config_last_claim_number=25182 / legacy_max_claim_number=25182, so the seed
-- below is 25182 + 200 = 25382 (first issued number: GV25383). If you're
-- re-running this later, re-check claim_no_status and raise the seed value
-- below accordingly — the guard only ever moves the sequence forward, so
-- re-running with the same or a lower number is always safe (a no-op).
create sequence if not exists claim_no_seq;

do $$
begin
  if (select last_value from claim_no_seq) < 25382 then
    perform setval('claim_no_seq', 25382, true);
  end if;
end $$;

create or replace function next_claim_no() returns text
language sql
security definer
set search_path = public
as $$
  select 'GV' || nextval('claim_no_seq')::text;
$$;
-- Intentionally NOT granted to anon — only called from inside create_claim()
-- below, never directly from the browser.

-- Ongoing safety net: if staff ever hand-type a new GV##### number directly
-- into the legacy บริการหลังการขาย sheet after this migration ships (the
-- habit that caused the GV25083 incident referenced in Code.gs), the next
-- Apps Script reconciliation run reports that sheet's live max here so the
-- Postgres sequence can never issue a number that collides with it.
create or replace function bump_claim_seq_if_behind(p_legacy_max bigint) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_legacy_max > (select last_value from claim_no_seq) then
    perform setval('claim_no_seq', p_legacy_max, true);
  end if;
end $$;
-- Called only from Apps Script's reconciliation trigger, which authenticates
-- with the service_role key (never exposed to the browser) — grant to
-- service_role only, never to anon.
grant execute on function bump_claim_seq_if_behind(bigint) to service_role;

create or replace function create_claim(p jsonb) returns json
language plpgsql
security definer
-- Supabase installs pgcrypto into the `extensions` schema, not `public` — the
-- schema-qualified search_path here is required for gen_random_bytes()/digest()
-- to resolve (found the hard way: without `extensions`, every call fails with
-- "function gen_random_bytes(integer) does not exist" even though the
-- extension itself is created successfully).
set search_path = public, extensions
as $$
declare
  v_claim_no text;
  v_claim_id text := gen_random_uuid()::text;
  v_token text := encode(gen_random_bytes(32), 'hex');
  v_token_hash text := encode(digest(v_token, 'sha256'), 'hex');
  v_now timestamptz := now();
  v_address text;
  v_carrier text := coalesce(p->'inbound'->>'carrier', '');
  v_tracking text := coalesce(p->'inbound'->>'tracking_no', '');
  v_item_id text := gen_random_uuid()::text;
  v_product_value numeric := coalesce((p->>'product_value')::numeric, 0);
begin
  -- validateClaim_ mirror (Code.gs:1571) — same messages, same order.
  if coalesce(p->>'customer_name', '') = '' then
    raise exception 'กรุณาระบุชื่อลูกค้า';
  end if;
  if length(regexp_replace(coalesce(p->>'phone', ''), '[^0-9]', '', 'g')) < 9 then
    raise exception 'กรุณาระบุเบอร์โทรให้ถูกต้อง';
  end if;
  if coalesce(p->>'order_no', '') = '' then
    raise exception 'กรุณาระบุเลขคำสั่งซื้อ';
  end if;
  if coalesce(p->'item'->>'sku', '') = '' and coalesce(p->'item'->>'product_name', '') = '' then
    raise exception 'กรุณาระบุสินค้า';
  end if;
  if coalesce(p->'item'->>'issue_detail', '') = '' then
    raise exception 'กรุณาระบุอาการเสีย';
  end if;

  -- assertTrackingAvailable_ mirror (Code.gs:361) — same-carrier duplicate-tracking check.
  if v_tracking <> '' and exists (
    select 1 from shipment_log
    where tracking_no = v_tracking and lower(coalesce(carrier, '')) = lower(v_carrier)
  ) then
    raise exception 'Tracking นี้ถูกใช้แล้ว';
  end if;

  -- buildAddress_ mirror (Code.gs:237) — same Thai prefixes, same order, same
  -- "no space before soi/road/tambon/amphoe/province" quirk as the original.
  v_address := (
    select nullif(string_agg(part, ' '), '')
    from unnest(array[
      case when nullif(p->'address_detail'->>'house_no', '') is not null then 'บ้านเลขที่ ' || (p->'address_detail'->>'house_no') end,
      case when nullif(p->'address_detail'->>'moo', '') is not null then 'หมู่ ' || (p->'address_detail'->>'moo') end,
      case when nullif(p->'address_detail'->>'soi', '') is not null then 'ซอย' || (p->'address_detail'->>'soi') end,
      case when nullif(p->'address_detail'->>'road', '') is not null then 'ถนน' || (p->'address_detail'->>'road') end,
      case when nullif(p->'address_detail'->>'tambon', '') is not null then 'ตำบล/แขวง' || (p->'address_detail'->>'tambon') end,
      case when nullif(p->'address_detail'->>'amphoe', '') is not null then 'อำเภอ/เขต' || (p->'address_detail'->>'amphoe') end,
      case when nullif(p->'address_detail'->>'province', '') is not null then 'จังหวัด' || (p->'address_detail'->>'province') end,
      nullif(p->'address_detail'->>'zipcode', '')
    ]) as part
    where part is not null
  );
  v_address := coalesce(nullif(p->>'address', ''), v_address, '');

  v_claim_no := next_claim_no();

  insert into claims (
    claim_no, claim_id, submitted_at, channel, order_no, customer_name, phone,
    email, address, status, public_token_hash, received_at, completed_at,
    shipped_at, product_value, owner, last_updated_at, last_updated_by, note,
    sheets_synced
  ) values (
    v_claim_no, v_claim_id, v_now, coalesce(p->>'channel', ''), p->>'order_no',
    p->>'customer_name', regexp_replace(coalesce(p->>'phone', ''), '[^0-9]', '', 'g'),
    coalesce(p->>'email', ''), v_address, 'แจ้งเคลมแล้ว', v_token_hash,
    null, null, null, v_product_value, '', v_now, 'customer',
    coalesce(p->>'note', ''), false
  );

  insert into claim_items (
    item_id, claim_no, sku, product_name, model, serial_no, issue_group,
    issue_detail, quantity, product_value, product_image_urls, label_image_urls
  ) values (
    v_item_id, v_claim_no, coalesce(p->'item'->>'sku', ''), coalesce(p->'item'->>'product_name', ''),
    coalesce(p->'item'->>'model', ''), coalesce(p->'item'->>'serial_no', ''),
    coalesce(p->'item'->>'issue_group', ''), p->'item'->>'issue_detail',
    coalesce((p->'item'->>'quantity')::numeric, 1),
    coalesce((p->'item'->>'product_value')::numeric, v_product_value, 0),
    '', ''
  );

  if v_tracking <> '' then
    insert into shipment_log (shipment_id, claim_no, direction, carrier, tracking_no, ship_date, scanned_by, label_image_url)
    values (
      gen_random_uuid()::text, v_claim_no, 'inbound', v_carrier, v_tracking,
      coalesce((p->'inbound'->>'ship_date')::timestamptz, v_now), 'customer',
      coalesce(p->'inbound'->>'label_image_url', '')
    );
  end if;

  return json_build_object('ok', true, 'claim_no', v_claim_no, 'claim_id', v_claim_id, 'public_token', v_token);
end;
$$;

-- Same reasoning as dashboard_report's grant: the anon key's Postgres role
-- gets execute rights on this one function only, never direct table access
-- (see 001_schema.sql's `revoke all ... from anon`) — customer PII stays
-- reachable only through validated inserts this function controls.
grant execute on function create_claim(jsonb) to anon;
