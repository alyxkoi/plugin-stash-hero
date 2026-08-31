-- Behavioral email sequences were paused when first introduced and were never
-- re-enabled. The Cloudflare scheduled handler now invokes them every 15 minutes.
INSERT INTO public.email_sequence_settings (sequence_type, enabled)
VALUES
  ('abandoned_cart', true),
  ('saved_items', true)
ON CONFLICT (sequence_type) DO UPDATE
SET enabled = EXCLUDED.enabled,
    updated_at = now();
