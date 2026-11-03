CREATE OR REPLACE FUNCTION public.portal_path_refresh_signal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cid uuid; _uid uuid;
BEGIN
  IF TG_TABLE_NAME = 'candidates' THEN
    _cid := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    _cid := OLD.candidate_id;
  ELSE
    _cid := NEW.candidate_id;
  END IF;
  SELECT user_id INTO _uid FROM public.candidate_portal_users WHERE candidate_id = _cid;
  IF _uid IS NOT NULL THEN
    BEGIN
      PERFORM realtime.send('{}'::jsonb, 'path-changed', 'portal-path:' || _uid::text, true);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Portal refresh signal failed';
    END;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.portal_path_refresh_signal() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER portal_stage_refresh AFTER UPDATE OF current_stage ON public.candidates
FOR EACH ROW WHEN (OLD.current_stage IS DISTINCT FROM NEW.current_stage)
EXECUTE FUNCTION public.portal_path_refresh_signal();
CREATE TRIGGER portal_call_refresh AFTER INSERT OR UPDATE OR DELETE ON public.candidate_events
FOR EACH ROW EXECUTE FUNCTION public.portal_path_refresh_signal();
CREATE POLICY "Prospects read own path refresh signal" ON realtime.messages
FOR SELECT TO authenticated
USING (realtime.topic() = 'portal-path:' || auth.uid()::text
  AND public.portal_candidate_id(auth.uid()) IS NOT NULL);