CREATE TABLE IF NOT EXISTS public.candidate_profiles (
  candidate_id uuid PRIMARY KEY REFERENCES public.candidates(id) ON DELETE CASCADE,
  background text,
  motivation text,
  liquid_capital numeric,
  net_worth numeric,
  timeline text,
  partner_involved boolean NOT NULL DEFAULT false,
  location_preferences text,
  additional_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view candidate profiles"
  ON public.candidate_profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert candidate profiles"
  ON public.candidate_profiles FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update candidate profiles"
  ON public.candidate_profiles FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can delete candidate profiles"
  ON public.candidate_profiles FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_candidate_profiles_updated_at
  BEFORE UPDATE ON public.candidate_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();