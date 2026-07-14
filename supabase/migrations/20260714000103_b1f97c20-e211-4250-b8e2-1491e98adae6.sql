ALTER TABLE public.discount_codes
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.discount_code_products (
  discount_code_id uuid NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  PRIMARY KEY (discount_code_id, product_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.discount_code_products TO authenticated;
GRANT ALL ON public.discount_code_products TO service_role;

ALTER TABLE public.discount_code_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage discount code products" ON public.discount_code_products;
CREATE POLICY "Admins manage discount code products"
  ON public.discount_code_products
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));