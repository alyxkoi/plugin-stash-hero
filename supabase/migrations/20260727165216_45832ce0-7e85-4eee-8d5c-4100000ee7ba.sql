-- Null out utm_source on legacy orders that have no click id (pw_cid)
-- AND whose utm_source does not correspond to any campaign_link. These
-- were most likely tagged from a referrer-based fallback or stale
-- persisted attribution and should read as "direct" going forward.
UPDATE public.orders o
SET utm_source = NULL,
    utm_campaign = NULL
WHERE o.pw_cid IS NULL
  AND o.utm_source IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.campaign_links cl
    WHERE lower(cl.utm_source) = lower(o.utm_source)
  );
