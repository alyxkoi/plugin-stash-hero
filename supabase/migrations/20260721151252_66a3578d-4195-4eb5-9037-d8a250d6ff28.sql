
-- 1) Campaign links: drop the overly-broad public SELECT.
-- The /go/:code redirect handler uses the service-role admin client, so
-- anon/authenticated no longer need direct SELECT access on this table.
DROP POLICY IF EXISTS "Public can read campaign links for redirect" ON public.campaign_links;

-- 2) Storage: make the public-read intent explicit on the imagesvideos bucket.
DROP POLICY IF EXISTS "Public read imagesvideos" ON storage.objects;
CREATE POLICY "Public read imagesvideos"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'imagesvideos');
