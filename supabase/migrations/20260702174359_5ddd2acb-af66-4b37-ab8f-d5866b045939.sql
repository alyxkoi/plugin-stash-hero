CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.next_order_number()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'PW-' || LPAD(nextval('public.order_number_seq')::text, 4, '0');
$$;

GRANT EXECUTE ON FUNCTION public.next_order_number() TO service_role;