CREATE OR REPLACE FUNCTION public.suppress_portal_step_notice(_candidate_id uuid, _step integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Staff only'; END IF;
  IF _step < 1 OR _step > 5 THEN RAISE EXCEPTION 'Bad step'; END IF;
  INSERT INTO public.portal_notice_dispatches(notice_key, candidate_id, payload, delivered_at)
  VALUES ('portal-step-' || _candidate_id::text || '-' || _step::text, _candidate_id,
          jsonb_build_object('kind','stage','suppressed',true,'by',auth.uid()), now())
  ON CONFLICT (notice_key) DO NOTHING;
END; $$;
REVOKE ALL ON FUNCTION public.suppress_portal_step_notice(uuid, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.suppress_portal_step_notice(uuid, integer) TO authenticated;