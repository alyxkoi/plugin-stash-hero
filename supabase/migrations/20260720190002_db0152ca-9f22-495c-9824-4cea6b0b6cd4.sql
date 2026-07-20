
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS sale_id uuid REFERENCES public.sale_events(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_sale_id ON public.orders(sale_id);

-- Idempotent backfill: only touch rows that don't already have a sale linked.
UPDATE public.orders o
SET sale_id = s.id
FROM public.sale_events s
WHERE o.sale_id IS NULL
  AND s.status <> 'draft'
  AND o.created_at >= s.start_at
  AND o.created_at <= s.end_at;
