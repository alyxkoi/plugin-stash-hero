
CREATE POLICY "Buyers view purchased product files"
ON public.product_files
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.product_id = product_files.product_id
      AND o.user_id = auth.uid()
      AND o.status = 'completed'
  )
);

DROP POLICY IF EXISTS "Users insert own downloads" ON public.library_downloads;
CREATE POLICY "Users insert own downloads"
ON public.library_downloads
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.product_id = library_downloads.product_id
      AND o.user_id = auth.uid()
      AND o.status = 'completed'
  )
);

-- Move pg_net out of public schema (it doesn't support SET SCHEMA, so drop+recreate)
SELECT cron.unschedule('r2-staging-cleanup-daily');
DROP EXTENSION IF EXISTS pg_net;
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
CREATE EXTENSION pg_net WITH SCHEMA extensions;

-- Reschedule cleanup job using new schema-qualified function
SELECT cron.schedule(
  'r2-staging-cleanup-daily',
  '0 3 * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://ovhpoysgvuupqydprsjx.supabase.co/functions/v1/r2-cleanup-staging',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92aHBveXNndnV1cHF5ZHByc2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyODQ2NjcsImV4cCI6MjA5NDg2MDY2N30.ZHlnHNECyralutePacTxCzM-vNywKBYK0KAeE30MKT4',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92aHBveXNndnV1cHF5ZHByc2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyODQ2NjcsImV4cCI6MjA5NDg2MDY2N30.ZHlnHNECyralutePacTxCzM-vNywKBYK0KAeE30MKT4'
    ),
    body := '{}'::jsonb
  );
  $$
);
