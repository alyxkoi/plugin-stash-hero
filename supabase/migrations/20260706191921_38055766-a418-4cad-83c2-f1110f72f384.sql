ALTER POLICY "Admins manage products" ON public.products TO authenticated;
ALTER POLICY "Admins manage sale events" ON public.sale_events TO authenticated;
ALTER POLICY "Admins manage sale event products" ON public.sale_event_products TO authenticated;