-- abandoned_carts: owner can read own rows (admin ALL policy already exists)
GRANT SELECT ON public.abandoned_carts TO authenticated;
CREATE POLICY "Users can view their own abandoned carts"
ON public.abandoned_carts FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- order_claims: owner can read own claim rows
GRANT SELECT ON public.order_claims TO authenticated;
CREATE POLICY "Users can view their own order claims"
ON public.order_claims FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- store_credit_reservations: had RLS with zero policies; add owner + admin read
GRANT SELECT ON public.store_credit_reservations TO authenticated;
GRANT ALL ON public.store_credit_reservations TO service_role;
CREATE POLICY "Users can view their own credit reservations"
ON public.store_credit_reservations FOR SELECT TO authenticated
USING (customer_id = auth.uid());
CREATE POLICY "Admins can view all credit reservations"
ON public.store_credit_reservations FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));