
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS platforms text[] NOT NULL DEFAULT '{}'::text[];

CREATE OR REPLACE FUNCTION public.sync_product_platforms()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  arr text[] := ARRAY[]::text[];
BEGIN
  IF COALESCE(NEW.supports_mac, false) THEN
    arr := array_append(arr, 'mac');
  END IF;
  IF COALESCE(NEW.supports_windows, false) THEN
    arr := array_append(arr, 'windows');
  END IF;
  NEW.platforms := arr;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_platforms ON public.products;
CREATE TRIGGER trg_sync_product_platforms
BEFORE INSERT OR UPDATE OF supports_mac, supports_windows ON public.products
FOR EACH ROW EXECUTE FUNCTION public.sync_product_platforms();

-- Backfill
UPDATE public.products
SET platforms = (
  CASE WHEN COALESCE(supports_mac, false) THEN ARRAY['mac'] ELSE ARRAY[]::text[] END
  ||
  CASE WHEN COALESCE(supports_windows, false) THEN ARRAY['windows'] ELSE ARRAY[]::text[] END
);
