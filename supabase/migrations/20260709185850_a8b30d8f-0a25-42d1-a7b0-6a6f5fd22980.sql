ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS supports_windows boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS supports_mac boolean NOT NULL DEFAULT false;