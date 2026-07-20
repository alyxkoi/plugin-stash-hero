
-- 1. Add file_updated_at column to product_files
ALTER TABLE public.product_files
  ADD COLUMN IF NOT EXISTS file_updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2. Trigger: bump file_updated_at only when zip_url actually changes
CREATE OR REPLACE FUNCTION public.bump_product_file_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.zip_url IS DISTINCT FROM OLD.zip_url THEN
    NEW.file_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_product_file_updated_at ON public.product_files;
CREATE TRIGGER trg_bump_product_file_updated_at
  BEFORE UPDATE ON public.product_files
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_product_file_updated_at();

-- 3. Acknowledgements table
CREATE TABLE IF NOT EXISTS public.product_file_acknowledgements (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_file_acknowledgements TO authenticated;
GRANT ALL ON public.product_file_acknowledgements TO service_role;

ALTER TABLE public.product_file_acknowledgements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own acknowledgements"
  ON public.product_file_acknowledgements
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Helper: fetch (product_id, file_updated_at, acknowledged_at) for the caller's owned products
CREATE OR REPLACE FUNCTION public.get_my_product_file_updates()
RETURNS TABLE (product_id UUID, file_updated_at TIMESTAMPTZ, acknowledged_at TIMESTAMPTZ)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    pf.product_id,
    pf.file_updated_at,
    a.acknowledged_at
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  JOIN public.product_files pf ON pf.product_id = oi.product_id
  LEFT JOIN public.product_file_acknowledgements a
    ON a.product_id = oi.product_id AND a.user_id = auth.uid()
  WHERE o.user_id = auth.uid()
    AND o.status = 'completed'
    AND oi.product_id IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.get_my_product_file_updates() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_product_file_updates() TO authenticated;

-- 5. Helper: acknowledge one or many products for the caller
CREATE OR REPLACE FUNCTION public.acknowledge_product_files(_product_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  INSERT INTO public.product_file_acknowledgements (user_id, product_id, acknowledged_at)
  SELECT uid, pid, now()
  FROM unnest(_product_ids) AS pid
  WHERE pid IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE o.user_id = uid AND oi.product_id = pid
    )
  ON CONFLICT (user_id, product_id)
  DO UPDATE SET acknowledged_at = EXCLUDED.acknowledged_at;
END;
$$;

REVOKE ALL ON FUNCTION public.acknowledge_product_files(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acknowledge_product_files(UUID[]) TO authenticated;

-- 6. Backfill: seed acknowledgements for every existing (user, owned product) pair,
--    so no retroactive badges appear at launch. Use now() as the seed timestamp.
INSERT INTO public.product_file_acknowledgements (user_id, product_id, acknowledged_at)
SELECT DISTINCT o.user_id, oi.product_id, now()
FROM public.order_items oi
JOIN public.orders o ON o.id = oi.order_id
WHERE o.user_id IS NOT NULL
  AND oi.product_id IS NOT NULL
ON CONFLICT (user_id, product_id) DO NOTHING;
