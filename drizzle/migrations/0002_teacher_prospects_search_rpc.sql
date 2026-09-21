-- Server-side teacher search. The staff RLS rule stops Postgres from using the
-- trigram indexes for logged-in users, so a plain filtered select scans all
-- 311k rows and hits the 8s statement timeout. This security-definer function
-- runs the same search with the indexes available, after checking staff access
-- itself, and returns both the page of rows and a true total count.
CREATE OR REPLACE FUNCTION public.teacher_prospects_search(
  p_search text DEFAULT NULL,
  p_cities text[] DEFAULT NULL,
  p_source_filter text DEFAULT 'all',
  p_signal_filter text DEFAULT 'all',
  p_sort text DEFAULT 'recent',
  p_exclude_ids uuid[] DEFAULT NULL,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pattern text := CASE WHEN nullif(btrim(coalesce(p_search, '')), '') IS NULL
                         THEN NULL
                         ELSE '%' || replace(replace(btrim(p_search), '%', ''), '_', '') || '%' END;
  v_hooks text[] := ARRAY['teacher_project_lead','recognition_award','teacher_grant_recipient',
                          'teacher_award_finalist','teacher_grant_author','teacher_of_year',
                          'teacher_program_lead','teacher_team_lead'];
  v_total bigint;
  v_rows jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _tp_ids (id uuid) ON COMMIT DROP;

  WITH filtered AS (
    SELECT t.*
    FROM public.teacher_prospects t
    WHERE (p_cities IS NULL OR array_length(p_cities, 1) IS NULL OR t.city = ANY(p_cities))
      AND (v_pattern IS NULL OR t.name ILIKE v_pattern OR t.school ILIKE v_pattern
           OR t.city ILIKE v_pattern OR t.state ILIKE v_pattern OR t.email ILIKE v_pattern)
      AND (p_source_filter IS NULL OR p_source_filter = 'all'
           OR (p_source_filter = 'smartlead' AND t.enrichment_source = 'smartlead_csv')
           OR (p_source_filter = 'linkedin' AND t.enrichment_source = 'linkedin_danish')
           OR (p_source_filter = 'needs_email' AND t.needs_email_enrichment IS TRUE))
      AND (p_signal_filter IS NULL OR p_signal_filter = 'all'
           OR (p_signal_filter = 'tier1' AND (coalesce(t.secondary_signal_count,0) > 0
                                              OR coalesce(t.verified_creator_signal_count,0) > 0))
           OR (p_signal_filter = 'tier2' AND t.verified_enrichment_signal_types && v_hooks)
           OR (p_signal_filter = 'medium_plus' AND t.secondary_signal_confidence = 'MEDIUM')
           OR (p_signal_filter = 'creator' AND coalesce(t.verified_creator_signal_count,0) > 0)
           OR (p_signal_filter = 'secondary' AND coalesce(t.secondary_signal_count,0) > 0)
           OR (p_signal_filter = 'has_phone' AND t.phone IS NOT NULL AND t.phone <> ''))
      AND (p_exclude_ids IS NULL OR array_length(p_exclude_ids, 1) IS NULL OR NOT (t.id = ANY(p_exclude_ids)))
  ),
  counted AS (SELECT count(*) AS n FROM filtered),
  page AS (
    SELECT to_jsonb(f) AS row
    FROM filtered f
    ORDER BY
      CASE WHEN p_sort = 'best'
           THEN CASE WHEN coalesce(f.secondary_signal_count,0) > 0
                       OR coalesce(f.verified_creator_signal_count,0) > 0 THEN 0
                     WHEN f.verified_enrichment_signal_types && v_hooks THEN 1
                     WHEN coalesce(f.verified_enrichment_fact_count,0) > 0 THEN 2
                     ELSE 3 END
           ELSE 0 END ASC,
      CASE WHEN p_sort = 'best'
           THEN coalesce(f.verified_enrichment_fact_count,0)
                + coalesce(f.secondary_signal_count,0) * 10
                + coalesce(f.verified_creator_signal_count,0) * 10
           ELSE 0 END DESC,
      f.created_at DESC
    LIMIT greatest(coalesce(p_limit, 25), 1)
    OFFSET greatest(coalesce(p_offset, 0), 0)
  )
  SELECT (SELECT n FROM counted), coalesce((SELECT jsonb_agg(row) FROM page), '[]'::jsonb)
  INTO v_total, v_rows;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END;
$$;

REVOKE ALL ON FUNCTION public.teacher_prospects_search(text, text[], text, text, text, uuid[], integer, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.teacher_prospects_search(text, text[], text, text, text, uuid[], integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_prospects_search(text, text[], text, text, text, uuid[], integer, integer) TO service_role;