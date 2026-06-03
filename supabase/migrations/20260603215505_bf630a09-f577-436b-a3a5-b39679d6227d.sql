-- Reschedule R2 staging cleanup using the publishable (anon) key.
-- The edge function authorizes this key and uses its own SUPABASE_SERVICE_ROLE_KEY env var
-- for R2 admin operations. No vault secret needed.

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
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92aHBveXNndnV1cHF5ZHByc2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyODQ2NjcsImV4cCI6MjA5NDg2MDY2N30.ZHlnHNECyralutePacTxCzM-vNywKBYK0KAeE30MKT4',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92aHBveXNndnV1cHF5ZHByc2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyODQ2NjcsImV4cCI6MjA5NDg2MDY2N30.ZHlnHNECyralutePacTxCzM-vNywKBYK0KAeE30MKT4'
    ),
    body := '{}'::jsonb
  );
  $cron$
);

-- Remove the unused placeholder vault entry if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'r2_cleanup_service_key') THEN
    DELETE FROM vault.secrets WHERE name = 'r2_cleanup_service_key';
  END IF;
END $$;
