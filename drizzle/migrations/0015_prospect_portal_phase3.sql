CREATE TABLE public.candidate_portal_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  step_num smallint NOT NULL CHECK (step_num BETWEEN 1 AND 5),
  item_key text NOT NULL CHECK (char_length(item_key) <= 60),
  item_label text NOT NULL CHECK (char_length(item_label) <= 200),
  done_by uuid,
  done_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, step_num, item_key)
);
GRANT SELECT, INSERT, DELETE ON public.candidate_portal_checklist TO authenticated;
GRANT ALL ON public.candidate_portal_checklist TO service_role;
ALTER TABLE public.candidate_portal_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read ticks" ON public.candidate_portal_checklist FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "prospect read own ticks" ON public.candidate_portal_checklist FOR SELECT TO authenticated USING (candidate_id = public.portal_candidate_id(auth.uid()));
CREATE POLICY "prospect add own ticks" ON public.candidate_portal_checklist FOR INSERT TO authenticated WITH CHECK (candidate_id = public.portal_candidate_id(auth.uid()) AND done_by = auth.uid());
CREATE POLICY "prospect remove own ticks" ON public.candidate_portal_checklist FOR DELETE TO authenticated USING (candidate_id = public.portal_candidate_id(auth.uid()));

CREATE OR REPLACE FUNCTION public.trg_portal_checklist_activity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO candidate_activities(candidate_id, type, content, metadata, actor_email)
    VALUES (NEW.candidate_id, 'note', 'Prospect finished: ' || NEW.item_label,
      jsonb_build_object('source','portal','step',NEW.step_num,'item',NEW.item_key),
      (SELECT email FROM auth.users WHERE id = NEW.done_by));
    RETURN NEW;
  ELSE
    INSERT INTO candidate_activities(candidate_id, type, content, metadata, actor_email)
    VALUES (OLD.candidate_id, 'note', 'Prospect un-ticked: ' || OLD.item_label,
      jsonb_build_object('source','portal','step',OLD.step_num,'item',OLD.item_key),
      (SELECT email FROM auth.users WHERE id = auth.uid()));
    RETURN OLD;
  END IF;
END $$;
CREATE TRIGGER portal_checklist_activity AFTER INSERT OR DELETE ON public.candidate_portal_checklist
FOR EACH ROW EXECUTE FUNCTION public.trg_portal_checklist_activity();

-- Safe read for the prospect's own path: stage, per-step call dates, next call. No notes.
CREATE OR REPLACE FUNCTION public.portal_my_path() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _cid uuid := public.portal_candidate_id(auth.uid()); _r jsonb;
BEGIN
  IF _cid IS NULL THEN RETURN NULL; END IF;
  SELECT jsonb_build_object(
    'first_name', c.first_name,
    'stage', c.current_stage,
    'step_dates', COALESCE((SELECT jsonb_object_agg(s.step, s.starts_at) FROM (
        SELECT DISTINCT ON (source_process_step) source_process_step AS step, starts_at
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