CREATE OR REPLACE FUNCTION public.admin_campaign_link_stats()
RETURNS TABLE(link_id uuid, clicks bigint, purchases bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  WITH counted AS (
    SELECT c.link_id AS lid, c.click_id
    FROM public.campaign_link_clicks c
    WHERE c.counted
  ),
  clk AS (
    SELECT ct.lid, count(*)::bigint AS n FROM counted ct GROUP BY ct.lid
  ),
  buys AS (
    SELECT ct.lid, count(DISTINCT o.id)::bigint AS n
    FROM counted ct
    JOIN public.orders o ON o.pw_cid = ct.click_id
    WHERE ct.click_id IS NOT NULL
      AND o.status IN ('completed', 'partial')
      AND o.total > 0
    GROUP BY ct.lid
  )
  SELECT l.id, COALESCE(k.n, 0), COALESCE(b.n, 0)
  FROM public.campaign_links l
  LEFT JOIN clk k ON k.lid = l.id
  LEFT JOIN buys b ON b.lid = l.id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_campaign_link_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_campaign_link_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_campaign_link_stats() TO service_role;