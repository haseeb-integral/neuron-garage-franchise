
CREATE TABLE IF NOT EXISTS public.candidate_process_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  step_number smallint NOT NULL CHECK (step_number BETWEEN 1 AND 7),
  trial_close jsonb NOT NULL DEFAULT '{}'::jsonb,
  post_call_actions jsonb NOT NULL DEFAULT '{}'::jsonb,
  homework jsonb NOT NULL DEFAULT '{}'::jsonb,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, step_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_process_steps TO authenticated;
GRANT ALL ON public.candidate_process_steps TO service_role;

ALTER TABLE public.candidate_process_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view process steps"
  ON public.candidate_process_steps FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert process steps"
  ON public.candidate_process_steps FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update process steps"
  ON public.candidate_process_steps FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete process steps"
  ON public.candidate_process_steps FOR DELETE
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_candidate_process_steps_candidate
  ON public.candidate_process_steps (candidate_id, step_number);

CREATE TRIGGER trg_candidate_process_steps_updated_at
  BEFORE UPDATE ON public.candidate_process_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
