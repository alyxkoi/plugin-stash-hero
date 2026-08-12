REVOKE EXECUTE ON FUNCTION public.admin_campaign_link_stats() FROM anon;

DROP POLICY IF EXISTS "Anyone reads sale event products" ON public.sale_event_products;

CREATE POLICY "Anyone reads products of visible sale events"
ON public.sale_event_products
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sale_events se
    WHERE se.id = sale_event_products.sale_event_id
      AND se.status = ANY (ARRAY['active'::sale_event_status, 'scheduled'::sale_event_status, 'ended'::sale_event_status])
  )
);