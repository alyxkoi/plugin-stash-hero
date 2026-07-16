-- 1) Prevent listing the imagesvideos bucket via the SDK/API.
-- Public object URLs (/storage/v1/object/public/...) bypass RLS and keep working.
DROP POLICY IF EXISTS "imagesvideos public read" ON storage.objects;

-- 2) Remove anon EXECUTE on SECURITY DEFINER helpers.
REVOKE EXECUTE ON FUNCTION public.get_bestseller_product_ids(integer) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_bestseller_product_ids(integer) TO authenticated, service_role;