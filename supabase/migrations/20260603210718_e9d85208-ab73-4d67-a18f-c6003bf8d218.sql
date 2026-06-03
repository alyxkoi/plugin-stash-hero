
-- 1. Products: add cover_url (public cover image URL hosted on R2)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cover_url text;

-- 2. Extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3. Vault entry for cron auth (placeholder; replace after deploy)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'r2_cleanup_service_key') THEN
    PERFORM vault.create_secret(
      'REPLACE_WITH_SERVICE_ROLE_KEY',
      'r2_cleanup_service_key',
      'Service role key used by daily R2 staging cleanup cron'
    );
  END IF;
END $$;

-- 4. Daily cleanup of /staging older than 24h
SELECT cron.unschedule('r2-staging-cleanup-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'r2-staging-cleanup-daily');

SELECT cron.schedule(
  'r2-staging-cleanup-daily',
  '0 3 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://ovhpoysgvuupqydprsjx.supabase.co/functions/v1/r2-cleanup-staging',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'r2_cleanup_service_key' LIMIT 1),
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'r2_cleanup_service_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $cron$
);
