
-- Add filtering columns to click log
ALTER TABLE public.campaign_link_clicks
  ADD COLUMN IF NOT EXISTS ip_ua_hash text,
  ADD COLUMN IF NOT EXISTS is_bot boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS counted boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS campaign_link_clicks_dedup_idx
  ON public.campaign_link_clicks (link_id, ip_ua_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS campaign_link_clicks_counted_idx
  ON public.campaign_link_clicks (link_id) WHERE counted = true;

-- Admin-managed ignore list (stores hashed IPs, not raw PII)
CREATE TABLE IF NOT EXISTS public.campaign_click_ignored_ips (
  ip_hash text PRIMARY KEY,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_click_ignored_ips TO authenticated;
GRANT ALL ON public.campaign_click_ignored_ips TO service_role;

ALTER TABLE public.campaign_click_ignored_ips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage ignored ips" ON public.campaign_click_ignored_ips;
CREATE POLICY "admins manage ignored ips"
  ON public.campaign_click_ignored_ips
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin-only helpers to reset click counts (bypasses RLS via SECURITY DEFINER
-- with role check inside).
CREATE OR REPLACE FUNCTION public.reset_campaign_link_clicks(_link_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  DELETE FROM public.campaign_link_clicks WHERE link_id = _link_id;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_campaign_group_clicks(_group_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  DELETE FROM public.campaign_link_clicks
   WHERE link_id IN (SELECT id FROM public.campaign_links WHERE group_id = _group_id);
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

-- Lock down: only authenticated admins can call these
REVOKE ALL ON FUNCTION public.reset_campaign_link_clicks(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reset_campaign_group_clicks(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_campaign_link_clicks(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_campaign_group_clicks(uuid) TO authenticated;
