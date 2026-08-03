-- Shared normalized-email identity for orders (guest + account orders unify by email)
CREATE OR REPLACE VIEW public.order_customer_identity
WITH (security_invoker = true) AS
WITH base AS (
  SELECT
    o.id AS order_id,
    o.created_at,
    o.total,
    o.status,
    o.refunded_amount_cents,
    lower(btrim(COALESCE(NULLIF(o.guest_email, ''), c.email, p.email, ''))) AS normalized_email
  FROM public.orders o
  LEFT JOIN public.customers c ON c.id = o.customer_id
  LEFT JOIN public.profiles p ON p.id = o.user_id
)
SELECT
  b.order_id,
  b.normalized_email,
  b.created_at,
  b.total,
  b.status,
  b.refunded_amount_cents,
  ROW_NUMBER() OVER (PARTITION BY b.normalized_email ORDER BY b.created_at, b.order_id) AS order_index,
  (ROW_NUMBER() OVER (PARTITION BY b.normalized_email ORDER BY b.created_at, b.order_id) = 1) AS is_first_order,
  MIN(b.created_at) OVER (PARTITION BY b.normalized_email) AS first_order_at
FROM base b
WHERE b.normalized_email <> '';

GRANT SELECT ON public.order_customer_identity TO authenticated;
GRANT ALL ON public.order_customer_identity TO service_role;

-- Count of distinct customers whose FIRST EVER order lands in the current month (America/Chicago)
CREATE OR REPLACE FUNCTION public.admin_new_customers_this_month()
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE n integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT count(*) INTO n
  FROM (
    SELECT normalized_email, min(created_at) AS first_at
    FROM public.order_customer_identity
    GROUP BY normalized_email
  ) f
  WHERE date_trunc('month', f.first_at AT TIME ZONE 'America/Chicago')
      = date_trunc('month', now() AT TIME ZONE 'America/Chicago');
  RETURN COALESCE(n, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_new_customers_this_month() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_new_customers_this_month() TO authenticated;

-- Discount code admin label (does not affect checkout behaviour)
ALTER TABLE public.discount_codes ADD COLUMN IF NOT EXISTS name text;

-- Indexes for email-based identity lookups
CREATE INDEX IF NOT EXISTS orders_guest_email_norm_idx ON public.orders (lower(btrim(guest_email)));
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at);
