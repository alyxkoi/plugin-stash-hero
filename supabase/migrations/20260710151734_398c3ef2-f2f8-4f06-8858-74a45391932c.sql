GRANT SELECT, INSERT, UPDATE, DELETE ON public.discount_codes TO authenticated;
GRANT SELECT ON public.discount_codes TO anon;
GRANT ALL ON public.discount_codes TO service_role;