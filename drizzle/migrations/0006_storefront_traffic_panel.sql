CREATE OR REPLACE FUNCTION public.storefront_traffic_metrics(
  _start_at TIMESTAMPTZ,
  _end_at TIMESTAMPTZ,
  _bucket_starts TIMESTAMPTZ[],
  _bucket_ends TIMESTAMPTZ[]
)
RETURNS TABLE(
  pageviews BIGINT,
  unique_sessions BIGINT,
  tracking_started_at TIMESTAMPTZ,
  session_buckets BIGINT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF coalesce(array_length(_bucket_starts, 1), 0)
     <> coalesce(array_length(_bucket_ends, 1), 0) THEN
    RAISE EXCEPTION 'Bucket boundaries must have equal lengths';
  END IF;

  RETURN QUERY
  WITH ordered AS (
    SELECT
      pv.created_at,
      pv.visitor_hash,
      lag(pv.created_at) OVER (
        PARTITION BY pv.visitor_hash
        ORDER BY pv.created_at
      ) AS previous_at
    FROM public.storefront_pageviews AS pv
    WHERE pv.created_at >= _start_at - interval '30 minutes'
      AND pv.created_at < _end_at
      AND pv.is_bot = false
      AND pv.visitor_hash IS NOT NULL
  ),
  session_starts AS (
    SELECT ordered.created_at
    FROM ordered
    WHERE ordered.created_at >= _start_at
      AND (
        ordered.previous_at IS NULL
        OR ordered.created_at - ordered.previous_at > interval '30 minutes'
      )
  ),
  buckets AS (
    SELECT
      bucket_index::INTEGER,
      bucket_start,
      bucket_end
    FROM unnest(_bucket_starts, _bucket_ends)
      WITH ORDINALITY AS bucket_rows(bucket_start, bucket_end, bucket_index)
  ),
  bucket_counts AS (
    SELECT
      buckets.bucket_index,
      count(session_starts.created_at)::BIGINT AS session_count
    FROM buckets
    LEFT JOIN session_starts
      ON session_starts.created_at >= buckets.bucket_start
     AND session_starts.created_at < buckets.bucket_end
    GROUP BY buckets.bucket_index
  )
  SELECT
    (
      SELECT count(*)::BIGINT
      FROM ordered
      WHERE ordered.created_at >= _start_at
    ),
    (SELECT count(*)::BIGINT FROM session_starts),
    (
      SELECT min(pv.created_at)
      FROM public.storefront_pageviews AS pv
    ),
    coalesce(
      (
        SELECT array_agg(bucket_counts.session_count ORDER BY bucket_counts.bucket_index)
        FROM bucket_counts
      ),
      ARRAY[]::BIGINT[]
    );
END;
$$;

REVOKE ALL ON FUNCTION public.storefront_traffic_metrics(
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TIMESTAMPTZ[],
  TIMESTAMPTZ[]
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storefront_traffic_metrics(
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TIMESTAMPTZ[],
  TIMESTAMPTZ[]
) TO authenticated;