-- ============ A) ORDER CLAIMING ============

CREATE TABLE IF NOT EXISTS public.order_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  matched_email text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_claims TO authenticated;
GRANT ALL ON public.order_claims TO service_role;
ALTER TABLE public.order_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read order claims" ON public.order_claims
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- normalize existing guest emails
UPDATE public.orders SET guest_email = lower(btrim(guest_email))
 WHERE guest_email IS NOT NULL AND guest_email <> lower(btrim(guest_email));
UPDATE public.profiles SET email = lower(btrim(email))
 WHERE email <> lower(btrim(email));
UPDATE public.customers SET email = lower(btrim(email))
 WHERE email <> lower(btrim(email));

CREATE INDEX IF NOT EXISTS orders_guest_email_norm_idx
  ON public.orders (lower(btrim(guest_email))) WHERE user_id IS NULL;
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id);

-- Links the CURRENT user's unclaimed guest orders to their account.
-- Only runs for verified email addresses.
CREATE OR REPLACE FUNCTION public.claim_my_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  em text;
  confirmed timestamptz;
  linked integer := 0;
BEGIN
  IF uid IS NULL THEN RETURN 0; END IF;

  SELECT lower(btrim(u.email)), COALESCE(u.email_confirmed_at, u.confirmed_at)
    INTO em, confirmed
  FROM auth.users u WHERE u.id = uid;

  IF em IS NULL OR em = '' OR confirmed IS NULL THEN RETURN 0; END IF;

  WITH claimed AS (
    UPDATE public.orders o
       SET user_id = uid, updated_at = now()
     WHERE o.user_id IS NULL
       AND lower(btrim(o.guest_email)) = em
    RETURNING o.id
  ), logged AS (
    INSERT INTO public.order_claims (order_id, user_id, matched_email)
    SELECT id, uid, em FROM claimed
    RETURNING 1
  )
  SELECT count(*)::int INTO linked FROM logged;

  UPDATE public.customers c
     SET user_id = uid, updated_at = now()
   WHERE c.user_id IS NULL AND lower(btrim(c.email)) = em;

  RETURN linked;
END; $$;

REVOKE ALL ON FUNCTION public.claim_my_orders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_my_orders() TO authenticated;

-- One-time backfill across all existing unclaimed orders
WITH verified AS (
  SELECT u.id, lower(btrim(u.email)) AS em
  FROM auth.users u
  WHERE COALESCE(u.email_confirmed_at, u.confirmed_at) IS NOT NULL
    AND u.email IS NOT NULL
), claimed AS (
  UPDATE public.orders o
     SET user_id = v.id, updated_at = now()
    FROM verified v
   WHERE o.user_id IS NULL
     AND lower(btrim(o.guest_email)) = v.em
  RETURNING o.id, v.id AS uid, v.em
)
INSERT INTO public.order_claims (order_id, user_id, matched_email)
SELECT id, uid, em FROM claimed;

UPDATE public.customers c
   SET user_id = u.id, updated_at = now()
  FROM auth.users u
 WHERE c.user_id IS NULL
   AND COALESCE(u.email_confirmed_at, u.confirmed_at) IS NOT NULL
   AND lower(btrim(c.email)) = lower(btrim(u.email));

-- ============ B) GRANT BATCHES ============

CREATE TABLE public.grant_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('plugin','credit')),
  summary text NOT NULL,
  reason text NOT NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  granted_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','complete','failed')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT ON public.grant_batches TO authenticated;
GRANT ALL ON public.grant_batches TO service_role;
ALTER TABLE public.grant_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read grant batches" ON public.grant_batches
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER grant_batches_updated_at BEFORE UPDATE ON public.grant_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ B) PLUGIN GRANTS ============

CREATE TABLE public.plugin_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  reason text NOT NULL,
  granted_by uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  acknowledged_at timestamptz,
  batch_id uuid REFERENCES public.grant_batches(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX plugin_grants_active_unique
  ON public.plugin_grants (customer_id, product_id) WHERE revoked_at IS NULL;
CREATE INDEX plugin_grants_customer_idx ON public.plugin_grants (customer_id);
CREATE INDEX plugin_grants_batch_idx ON public.plugin_grants (batch_id);

GRANT SELECT ON public.plugin_grants TO authenticated;
GRANT ALL ON public.plugin_grants TO service_role;
ALTER TABLE public.plugin_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers read own grants" ON public.plugin_grants
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER plugin_grants_updated_at BEFORE UPDATE ON public.plugin_grants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Customer acknowledges the GIFT badge on their own grants
CREATE OR REPLACE FUNCTION public.acknowledge_plugin_grants(_product_ids uuid[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.plugin_grants
     SET acknowledged_at = now()
   WHERE customer_id = auth.uid()
     AND revoked_at IS NULL
     AND acknowledged_at IS NULL
     AND product_id = ANY(_product_ids);
$$;
REVOKE ALL ON FUNCTION public.acknowledge_plugin_grants(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acknowledge_plugin_grants(uuid[]) TO authenticated;

-- ============ credit ledger batch linkage ============
ALTER TABLE public.store_credit_ledger
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.grant_batches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS store_credit_ledger_batch_idx ON public.store_credit_ledger (batch_id);

-- ============ realtime ============
ALTER TABLE public.plugin_grants REPLICA IDENTITY FULL;
ALTER TABLE public.store_credit_ledger REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.plugin_grants;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.store_credit_ledger;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;