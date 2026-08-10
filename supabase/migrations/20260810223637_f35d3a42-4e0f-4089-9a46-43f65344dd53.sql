CREATE TABLE public.candidate_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  event_type text NOT NULL DEFAULT 'call',
  starts_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  all_day boolean NOT NULL DEFAULT false,
  notes text,
  status text NOT NULL DEFAULT 'scheduled',
  owner_email text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT candidate_events_type_chk CHECK (event_type IN ('call','follow_up')),
  CONSTRAINT candidate_events_status_chk CHECK (status IN ('scheduled','completed','canceled')),
  CONSTRAINT candidate_events_duration_chk CHECK (duration_minutes > 0 AND duration_minutes <= 1440)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_events TO authenticated;
GRANT ALL ON public.candidate_events TO service_role;

ALTER TABLE public.candidate_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view candidate events"
  ON public.candidate_events FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert candidate events"
  ON public.candidate_events FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update candidate events"
  ON public.candidate_events FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete candidate events"
  ON public.candidate_events FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE INDEX idx_candidate_events_starts_at ON public.candidate_events (starts_at);
CREATE INDEX idx_candidate_events_candidate ON public.candidate_events (candidate_id);

CREATE TRIGGER trg_candidate_events_updated_at
  BEFORE UPDATE ON public.candidate_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();