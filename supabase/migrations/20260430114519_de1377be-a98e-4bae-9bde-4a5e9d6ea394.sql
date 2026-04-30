
CREATE TABLE public.onboarding_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES public.candidates(id) ON DELETE SET NULL,
  franchisee_name text NOT NULL,
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'on_track',
  current_step_index integer NOT NULL DEFAULT 0,
  total_steps integer NOT NULL DEFAULT 7,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_onboarding_records_candidate_id ON public.onboarding_records(candidate_id);
CREATE INDEX idx_onboarding_records_created_at ON public.onboarding_records(created_at DESC);

CREATE TABLE public.onboarding_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id uuid NOT NULL REFERENCES public.onboarding_records(id) ON DELETE CASCADE,
  step_index integer NOT NULL,
  title text NOT NULL,
  description text,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_onboarding_steps_onboarding_id ON public.onboarding_steps(onboarding_id);

ALTER TABLE public.onboarding_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view onboarding records" ON public.onboarding_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert onboarding records" ON public.onboarding_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update onboarding records" ON public.onboarding_records FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete onboarding records" ON public.onboarding_records FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated can view onboarding steps" ON public.onboarding_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert onboarding steps" ON public.onboarding_steps FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update onboarding steps" ON public.onboarding_steps FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete onboarding steps" ON public.onboarding_steps FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_onboarding_records_updated_at
BEFORE UPDATE ON public.onboarding_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
