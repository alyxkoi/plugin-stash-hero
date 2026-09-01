CREATE TABLE IF NOT EXISTS public.email_automation_config (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  cron_secret TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- service-role only: never exposed to anon/authenticated clients
GRANT ALL ON public.email_automation_config TO service_role;

ALTER TABLE public.email_automation_config ENABLE ROW LEVEL SECURITY;

INSERT INTO public.email_automation_config (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;