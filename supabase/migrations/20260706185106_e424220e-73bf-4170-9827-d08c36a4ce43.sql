-- Add 'categories' scope option and category-slug array column to sale_events.
ALTER TYPE public.sale_scope ADD VALUE IF NOT EXISTS 'categories';

ALTER TABLE public.sale_events
  ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT '{}'::text[];