
CREATE OR REPLACE FUNCTION public.get_bestseller_product_ids(_limit int DEFAULT 20)
RETURNS TABLE(product_id uuid, orders bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT oi.product_id, COUNT(*)::bigint AS orders
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.status = 'completed' AND oi.product_id IS NOT NULL
  GROUP BY oi.product_id
  ORDER BY orders DESC, oi.product_id
  LIMIT GREATEST(_limit, 1)
$$;

GRANT EXECUTE ON FUNCTION public.get_bestseller_product_ids(int) TO anon, authenticated;
