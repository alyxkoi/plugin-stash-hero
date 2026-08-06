CREATE INDEX IF NOT EXISTS idx_eal_sent_at ON public.email_automation_log (sent_at) WHERE status = 'sent';
CREATE INDEX IF NOT EXISTS idx_eal_email_sent_at ON public.email_automation_log (customer_email, sent_at);
CREATE INDEX IF NOT EXISTS idx_eal_created_at ON public.email_automation_log (created_at DESC);

CREATE OR REPLACE FUNCTION public.admin_behavioral_email_stats(_from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  WITH sent_all AS (
    -- every real (non dry-run) behavioral send that could be the last touch
    SELECT l.customer_email, l.sequence_type, l.step, l.sent_at
    FROM public.email_automation_log l
    WHERE l.status = 'sent'
      AND COALESCE(l.dry_run, false) = false
      AND l.sent_at IS NOT NULL
      AND l.sent_at >= _from - interval '24 hours'
      AND l.sent_at < _to
  ),
  sent_in_range AS (
    SELECT * FROM sent_all WHERE sent_at >= _from
  ),
  sales AS (
    -- paid, non-free orders that could be recovered by a send in this range
    SELECT i.order_id, i.normalized_email, i.created_at, r.net_cents
    FROM public.order_customer_identity i
    JOIN public.order_revenue r ON r.id = i.order_id
    WHERE r.counts_as_sale
      AND r.total_cents > 0
      AND i.created_at >= _from
      AND i.created_at < _to + interval '24 hours'
  ),
  attributed AS (
    -- last touch only: one row per order, the most recent preceding send
    SELECT DISTINCT ON (s.order_id)
      s.order_id, e.sequence_type, e.step, e.sent_at, GREATEST(s.net_cents, 0) AS net_cents
    FROM sales s
    JOIN sent_all e
      ON e.customer_email = s.normalized_email
     AND s.created_at >= e.sent_at
     AND s.created_at <= e.sent_at + interval '24 hours'
    ORDER BY s.order_id, e.sent_at DESC
  ),
  credited AS (
    -- only credit steps whose send actually falls in the selected range
    SELECT a.* FROM attributed a WHERE a.sent_at >= _from
  ),
  steps AS (
    SELECT sequence_type, step, count(*)::int AS sent, 0::int AS sales, 0::bigint AS net_cents
    FROM sent_in_range GROUP BY sequence_type, step
    UNION ALL
    SELECT sequence_type, step, 0, count(*)::int, COALESCE(sum(net_cents), 0)::bigint
    FROM credited GROUP BY sequence_type, step
  ),
  rolled AS (
    SELECT sequence_type, step,
           sum(sent)::int AS sent,
           sum(sales)::int AS sales,
           sum(net_cents)::bigint AS net_cents
    FROM steps GROUP BY sequence_type, step
  ),
  outcomes AS (
    SELECT l.sequence_type,
           count(*) FILTER (WHERE l.status = 'skipped' AND COALESCE(l.dry_run,false) = false)::int AS skipped,
           count(*) FILTER (WHERE l.status = 'failed'  AND COALESCE(l.dry_run,false) = false)::int AS failed,
           count(*) FILTER (WHERE COALESCE(l.dry_run,false))::int AS dry_run
    FROM public.email_automation_log l
    WHERE l.created_at >= _from AND l.created_at < _to
    GROUP BY l.sequence_type
  ),
  skips AS (
    SELECT l.customer_email, l.sequence_type, l.step, l.skip_reason, l.created_at, COALESCE(l.dry_run,false) AS dry_run
    FROM public.email_automation_log l
    WHERE l.status = 'skipped' AND l.created_at >= _from AND l.created_at < _to
    ORDER BY l.created_at DESC
    LIMIT 50
  )
  SELECT jsonb_build_object(
    'steps', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'sequence', r.sequence_type, 'step', r.step,
        'sent', r.sent, 'sales', r.sales, 'netCents', r.net_cents)) FROM rolled r), '[]'::jsonb),
    'outcomes', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'sequence', o.sequence_type, 'skipped', o.skipped, 'failed', o.failed, 'dryRun', o.dry_run)) FROM outcomes o), '[]'::jsonb),
    'recentSkips', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'email', k.customer_email, 'sequence', k.sequence_type, 'step', k.step,
        'reason', COALESCE(k.skip_reason, 'unknown'), 'at', k.created_at, 'dryRun', k.dry_run)) FROM skips k), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_behavioral_email_stats(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_behavioral_email_stats(timestamptz, timestamptz) TO authenticated;