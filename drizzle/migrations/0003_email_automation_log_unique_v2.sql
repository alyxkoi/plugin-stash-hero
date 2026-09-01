CREATE UNIQUE INDEX IF NOT EXISTS email_automation_log_unique_v2
  ON public.email_automation_log (customer_email, sequence_type, step, trigger_ref, dry_run);