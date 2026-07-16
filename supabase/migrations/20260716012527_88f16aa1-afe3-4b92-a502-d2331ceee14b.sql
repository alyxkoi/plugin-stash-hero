
-- 1) Lock down SECURITY DEFINER functions from anonymous callers
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.next_order_number() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_order_number() TO service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_bestseller_product_ids(integer) TO anon, authenticated, service_role;

-- 2) Storage policies for imagesvideos bucket (RLS is already enabled on storage.objects by Supabase)
DROP POLICY IF EXISTS "imagesvideos public read" ON storage.objects;
CREATE POLICY "imagesvideos public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'imagesvideos');

DROP POLICY IF EXISTS "imagesvideos admin insert" ON storage.objects;
CREATE POLICY "imagesvideos admin insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'imagesvideos' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "imagesvideos admin update" ON storage.objects;
CREATE POLICY "imagesvideos admin update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'imagesvideos' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'imagesvideos' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "imagesvideos admin delete" ON storage.objects;
CREATE POLICY "imagesvideos admin delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'imagesvideos' AND public.has_role(auth.uid(), 'admin'));
