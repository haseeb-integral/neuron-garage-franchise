
CREATE TABLE public.private_elementary_seed_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  city_id uuid,
  city_name text,
  state_abbr text,
  count integer,
  matched_by text,
  status text NOT NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX private_elementary_seed_runs_batch_idx
  ON public.private_elementary_seed_runs(batch_id);

GRANT SELECT ON public.private_elementary_seed_runs TO authenticated;
GRANT ALL ON public.private_elementary_seed_runs TO service_role;

ALTER TABLE public.private_elementary_seed_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read pss seed runs"
  ON public.private_elementary_seed_runs
  FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));
