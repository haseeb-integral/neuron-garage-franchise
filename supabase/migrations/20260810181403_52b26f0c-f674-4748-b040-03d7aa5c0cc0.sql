ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_name text,
  ADD COLUMN IF NOT EXISTS source_campaign text,
  ADD COLUMN IF NOT EXISTS source_notes text;

CREATE INDEX IF NOT EXISTS idx_candidates_source_type ON public.candidates (source_type);
CREATE INDEX IF NOT EXISTS idx_candidates_source_campaign ON public.candidates (source_campaign);

CREATE TABLE IF NOT EXISTS public.candidate_source_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL,
  source_name text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_candidate_source_options
  ON public.candidate_source_options (source_type, coalesce(source_name, ''));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_source_options TO authenticated;
GRANT ALL ON public.candidate_source_options TO service_role;

ALTER TABLE public.candidate_source_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read source options"
  ON public.candidate_source_options FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Admins can insert source options"
  ON public.candidate_source_options FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update source options"
  ON public.candidate_source_options FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete source options"
  ON public.candidate_source_options FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_candidate_source_options_updated_at
  BEFORE UPDATE ON public.candidate_source_options
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();