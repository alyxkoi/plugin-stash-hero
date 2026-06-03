
-- 1. product_files: admin-only download links
CREATE TABLE public.product_files (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  zip_url text,
  zip_file_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.product_files TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_files TO authenticated;

ALTER TABLE public.product_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage product files"
  ON public.product_files
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_product_files_updated_at
  BEFORE UPDATE ON public.product_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing data
INSERT INTO public.product_files (product_id, zip_url, zip_file_name)
SELECT id, zip_url, zip_file_name FROM public.products
WHERE zip_url IS NOT NULL OR zip_file_name IS NOT NULL;

ALTER TABLE public.products DROP COLUMN zip_url;
ALTER TABLE public.products DROP COLUMN zip_file_name;

-- 2. sale_event_stats: admin-only revenue figures
CREATE TABLE public.sale_event_stats (
  sale_event_id uuid PRIMARY KEY REFERENCES public.sale_events(id) ON DELETE CASCADE,
  revenue numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.sale_event_stats TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_event_stats TO authenticated;

ALTER TABLE public.sale_event_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage sale event stats"
  ON public.sale_event_stats
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_sale_event_stats_updated_at
  BEFORE UPDATE ON public.sale_event_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing data
INSERT INTO public.sale_event_stats (sale_event_id, revenue)
SELECT id, revenue FROM public.sale_events;

ALTER TABLE public.sale_events DROP COLUMN revenue;
