
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pw_cid text;
CREATE INDEX IF NOT EXISTS orders_pw_cid_idx ON public.orders(pw_cid) WHERE pw_cid IS NOT NULL;

ALTER TABLE public.campaign_link_clicks ADD COLUMN IF NOT EXISTS click_id text;
CREATE UNIQUE INDEX IF NOT EXISTS campaign_link_clicks_click_id_uniq ON public.campaign_link_clicks(click_id) WHERE click_id IS NOT NULL;

-- One-time backfill: normalize existing utm_source values in place.
UPDATE public.orders
SET utm_source = CASE
  WHEN utm_source IS NULL THEN NULL
  WHEN lower(trim(utm_source)) = '' THEN NULL
  WHEN lower(trim(utm_source)) IN ('fb','facebook','facebook.com','ig','instagram','instagram.com','meta','meta ads','meta-ads','metaads') THEN 'meta'
  ELSE lower(trim(utm_source))
END;
