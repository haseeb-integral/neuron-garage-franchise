ALTER TABLE public.portal_step_files ADD COLUMN IF NOT EXISTS fdd_issuance_date date, ADD COLUMN IF NOT EXISTS file_sha256 text;
ALTER TABLE public.portal_step_files ADD CONSTRAINT fdd_needs_issuance_date
  CHECK (NOT is_fdd OR (fdd_issuance_date IS NOT NULL AND file_sha256 IS NOT NULL)) NOT VALID;
ALTER TABLE public.candidate_compliance ADD COLUMN IF NOT EXISTS fdd_file_id uuid REFERENCES public.portal_step_files(id);

CREATE TABLE public.fdd_delivery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  fdd_file_id uuid REFERENCES public.portal_step_files(id),
  event text NOT NULL CHECK (event IN ('made_available','downloaded','emailed','receipt_signed')),
  at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  actor_email text,
  ip text,
  user_agent text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX fdd_delivery_events_cand_idx ON public.fdd_delivery_events(candidate_id, at);
GRANT SELECT ON public.fdd_delivery_events TO authenticated;
GRANT ALL ON public.fdd_delivery_events TO service_role;
ALTER TABLE public.fdd_delivery_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff or own prospect read FDD log" ON public.fdd_delivery_events FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR candidate_id = public.portal_candidate_id(auth.uid()));

-- Prospect: record that the current FDD was made available to them (once per version).
CREATE OR REPLACE FUNCTION public.portal_log_fdd_available() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cand uuid := public.portal_candidate_id(auth.uid()); _fdd uuid := public.portal_latest_fdd_id(); _step smallint;
BEGIN
  IF _cand IS NULL OR _fdd IS NULL THEN RETURN NULL; END IF;
  _step := public.portal_current_step(auth.uid());
  IF _step IS NULL OR _step < 2 THEN RETURN NULL; END IF;
  IF NOT EXISTS (SELECT 1 FROM fdd_delivery_events WHERE candidate_id=_cand AND fdd_file_id=_fdd AND event='made_available') THEN
    INSERT INTO fdd_delivery_events(candidate_id, fdd_file_id, event, actor_id, actor_email)
    VALUES (_cand, _fdd, 'made_available', auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()));
  END IF;
  RETURN _fdd;
END $$;
REVOKE ALL ON FUNCTION public.portal_log_fdd_available() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_log_fdd_available() TO authenticated;

-- Staff: record which FDD version was emailed, and when.
CREATE OR REPLACE FUNCTION public.log_fdd_emailed(_candidate_id uuid, _fdd_file_id uuid, _sent_at timestamptz) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Staff only'; END IF;
  IF NOT EXISTS (SELECT 1 FROM portal_step_files WHERE id=_fdd_file_id AND is_fdd) THEN RAISE EXCEPTION 'Not an FDD version'; END IF;
  INSERT INTO candidate_compliance(candidate_id, fdd_sent_at, fdd_file_id) VALUES (_candidate_id, _sent_at, _fdd_file_id)
    ON CONFLICT (candidate_id) DO UPDATE SET fdd_sent_at = EXCLUDED.fdd_sent_at, fdd_file_id = EXCLUDED.fdd_file_id;
  INSERT INTO fdd_delivery_events(candidate_id, fdd_file_id, event, at, actor_id, actor_email, meta)
  VALUES (_candidate_id, _fdd_file_id, 'emailed', now(), auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()),
    jsonb_build_object('sent_date', _sent_at));
END $$;
REVOKE ALL ON FUNCTION public.log_fdd_emailed(uuid, uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_fdd_emailed(uuid, uuid, timestamptz) TO authenticated;