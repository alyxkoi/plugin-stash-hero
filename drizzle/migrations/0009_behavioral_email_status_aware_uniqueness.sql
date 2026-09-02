-- Deferrals become a first-class, non-blocking status.
ALTER TYPE public.email_send_status ADD VALUE IF NOT EXISTS 'deferred';

-- Only DELIVERED rows may block a retry. Deferred/failed rows must not.
DROP INDEX IF EXISTS public.email_automation_log_unique_v2;

CREATE UNIQUE INDEX IF NOT EXISTS email_automation_log_sent_unique
  ON public.email_automation_log (customer_email, sequence_type, step, trigger_ref, dry_run)
  WHERE status = 'sent';

-- Lookup path for eligibility / deferral bookkeeping.
CREATE INDEX IF NOT EXISTS idx_eal_lookup
  ON public.email_automation_log (customer_email, sequence_type, step, trigger_ref, dry_run);
