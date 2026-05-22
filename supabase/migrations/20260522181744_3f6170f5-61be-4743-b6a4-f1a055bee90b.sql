
-- 1) Hide revenue column from public/anon/authenticated on sale_events
REVOKE SELECT ON public.sale_events FROM anon, authenticated;
GRANT SELECT (id, name, slug, headline, subheadline, theme_color, scope, discount_pct, status, start_at, end_at, created_at, updated_at)
  ON public.sale_events TO anon, authenticated;

-- 2) Restrict SECURITY DEFINER trigger helpers from being directly executable
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
