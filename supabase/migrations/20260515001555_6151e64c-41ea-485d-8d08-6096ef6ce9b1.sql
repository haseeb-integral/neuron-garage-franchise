CREATE TABLE public.teacher_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  school text,
  district text,
  email text,
  grade text,
  experience_years integer,
  city text NOT NULL,
  state text NOT NULL,
  fit_score integer,
  status text NOT NULL DEFAULT 'new',
  apify_run_id text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_teacher_prospects_city_state ON public.teacher_prospects (lower(city), lower(state));
CREATE UNIQUE INDEX idx_teacher_prospects_email_lower ON public.teacher_prospects (lower(email)) WHERE email IS NOT NULL;

ALTER TABLE public.teacher_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view teacher prospects"
  ON public.teacher_prospects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert teacher prospects"
  ON public.teacher_prospects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update teacher prospects"
  ON public.teacher_prospects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete teacher prospects"
  ON public.teacher_prospects FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_teacher_prospects_updated_at
  BEFORE UPDATE ON public.teacher_prospects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();