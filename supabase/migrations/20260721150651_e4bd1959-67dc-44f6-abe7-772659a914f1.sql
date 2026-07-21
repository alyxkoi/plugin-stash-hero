
ALTER TABLE public.campaign_link_groups
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_platform text,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.campaign_links
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS campaign_link_groups_sort_idx ON public.campaign_link_groups (sort_order, created_at);
CREATE INDEX IF NOT EXISTS campaign_links_sort_idx ON public.campaign_links (group_id, sort_order, created_at);
