-- Rewrite as dynamic SQL: the "param IS NULL OR col ILIKE param" style
-- prevented the planner from using the trigram indexes, so the search still
-- scanned every row and timed out. Building the WHERE clause per call lets
-- Postgres pick the trigram indexes.
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
  v_where text := 'TRUE';
  v_order text;
  v_total bigint;
  v_rows jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_cities IS NOT NULL AND array_length(p_cities, 1) > 0 THEN
    v_where := v_where || ' AND t.city = ANY($2)';
  END IF;

  IF v_pattern IS NOT NULL THEN
    v_where := v_where || ' AND (t.name ILIKE $1 OR t.school ILIKE $1 OR t.city ILIKE $1'
                       || ' OR t.state ILIKE $1 OR t.email ILIKE $1)';
  END IF;

  IF p_source_filter = 'smartlead' THEN
    v_where := v_where || ' AND t.enrichment_source = ''smartlead_csv''';
  ELSIF p_source_filter = 'linkedin' THEN
    v_where := v_where || ' AND t.enrichment_source = ''linkedin_danish''';
  ELSIF p_source_filter = 'needs_email' THEN
    v_where := v_where || ' AND t.needs_email_enrichment IS TRUE';
  END IF;

  IF p_signal_filter = 'tier1' THEN
    v_where := v_where || ' AND (coalesce(t.secondary_signal_count,0) > 0 OR coalesce(t.verified_creator_signal_count,0) > 0)';
  ELSIF p_signal_filter = 'tier2' THEN
    v_where := v_where || ' AND t.verified_enrichment_signal_types && $3';
  ELSIF p_signal_filter = 'medium_plus' THEN
    v_where := v_where || ' AND t.secondary_signal_confidence = ''MEDIUM''';
  ELSIF p_signal_filter = 'creator' THEN
    v_where := v_where || ' AND coalesce(t.verified_creator_signal_count,0) > 0';
  ELSIF p_signal_filter = 'secondary' THEN
    v_where := v_where || ' AND coalesce(t.secondary_signal_count,0) > 0';
  ELSIF p_signal_filter = 'has_phone' THEN
    v_where := v_where || ' AND t.phone IS NOT NULL AND t.phone <> ''''';
  END IF;

  IF p_exclude_ids IS NOT NULL AND array_length(p_exclude_ids, 1) > 0 THEN
    v_where := v_where || ' AND NOT (t.id = ANY($4))';
  END IF;

  IF p_sort = 'best' THEN
    v_order := 'CASE WHEN coalesce(t.secondary_signal_count,0) > 0 OR coalesce(t.verified_creator_signal_count,0) > 0 THEN 0'
            || ' WHEN t.verified_enrichment_signal_types && $3 THEN 1'
            || ' WHEN coalesce(t.verified_enrichment_fact_count,0) > 0 THEN 2 ELSE 3 END ASC,'
            || ' (coalesce(t.verified_enrichment_fact_count,0) + coalesce(t.secondary_signal_count,0) * 10'
            || ' + coalesce(t.verified_creator_signal_count,0) * 10) DESC, t.created_at DESC';
  ELSE
    v_order := 't.created_at DESC';
  END IF;

  EXECUTE format('SELECT count(*) FROM public.teacher_prospects t WHERE %s', v_where)
    INTO v_total USING v_pattern, p_cities, v_hooks, p_exclude_ids;

  EXECUTE format(
    'SELECT coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) FROM ('
    || 'SELECT t.* FROM public.teacher_prospects t WHERE %s ORDER BY %s LIMIT %s OFFSET %s) x',
    v_where, v_order, greatest(coalesce(p_limit, 25), 1), greatest(coalesce(p_offset, 0), 0))
    INTO v_rows USING v_pattern, p_cities, v_hooks, p_exclude_ids;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END;
$$;