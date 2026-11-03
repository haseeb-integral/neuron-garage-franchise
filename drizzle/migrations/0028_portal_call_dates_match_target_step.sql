CREATE OR REPLACE FUNCTION public.portal_my_path() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _cid uuid := public.portal_candidate_id(auth.uid()); _r jsonb;
BEGIN
  IF _cid IS NULL THEN RETURN NULL; END IF;
  SELECT jsonb_build_object(
    'first_name', c.first_name,
    'stage', c.current_stage,
    'step_dates', COALESCE((SELECT jsonb_object_agg(s.step, s.starts_at) FROM (
        SELECT DISTINCT ON (source_process_step) source_process_step + 1 AS step, starts_at
        FROM candidate_events WHERE candidate_id = _cid AND status <> 'canceled' AND source_process_step IS NOT NULL
        ORDER BY source_process_step, starts_at DESC) s), '{}'::jsonb),
    'next_call', (SELECT jsonb_build_object('starts_at', e.starts_at, 'duration_minutes', e.duration_minutes,
        'all_day', e.all_day, 'title', e.title,
        'host', COALESCE(p.full_name, split_part(e.owner_email,'@',1)))
      FROM candidate_events e LEFT JOIN profiles p ON lower(p.email) = lower(e.owner_email)
      WHERE e.candidate_id = _cid AND e.status = 'scheduled' AND e.event_type = 'call'
        AND e.starts_at + make_interval(mins => COALESCE(e.duration_minutes,0)) > now()
      ORDER BY e.starts_at LIMIT 1)
  ) INTO _r FROM candidates c WHERE c.id = _cid;
  RETURN _r;
END $$;
REVOKE ALL ON FUNCTION public.portal_my_path() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.portal_my_path() TO authenticated;