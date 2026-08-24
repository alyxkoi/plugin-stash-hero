-- Dry-run evaluations must never overwrite or suppress real deliveries.
-- The original uniqueness key omitted dry_run, so an admin dry run could turn
-- the production row into status='sent' even though no email was delivered.
ALTER TABLE public.email_automation_log
  DROP CONSTRAINT IF EXISTS email_automation_log_unique;

ALTER TABLE public.email_automation_log
  ADD CONSTRAINT email_automation_log_unique
  UNIQUE (customer_email, sequence_type, step, trigger_ref, dry_run);
