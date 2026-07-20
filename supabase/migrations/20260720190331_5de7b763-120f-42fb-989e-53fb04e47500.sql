
-- Groups
CREATE TABLE public.campaign_link_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_link_groups TO authenticated;
GRANT ALL ON public.campaign_link_groups TO service_role;
ALTER TABLE public.campaign_link_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage campaign link groups" ON public.campaign_link_groups
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER campaign_link_groups_updated_at BEFORE UPDATE ON public.campaign_link_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Links
CREATE TABLE public.campaign_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.campaign_link_groups(id) ON DELETE SET NULL,
  code text UNIQUE NOT NULL,
  label text NOT NULL,
  utm_source text NOT NULL,
  utm_campaign text,
  destination_path text NOT NULL DEFAULT '/',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_links TO authenticated;
GRANT ALL ON public.campaign_links TO service_role;
ALTER TABLE public.campaign_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage campaign links" ON public.campaign_links
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER campaign_links_updated_at BEFORE UPDATE ON public.campaign_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_campaign_links_group_id ON public.campaign_links(group_id);
CREATE INDEX idx_campaign_links_utm ON public.campaign_links(utm_source, utm_campaign);

-- Clicks (append-only log)
CREATE TABLE public.campaign_link_clicks (
  id bigserial PRIMARY KEY,
  link_id uuid NOT NULL REFERENCES public.campaign_links(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.campaign_link_clicks TO authenticated;
GRANT ALL ON public.campaign_link_clicks TO service_role;
ALTER TABLE public.campaign_link_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view campaign link clicks" ON public.campaign_link_clicks
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_campaign_link_clicks_link_id ON public.campaign_link_clicks(link_id);

-- Order-side attribution: also remember utm_campaign so (source, campaign) pairs join back to a specific link.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS utm_campaign text;
CREATE INDEX IF NOT EXISTS idx_orders_utm_source_campaign ON public.orders(utm_source, utm_campaign);
