-- 1) Refund columns on orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS refunded_amount_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_refund_id text,
  ADD COLUMN IF NOT EXISTS refunded_by uuid,
  ADD COLUMN IF NOT EXISTS refund_note text;

CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_refund_id_key
  ON public.orders(stripe_refund_id) WHERE stripe_refund_id IS NOT NULL;

-- 2) Status is always derived from the refunded amount (single source of truth)
CREATE OR REPLACE FUNCTION public.sync_order_refund_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE total_cents integer;
BEGIN
  total_cents := GREATEST(0, ROUND(COALESCE(NEW.total, 0) * 100)::int);
  NEW.refunded_amount_cents := LEAST(GREATEST(COALESCE(NEW.refunded_amount_cents, 0), 0), total_cents);

  IF NEW.status = 'pending' AND COALESCE(NEW.refunded_amount_cents, 0) = 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.refunded_amount_cents = 0 THEN
    IF NEW.status IN ('refunded', 'partial') THEN NEW.status := 'completed'; END IF;
    NEW.refunded_at := NULL;
  ELSIF NEW.refunded_amount_cents >= total_cents THEN
    NEW.status := 'refunded';
    NEW.refunded_at := COALESCE(NEW.refunded_at, now());
  ELSE
    NEW.status := 'partial';
    NEW.refunded_at := COALESCE(NEW.refunded_at, now());
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS orders_sync_refund_status ON public.orders;
CREATE TRIGGER orders_sync_refund_status
  BEFORE INSERT OR UPDATE OF total, refunded_amount_cents ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_order_refund_status();

-- Backfill: existing fully refunded orders carry their full amount
UPDATE public.orders
   SET refunded_amount_cents = GREATEST(0, ROUND(COALESCE(total, 0) * 100)::int),
       refunded_at = COALESCE(refunded_at, updated_at)
 WHERE status = 'refunded' AND refunded_amount_cents = 0;

-- 3) THE shared net-revenue view
CREATE OR REPLACE VIEW public.order_revenue
WITH (security_invoker = true) AS
SELECT
  o.id,
  o.number,
  o.user_id,
  o.customer_id,
  o.guest_email,
  o.customer_name,
  o.status,
  o.created_at,
  o.utm_source,
  o.utm_campaign,
  o.pw_cid,
  o.sale_id,
  o.discount_code,
  o.total,
  GREATEST(0, ROUND(COALESCE(o.total, 0) * 100)::int) AS total_cents,
  o.refunded_amount_cents,
  GREATEST(0, GREATEST(0, ROUND(COALESCE(o.total, 0) * 100)::int) - COALESCE(o.refunded_amount_cents, 0)) AS net_cents,
  ROUND(
    GREATEST(0, GREATEST(0, ROUND(COALESCE(o.total, 0) * 100)::int) - COALESCE(o.refunded_amount_cents, 0))::numeric / 100.0
  , 2) AS net_total,
  (o.status = 'refunded') AS is_fully_refunded,
  (o.status IN ('completed', 'partial')) AS counts_as_sale
FROM public.orders o;

GRANT SELECT ON public.order_revenue TO authenticated;
GRANT ALL ON public.order_revenue TO service_role;

-- 4) Idempotent refund recorder (used by the Stripe webhook and manual overrides)
CREATE OR REPLACE FUNCTION public.record_order_refund(
  _order_id uuid,
  _refunded_total_cents integer,
  _stripe_refund_id text DEFAULT NULL,
  _note text DEFAULT NULL,
  _by uuid DEFAULT NULL
) RETURNS TABLE(order_id uuid, status order_status, refunded_amount_cents integer, net_cents integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE t_cents integer; new_amt integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(_order_id::text, 0));

  SELECT GREATEST(0, ROUND(COALESCE(o.total, 0) * 100)::int) INTO t_cents
  FROM public.orders o WHERE o.id = _order_id;
  IF t_cents IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;

  -- Stripe sends the cumulative refunded amount; clamp and never move backwards
  new_amt := LEAST(GREATEST(COALESCE(_refunded_total_cents, 0), 0), t_cents);

  UPDATE public.orders o
     SET refunded_amount_cents = GREATEST(o.refunded_amount_cents, new_amt),
         stripe_refund_id = COALESCE(_stripe_refund_id, o.stripe_refund_id),
         refund_note = COALESCE(_note, o.refund_note),
         refunded_by = COALESCE(_by, o.refunded_by),
         updated_at = now()
   WHERE o.id = _order_id;

  RETURN QUERY
  SELECT r.id, r.status, r.refunded_amount_cents, r.net_cents
  FROM public.order_revenue r WHERE r.id = _order_id;
END; $$;

REVOKE ALL ON FUNCTION public.record_order_refund(uuid, integer, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_order_refund(uuid, integer, text, text, uuid) TO service_role;

-- 5) Best sellers ignore refunded orders
CREATE OR REPLACE FUNCTION public.get_bestseller_product_ids(_limit integer DEFAULT 20)
RETURNS TABLE(product_id uuid, orders bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT oi.product_id, COUNT(*)::bigint AS orders
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.status IN ('completed', 'partial') AND oi.product_id IS NOT NULL
  GROUP BY oi.product_id
  ORDER BY orders DESC, oi.product_id
  LIMIT GREATEST(_limit, 1)
$$;

-- 6) Customer lifetime totals use net revenue
CREATE OR REPLACE FUNCTION public.admin_customer_list(_q text DEFAULT ''::text, _filter text DEFAULT 'all'::text, _sort text DEFAULT 'recent'::text, _limit integer DEFAULT 30, _offset integer DEFAULT 0)
RETURNS TABLE(key text, customer_id uuid, user_id uuid, email text, name text, has_account boolean, first_order_at timestamp with time zone, last_order_at timestamp with time zone, orders_count bigint, completed_count bigint, total_spent numeric, total_count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
declare
  needle text := replace(replace(replace(coalesce(_q,''), '\', '\\'), '%', '\%'), '_', '\_');
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'not authorized';
  end if;

  return query
  with agg as (
    select
      c.id::text as k, c.id as cid, c.user_id as uid, c.email as em, c.name as nm,
      (c.user_id is not null or bool_or(o.user_id is not null)) as acct,
      least(c.created_at, coalesce(min(o.created_at), c.created_at)) as first_at,
      coalesce(max(o.created_at), c.created_at) as last_at,
      count(o.id) as ocount,
      count(o.id) filter (where o.status in ('completed','partial')) as ccount,
      coalesce(sum(
        greatest(0, greatest(0, round(coalesce(o.total,0) * 100)::int) - coalesce(o.refunded_amount_cents,0))::numeric / 100.0
      ) filter (where o.status in ('completed','partial')), 0)::numeric as spent
    from public.customers c
    left join public.orders o on o.customer_id = c.id
    group by c.id, c.user_id, c.email, c.name, c.created_at
    union all
    select
      'guest:' || lower(coalesce(o.guest_email, 'unknown')) as k,
      null::uuid as cid,
      (array_agg(o.user_id) filter (where o.user_id is not null))[1] as uid,
      coalesce(o.guest_email, 'unknown') as em,
      null::text as nm,
      bool_or(o.user_id is not null) as acct,
      min(o.created_at) as first_at,
      max(o.created_at) as last_at,
      count(o.id) as ocount,
      count(o.id) filter (where o.status in ('completed','partial')) as ccount,
      coalesce(sum(
        greatest(0, greatest(0, round(coalesce(o.total,0) * 100)::int) - coalesce(o.refunded_amount_cents,0))::numeric / 100.0
      ) filter (where o.status in ('completed','partial')), 0)::numeric as spent
    from public.orders o
    where o.customer_id is null
    group by coalesce(o.guest_email, 'unknown')
  ),
  matched as (
    select * from agg
    where (needle = '' or em ilike '%' || needle || '%' or coalesce(nm, '') ilike '%' || needle || '%')
      and (_filter = 'all' or (_filter = 'new' and ccount <= 1) or (_filter = 'returning' and ccount >= 2))
  )
  select m.k, m.cid, m.uid, m.em, m.nm, m.acct, m.first_at, m.last_at, m.ocount, m.ccount, m.spent,
         count(*) over () as total_count
  from matched m
  order by
    case when _sort = 'top' then m.spent end desc nulls last,
    case when _sort = 'most' then m.ccount end desc nulls last,
    case when _sort not in ('top','most') then m.last_at end desc nulls last,
    m.k
  limit greatest(1, least(coalesce(_limit,30), 200))
  offset greatest(0, coalesce(_offset,0));
end;
$$;

-- 7) Fully refunded orders no longer grant library access
CREATE OR REPLACE FUNCTION public.get_my_product_file_updates()
RETURNS TABLE(product_id uuid, file_updated_at timestamp with time zone, acknowledged_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT pf.product_id, pf.file_updated_at, a.acknowledged_at
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  JOIN public.product_files pf ON pf.product_id = oi.product_id
  LEFT JOIN public.product_file_acknowledgements a
    ON a.product_id = oi.product_id AND a.user_id = auth.uid()
  WHERE o.user_id = auth.uid()
    AND o.status IN ('completed', 'partial')
    AND oi.product_id IS NOT NULL;
$$;
