ALTER TABLE public.email_automation_log
  ADD COLUMN IF NOT EXISTS dry_run boolean NOT NULL DEFAULT false;

UPDATE public.email_sequence_settings SET enabled = false, updated_at = now();