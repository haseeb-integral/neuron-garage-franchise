CREATE TABLE public.candidate_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('note','lead_sheet_saved','process_step_updated','stage_changed','vote_cast')),
  content text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX candidate_activities_candidate_created_idx
  ON public.candidate_activities (candidate_id, created_at DESC);

GRANT SELECT, INSERT ON public.candidate_activities TO authenticated;
GRANT ALL ON public.candidate_activities TO service_role;

ALTER TABLE public.candidate_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read all candidate activities"
  ON public.candidate_activities
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert candidate activities"
  ON public.candidate_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
