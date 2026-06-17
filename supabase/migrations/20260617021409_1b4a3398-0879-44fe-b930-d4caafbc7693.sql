-- Turn 0.1: MVS feature flag table (per-city data source switch)
CREATE TABLE public.mvs_city_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  state text NOT NULL,
  mvs_data_source text NOT NULL DEFAULT 'sample' CHECK (mvs_data_source IN ('sample','live')),
  low_confidence_badge boolean NOT NULL DEFAULT false,
  last_run_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city, state)
);

GRANT SELECT ON public.mvs_city_flags TO anon, authenticated;
GRANT ALL ON public.mvs_city_flags TO service_role;

ALTER TABLE public.mvs_city_flags ENABLE ROW LEVEL SECURITY;

-- Everyone signed-in (and anon for the public shortlist UI) can read.
CREATE POLICY "mvs_city_flags read all"
  ON public.mvs_city_flags FOR SELECT
  USING (true);

-- Only managers/admins can flip a city between sample and live.
CREATE POLICY "mvs_city_flags managers write"
  ON public.mvs_city_flags FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_mvs_city_flags_updated_at
  BEFORE UPDATE ON public.mvs_city_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
