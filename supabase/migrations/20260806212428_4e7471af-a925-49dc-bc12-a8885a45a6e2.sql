-- Enums
DO $$ BEGIN
  CREATE TYPE public.email_sequence_type AS ENUM ('abandoned_cart', 'saved_items');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.email_send_status AS ENUM ('sent', 'failed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. Automation log
CREATE TABLE public.email_automation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_email TEXT NOT NULL,
  sequence_type public.email_sequence_type NOT NULL,
  step INTEGER NOT NULL CHECK (step BETWEEN 1 AND 3),
  trigger_ref TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  resend_message_id TEXT,
  status public.email_send_status NOT NULL,
  skip_reason TEXT,
  error TEXT,
  attempts INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT email_automation_log_unique UNIQUE (customer_email, sequence_type, step, trigger_ref)
);

CREATE INDEX idx_eal_email_sent ON public.email_automation_log (customer_email, sent_at DESC);
CREATE INDEX idx_eal_seq_step_sent ON public.email_automation_log (sequence_type, step, sent_at DESC);

GRANT SELECT ON public.email_automation_log TO authenticated;
GRANT ALL ON public.email_automation_log TO service_role;
ALTER TABLE public.email_automation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view automation log"
  ON public.email_automation_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_eal_updated BEFORE UPDATE ON public.email_automation_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Behavioral email preferences (separate from Mailchimp broadcast opt-in)
CREATE TABLE public.email_preferences (
  customer_email TEXT NOT NULL PRIMARY KEY,
  behavioral_emails_enabled BOOLEAN NOT NULL DEFAULT true,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.email_preferences TO authenticated;
GRANT ALL ON public.email_preferences TO service_role;
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view email preferences"
  ON public.email_preferences FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_email_prefs_updated BEFORE UPDATE ON public.email_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Master toggles per sequence
CREATE TABLE public.email_sequence_settings (
  sequence_type public.email_sequence_type NOT NULL PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.email_sequence_settings TO authenticated;
GRANT ALL ON public.email_sequence_settings TO service_role;
ALTER TABLE public.email_sequence_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view sequence settings"
  ON public.email_sequence_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update sequence settings"
  ON public.email_sequence_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_email_seq_settings_updated BEFORE UPDATE ON public.email_sequence_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.email_sequence_settings (sequence_type, enabled)
VALUES ('abandoned_cart', true), ('saved_items', true)
ON CONFLICT (sequence_type) DO NOTHING;

-- 4. saved_items needs an updated_at for reliable time math
ALTER TABLE public.saved_items
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TRIGGER trg_saved_items_updated BEFORE UPDATE ON public.saved_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
