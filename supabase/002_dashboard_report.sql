-- dashboard_report: SQL translation of dashboardReport_ (apps-script/Code.gs:609)
-- Returns JSON matching web/src/lib/types.ts DashboardResponse exactly, so
-- web/src/lib/api.ts can call this via supabase.rpc('dashboard_report', {...})
-- and hand the result straight to components with zero shape changes.
--
-- Run this once in the Supabase SQL Editor after 001_schema.sql.

create or replace function dashboard_report(
  p_from text default null,
  p_to text default null,
  p_sku text default null,
  p_status text default null,
  p_channel text default null
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from timestamptz := coalesce(p_from::timestamptz, '2000-01-01'::timestamptz);
  -- p_to is a date string ("YYYY-MM-DD"); end-of-day inclusive, matching
  -- dateRange_()'s `to + 'T23:59:59'` in Code.gs.
  v_to timestamptz := coalesce((p_to::date + 1)::timestamptz, '3000-01-01'::timestamptz);
  v_today date := (now() at time zone 'Asia/Bangkok')::date;
  v_sla_days numeric;
  v_result json;
begin
  select value::numeric into v_sla_days from config where key = 'sla_days';
  v_sla_days := coalesce(v_sla_days, 5);

  create temporary table t_filtered_claims on commit drop as
    select c.*
    from claims c
    where c.submitted_at >= v_from and c.submitted_at < v_to
      and (p_status is null or p_status = '' or c.status = p_status)
      and (p_channel is null or p_channel = '' or c.channel = p_channel)
      and (
        p_sku is null or p_sku = ''
        or exists (select 1 from claim_items i where i.claim_no = c.claim_no and i.sku = p_sku)
      );

  create temporary table t_filtered_items on commit drop as
    select i.* from claim_items i
    where i.claim_no in (select claim_no from t_filtered_claims);

  select json_build_object(
    'ok', true,
    'generated_at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'filters', json_build_object(
      'from', coalesce(p_from, ''), 'to', coalesce(p_to, ''), 'sku', coalesce(p_sku, ''),
      'status', coalesce(p_status, ''), 'channel', coalesce(p_channel, '')
    ),
    'kpi', json_build_object(
      'claims_today', (select count(*) from claims where (submitted_at at time zone 'Asia/Bangkok')::date = v_today),
      'waiting_receive', (select count(*) from t_filtered_claims where status = 'รอรับสินค้า'),
      'received', (select count(*) from t_filtered_claims where status = 'รับเข้าคลังแล้ว'),
      'in_progress', (select count(*) from t_filtered_claims where status in ('กำลังดำเนินการ', 'รออะไหล่')),
      'waiting_ship', (select count(*) from t_filtered_claims where status = 'รอจัดส่งคืน'),
      'shipped', (select count(*) from t_filtered_claims where status = 'จัดส่งแล้ว'),
      'closed', (select count(*) from t_filtered_claims where status = 'ปิดเคส'),
      'overdue_sla', (
        select count(*) from t_filtered_claims
        where status not in ('จัดส่งแล้ว', 'ปิดเคส')
          and (now() - submitted_at) > (v_sla_days || ' days')::interval
      ),
      'product_value', (select coalesce(round(sum(product_value)::numeric, 2), 0) from t_filtered_claims),
      'damage_value', (select coalesce(round(sum(repair_cost)::numeric, 2), 0) from t_filtered_items)
    ),
    'charts', json_build_object(
      'daily_claims', (
        select coalesce(json_agg(json_build_object('date', d, 'count', cnt) order by d), '[]'::json)
        from (
          select to_char(submitted_at at time zone 'Asia/Bangkok', 'YYYY-MM-DD') as d, count(*) as cnt
          from t_filtered_claims group by 1
        ) x
      ),
      'by_status', (
        select coalesce(json_object_agg(status, cnt), '{}'::json)
        from (select status, count(*) as cnt from t_filtered_claims group by 1) x
      ),
      'top_skus_damage', (
        select coalesce(json_agg(json_build_object(
          'sku', sku, 'product_name', product_name, 'value', round(value::numeric, 2), 'qty', qty
        ) order by value desc), '[]'::json)
        from (
          select coalesce(nullif(sku, ''), 'ไม่ระบุ SKU') as sku,
                 max(product_name) as product_name,
                 sum(coalesce(repair_cost, 0)) as value,
                 sum(coalesce(quantity, 1)) as qty
          from t_filtered_items group by 1 order by value desc limit 10
        ) x
      ),
      'top_issues', (
        select coalesce(json_agg(json_build_object('issue', issue, 'count', cnt) order by cnt desc), '[]'::json)
        from (
          select coalesce(nullif(issue_group, ''), 'ไม่ระบุอาการ') as issue, count(*) as cnt
          from t_filtered_items group by 1 order by cnt desc limit 10
        ) x
      ),
      'damage_by_brand', (
        select coalesce(json_agg(json_build_object('brand', brand, 'value', round(value::numeric, 2)) order by value desc), '[]'::json)
        from (
          select coalesce(p.brand, 'ไม่ระบุแบรนด์') as brand, sum(coalesce(fi.repair_cost, 0)) as value
          from t_filtered_items fi
          left join products p on p.sku = fi.sku
          group by 1
        ) x
      ),
      'by_owner', (
        select coalesce(json_agg(json_build_object('owner', owner, 'count', cnt) order by cnt desc), '[]'::json)
        from (
          select coalesce(nullif(owner, ''), 'ยังไม่ระบุ') as owner, count(*) as cnt
          from t_filtered_claims group by 1
        ) x
      ),
      'defect_rate_vs_sales', (
        select case when sales_total > 0 then round((claimed_qty::numeric / sales_total::numeric * 100), 2) else null end
        from (
          select
            (select coalesce(sum(qty_sold), 0) from sales_daily
             where sale_date >= v_from::date and sale_date < v_to::date
               and (p_sku is null or p_sku = '' or sku = p_sku)) as sales_total,
            (select coalesce(sum(quantity), 0) from t_filtered_items) as claimed_qty
        ) y
      )
    )
  ) into v_result;

  return v_result;
end;
$$;

-- The publishable/anon key's Postgres role (anon) has no execute rights on
-- new functions by default — this is what lets the frontend call the RPC
-- via supabase-js while still having zero direct access to the underlying
-- tables (customer PII stays unreachable from the public key).
grant execute on function dashboard_report(text, text, text, text, text) to anon;
