CREATE TABLE public.urban_institute_seed_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  state_abbr text NOT NULL,
  state_fips text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  ccd_count integer,
  pss_count integer,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.urban_institute_seed_runs TO service_role;

ALTER TABLE public.urban_institute_seed_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view seed runs"
  ON public.urban_institute_seed_runs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE INDEX urban_institute_seed_runs_batch_idx ON public.urban_institute_seed_runs (batch_id);

CREATE TRIGGER set_updated_at_urban_institute_seed_runs
  BEFORE UPDATE ON public.urban_institute_seed_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();