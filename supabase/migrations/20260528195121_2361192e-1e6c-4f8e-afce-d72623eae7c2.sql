
-- Speed up teacher_prospects ILIKE searches and add state-aware search.
CREATE INDEX IF NOT EXISTS teacher_prospects_name_trgm   ON public.teacher_prospects USING gin (name   gin_trgm_ops);
CREATE INDEX IF NOT EXISTS teacher_prospects_school_trgm ON public.teacher_prospects USING gin (school gin_trgm_ops);
CREATE INDEX IF NOT EXISTS teacher_prospects_city_trgm   ON public.teacher_prospects USING gin (city   gin_trgm_ops);
CREATE INDEX IF NOT EXISTS teacher_prospects_email_trgm  ON public.teacher_prospects USING gin (email  gin_trgm_ops);
CREATE INDEX IF NOT EXISTS teacher_prospects_state_trgm  ON public.teacher_prospects USING gin (state  gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.teacher_prospects_stats(
  p_search text DEFAULT NULL::text,
  p_city text DEFAULT NULL::text,
  p_source_filter text DEFAULT 'all'::text,
  p_cities text[] DEFAULT NULL::text[]
)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total int;
  v_email_ready int;
  v_needs int;
  v_cities int;
  v_sources jsonb;
  v_use_array boolean := (p_cities IS NOT NULL AND cardinality(p_cities) > 0);
BEGIN
  WITH base AS (
    SELECT *
    FROM public.teacher_prospects t
    WHERE
      (
        CASE
          WHEN v_use_array THEN t.city = ANY(p_cities)
          WHEN p_city IS NULL OR p_city = 'All' THEN TRUE
          ELSE t.city = p_city
        END
      )
      AND (
        p_search IS NULL OR p_search = '' OR
        t.name   ILIKE '%'||p_search||'%' OR
        t.school ILIKE '%'||p_search||'%' OR
        t.city   ILIKE '%'||p_search||'%' OR
        t.state  ILIKE '%'||p_search||'%' OR
        t.email  ILIKE '%'||p_search||'%'
      )
      AND (
        p_source_filter = 'all'
        OR (p_source_filter = 'smartlead'   AND lower(coalesce(t.enrichment_source,'')) LIKE 'smartlead%')
        OR (p_source_filter = 'linkedin'    AND lower(coalesce(t.enrichment_source,'')) LIKE 'linkedin%')
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
        WHEN lower(coalesce(enrichment_source,'')) LIKE 'linkedin%'  THEN 'linkedin'
        WHEN lower(coalesce(enrichment_source,'')) LIKE 'apollo%'    THEN 'apollo'
        WHEN coalesce(enrichment_source,'') = '' THEN 'other'
        ELSE 'other'
      END AS src,
      COUNT(*)::int AS cnt
    FROM public.teacher_prospects t
    WHERE
      (
        CASE
          WHEN v_use_array THEN t.city = ANY(p_cities)
          WHEN p_city IS NULL OR p_city = 'All' THEN TRUE
          ELSE t.city = p_city
        END
      )
      AND (
        p_search IS NULL OR p_search = '' OR
        t.name   ILIKE '%'||p_search||'%' OR
        t.school ILIKE '%'||p_search||'%' OR
        t.city   ILIKE '%'||p_search||'%' OR
        t.state  ILIKE '%'||p_search||'%' OR
        t.email  ILIKE '%'||p_search||'%'
      )
      AND (
        p_source_filter = 'all'
        OR (p_source_filter = 'smartlead'   AND lower(coalesce(t.enrichment_source,'')) LIKE 'smartlead%')
        OR (p_source_filter = 'linkedin'    AND lower(coalesce(t.enrichment_source,'')) LIKE 'linkedin%')
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
$function$;
