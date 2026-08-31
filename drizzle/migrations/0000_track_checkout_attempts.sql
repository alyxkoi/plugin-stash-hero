CREATE TABLE IF NOT EXISTS public.checkout_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  stripe_session_id TEXT UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_email TEXT,
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'live')),
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'pending', 'completed', 'expired', 'failed')),
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_checkout_attempts_created_at
  ON public.checkout_attempts (created_at DESC);

GRANT ALL ON public.checkout_attempts TO service_role;
GRANT SELECT ON public.checkout_attempts TO authenticated;

ALTER TABLE public.checkout_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view checkout attempts"
  ON public.checkout_attempts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed historical successes so conversion does not jump above 100% when this
-- tracker first ships. Historical abandoned sessions were never recorded, so
-- the metric becomes fully representative from this migration forward.
INSERT INTO public.checkout_attempts (
  idempotency_key,
  stripe_session_id,
  user_id,
  guest_email,
  environment,
  status,
  subtotal_cents,
  total_cents,
  created_at,
  completed_at
)
SELECT
  'order:' || o.id::text,
  o.stripe_session_id,
  o.user_id,
  o.guest_email,
  CASE WHEN o.stripe_session_id LIKE 'cs_test_%' THEN 'sandbox' ELSE 'live' END,
  'completed',
  ROUND(COALESCE(o.subtotal, 0) * 100)::integer,
  ROUND(COALESCE(o.total, 0) * 100)::integer,
  o.created_at,
  o.created_at
FROM public.orders o
WHERE o.stripe_session_id IS NOT NULL
ON CONFLICT DO NOTHING;