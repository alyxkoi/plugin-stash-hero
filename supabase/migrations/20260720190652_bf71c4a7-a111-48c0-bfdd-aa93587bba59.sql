
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS utm_campaign text;
CREATE INDEX IF NOT EXISTS orders_utm_pair_idx ON public.orders (utm_source, utm_campaign);

CREATE TABLE IF NOT EXISTS public.campaign_link_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_link_groups TO authenticated;
GRANT ALL ON public.campaign_link_groups TO service_role;
ALTER TABLE public.campaign_link_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage campaign groups" ON public.campaign_link_groups;
CREATE POLICY "Admins manage campaign groups"
  ON public.campaign_link_groups FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS trg_campaign_link_groups_updated ON public.campaign_link_groups;
CREATE TRIGGER trg_campaign_link_groups_updated
  BEFORE UPDATE ON public.campaign_link_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.campaign_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.campaign_link_groups(id) ON DELETE SET NULL,
  label text NOT NULL,
  code text NOT NULL UNIQUE,
  utm_source text NOT NULL,
  utm_campaign text,
  destination_path text NOT NULL DEFAULT '/',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS campaign_links_group_idx ON public.campaign_links(group_id);
CREATE INDEX IF NOT EXISTS campaign_links_utm_pair_idx ON public.campaign_links(utm_source, utm_campaign);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_links TO authenticated;
GRANT ALL ON public.campaign_links TO service_role;
GRANT SELECT ON public.campaign_links TO anon;
ALTER TABLE public.campaign_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage campaign links" ON public.campaign_links;
CREATE POLICY "Admins manage campaign links"
  ON public.campaign_links FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Public can read campaign links for redirect" ON public.campaign_links;
CREATE POLICY "Public can read campaign links for redirect"
  ON public.campaign_links FOR SELECT
  TO anon, authenticated
  USING (true);
DROP TRIGGER IF EXISTS trg_campaign_links_updated ON public.campaign_links;
CREATE TRIGGER trg_campaign_links_updated
  BEFORE UPDATE ON public.campaign_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.campaign_link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.campaign_links(id) ON DELETE CASCADE,
  clicked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS campaign_link_clicks_link_idx ON public.campaign_link_clicks(link_id);
GRANT SELECT, INSERT ON public.campaign_link_clicks TO authenticated;
GRANT ALL ON public.campaign_link_clicks TO service_role;
ALTER TABLE public.campaign_link_clicks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read campaign clicks" ON public.campaign_link_clicks;
CREATE POLICY "Admins read campaign clicks"
  ON public.campaign_link_clicks FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
