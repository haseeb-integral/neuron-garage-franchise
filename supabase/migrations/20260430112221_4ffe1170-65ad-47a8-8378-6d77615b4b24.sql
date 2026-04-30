CREATE TABLE public.candidate_qualification (
  candidate_id uuid PRIMARY KEY REFERENCES public.candidates(id) ON DELETE CASCADE,
  teaching_experience integer NOT NULL DEFAULT 0 CHECK (teaching_experience BETWEEN 0 AND 5),
  leadership integer NOT NULL DEFAULT 0 CHECK (leadership BETWEEN 0 AND 5),
  financial_readiness integer NOT NULL DEFAULT 0 CHECK (financial_readiness BETWEEN 0 AND 5),
  market_fit integer NOT NULL DEFAULT 0 CHECK (market_fit BETWEEN 0 AND 5),
  culture_fit integer NOT NULL DEFAULT 0 CHECK (culture_fit BETWEEN 0 AND 5),
  composite_score integer NOT NULL DEFAULT 0 CHECK (composite_score BETWEEN 0 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.candidate_qualification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view qualification"
  ON public.candidate_qualification FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert qualification"
  ON public.candidate_qualification FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update qualification"
  ON public.candidate_qualification FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can delete qualification"
  ON public.candidate_qualification FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_candidate_qualification_updated_at
  BEFORE UPDATE ON public.candidate_qualification
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();