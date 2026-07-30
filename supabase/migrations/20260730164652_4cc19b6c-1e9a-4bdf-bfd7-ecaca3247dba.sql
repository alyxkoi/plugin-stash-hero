-- ============ enums ============
DO $$ BEGIN
  CREATE TYPE public.store_credit_type AS ENUM ('grant','spend','adjustment','reversal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ ledger ============
CREATE TABLE public.store_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  type public.store_credit_type NOT NULL,
  reason text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_by uuid,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_store_credit_ledger_customer ON public.store_credit_ledger(customer_id, created_at DESC);

GRANT SELECT ON public.store_credit_ledger TO authenticated;
GRANT ALL ON public.store_credit_ledger TO service_role;
ALTER TABLE public.store_credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers read own credit ledger"
  ON public.store_credit_ledger FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- ============ reservations ============
CREATE TABLE public.store_credit_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id text NOT NULL UNIQUE,
  reserved_cents integer NOT NULL CHECK (reserved_cents >= 0),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_credit_reservations_customer ON public.store_credit_reservations(customer_id, status);

GRANT ALL ON public.store_credit_reservations TO service_role;
ALTER TABLE public.store_credit_reservations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_credit_reservations_updated_at
  BEFORE UPDATE ON public.store_credit_reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ orders + profiles columns ============
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS credit_applied_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_name text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;

-- ============ balance ============
CREATE OR REPLACE FUNCTION public.store_credit_balance(_customer_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE bal integer;
BEGIN
  IF auth.uid() IS DISTINCT FROM _customer_id
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT COALESCE(SUM(amount_cents), 0) INTO bal
  FROM public.store_credit_ledger WHERE customer_id = _customer_id;
  RETURN bal;
END; $$;

REVOKE ALL ON FUNCTION public.store_credit_balance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.store_credit_balance(uuid) TO authenticated, service_role;

-- ============ admin grant / adjust ============
CREATE OR REPLACE FUNCTION public.admin_grant_store_credit(
  _customer_id uuid,
  _amount_cents integer,
  _reason text,
  _type public.store_credit_type DEFAULT 'grant'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE bal integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _amount_cents IS NULL OR _amount_cents = 0 THEN
    RAISE EXCEPTION 'Amount must be non-zero';
  END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN
    RAISE EXCEPTION 'A reason is required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(_customer_id::text, 0));

  SELECT COALESCE(SUM(amount_cents), 0) INTO bal
  FROM public.store_credit_ledger WHERE customer_id = _customer_id;

  IF bal + _amount_cents < 0 THEN
    RAISE EXCEPTION 'Balance cannot go below zero';
  END IF;

  INSERT INTO public.store_credit_ledger (customer_id, amount_cents, type, reason, created_by)
  VALUES (_customer_id, _amount_cents, _type, btrim(_reason), auth.uid());

  RETURN bal + _amount_cents;
END; $$;

REVOKE ALL ON FUNCTION public.admin_grant_store_credit(uuid, integer, text, public.store_credit_type) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_store_credit(uuid, integer, text, public.store_credit_type) TO authenticated, service_role;

-- ============ atomic spend (server-only) ============
CREATE OR REPLACE FUNCTION public.consume_store_credit(
  _customer_id uuid,
  _order_id uuid,
  _max_cents integer,
  _idempotency_key text,
  _session_id text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE bal integer; spend integer; prior integer;
BEGIN
  IF _max_cents IS NULL OR _max_cents <= 0 THEN RETURN 0; END IF;

  SELECT -amount_cents INTO prior FROM public.store_credit_ledger
   WHERE idempotency_key = _idempotency_key;
  IF prior IS NOT NULL THEN RETURN prior; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(_customer_id::text, 0));

  SELECT COALESCE(SUM(amount_cents), 0) INTO bal
  FROM public.store_credit_ledger WHERE customer_id = _customer_id;

  spend := LEAST(bal, _max_cents);
  IF spend <= 0 THEN
    IF _session_id IS NOT NULL THEN
      UPDATE public.store_credit_reservations SET status = 'released'
       WHERE session_id = _session_id AND status = 'pending';
    END IF;
    RETURN 0;
  END IF;

  INSERT INTO public.store_credit_ledger
    (customer_id, amount_cents, type, reason, order_id, idempotency_key)
  VALUES (_customer_id, -spend, 'spend', 'Applied at checkout', _order_id, _idempotency_key);

  IF _session_id IS NOT NULL THEN
    UPDATE public.store_credit_reservations SET status = 'consumed'
     WHERE session_id = _session_id AND status = 'pending';
  END IF;

  RETURN spend;
END; $$;

REVOKE ALL ON FUNCTION public.consume_store_credit(uuid, uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_store_credit(uuid, uuid, integer, text, text) TO service_role;

-- ============ release reservation (server-only) ============
CREATE OR REPLACE FUNCTION public.release_credit_reservation(_session_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.store_credit_reservations SET status = 'released'
   WHERE session_id = _session_id AND status = 'pending';
$$;

REVOKE ALL ON FUNCTION public.release_credit_reservation(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_credit_reservation(text) TO service_role;

-- ============ signup name capture ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'first_name','') || ' ' || COALESCE(NEW.raw_user_meta_data->>'last_name','')), ''),
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    ),
    NULLIF(NEW.raw_user_meta_data->>'first_name',''),
    NULLIF(NEW.raw_user_meta_data->>'last_name','')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
