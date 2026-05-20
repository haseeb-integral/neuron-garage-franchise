
-- RPC: filtered counts + source breakdown + distinct cities for teacher_prospects.
-- All filters optional. Used by Teacher Search page for server-truth stats.
CREATE OR REPLACE FUNCTION public.teacher_prospects_stats(
  p_search text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_source_filter text DEFAULT 'all'  -- 'all' | 'smartlead' | 'linkedin' | 'needs_email'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_email_ready int;
  v_needs int;
  v_cities int;
  v_sources jsonb;
BEGIN
  WITH base AS (
    SELECT *
    FROM public.teacher_prospects t
    WHERE
      (p_city IS NULL OR p_city = 'All' OR t.city = p_city)
      AND (
        p_search IS NULL OR p_search = '' OR
        t.name ILIKE '%'||p_search||'%' OR
        t.school ILIKE '%'||p_search||'%' OR
        t.city ILIKE '%'||p_search||'%' OR
        t.email ILIKE '%'||p_search||'%'
      )
      AND (
        p_source_filter = 'all'
        OR (p_source_filter = 'smartlead' AND lower(coalesce(t.enrichment_source,'')) LIKE 'smartlead%')
        OR (p_source_filter = 'linkedin' AND lower(coalesce(t.enrichment_source,'')) LIKE 'linkedin%')
        OR (p_source_filter = 'needs_email' AND (t.needs_email_enrichment = true OR coalesce(t.email,'') = ''))
      )
  )
  SELECT
    COUNT(*),
    COUNT(*) FILTER (
      WHERE email IS NOT NULL AND email <> ''
        AND (verification_status IS NULL OR lower(verification_status) IN ('valid','verified'))
    ),
    COUNT(*) FILTER (WHERE needs_email_enrichment = true),
    COUNT(DISTINCT city)
  INTO v_total, v_email_ready, v_needs, v_cities
  FROM base;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('source', src, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
  INTO v_sources
  FROM (
    SELECT
      CASE
        WHEN lower(coalesce(enrichment_source,'')) LIKE 'smartlead%' THEN 'smartlead'
        WHEN lower(coalesce(enrichment_source,'')) LIKE 'linkedin%' THEN 'linkedin'
        WHEN lower(coalesce(enrichment_source,'')) LIKE 'apollo%' THEN 'apollo'
        WHEN coalesce(enrichment_source,'') = '' THEN 'other'
        ELSE 'other'
      END AS src,
      COUNT(*)::int AS cnt
    FROM public.teacher_prospects t
    WHERE
      (p_city IS NULL OR p_city = 'All' OR t.city = p_city)
      AND (
        p_search IS NULL OR p_search = '' OR
        t.name ILIKE '%'||p_search||'%' OR
        t.school ILIKE '%'||p_search||'%' OR
        t.city ILIKE '%'||p_search||'%' OR
        t.email ILIKE '%'||p_search||'%'
      )
      AND (
        p_source_filter = 'all'
        OR (p_source_filter = 'smartlead' AND lower(coalesce(t.enrichment_source,'')) LIKE 'smartlead%')
        OR (p_source_filter = 'linkedin' AND lower(coalesce(t.enrichment_source,'')) LIKE 'linkedin%')
        OR (p_source_filter = 'needs_email' AND (t.needs_email_enrichment = true OR coalesce(t.email,'') = ''))
      )
    GROUP BY 1
  ) s;

  RETURN jsonb_build_object(
    'total', v_total,
    'email_ready', v_email_ready,
    'needs_enrichment', v_needs,
    'cities', v_cities,
    'sources', v_sources
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.teacher_prospects_stats(text, text, text) TO authenticated, anon;

-- RPC: distinct city list (for the City filter dropdown) — bypass 1k row cap.
CREATE OR REPLACE FUNCTION public.teacher_prospects_cities()
RETURNS TABLE(city text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT t.city
  FROM public.teacher_prospects t
  WHERE t.city IS NOT NULL AND t.city <> ''
  ORDER BY t.city;
$$;

GRANT EXECUTE ON FUNCTION public.teacher_prospects_cities() TO authenticated, anon;
