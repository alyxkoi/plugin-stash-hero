GRANT SELECT ON public.campaign_link_clicks TO authenticated;
GRANT ALL ON public.campaign_link_clicks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_links TO authenticated;
GRANT ALL ON public.campaign_links TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_link_groups TO authenticated;
GRANT ALL ON public.campaign_link_groups TO service_role;