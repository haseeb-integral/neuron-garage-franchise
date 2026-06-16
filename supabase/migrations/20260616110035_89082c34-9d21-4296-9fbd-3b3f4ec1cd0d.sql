CREATE TABLE public.urban_institute_state_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  state_fips text NOT NULL,
  year integer NOT NULL,
  schools jsonb NOT NULL DEFAULT '[]'::jsonb,
  school_count integer NOT NULL DEFAULT 0,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, state_fips, year)
);

GRANT SELECT ON public.urban_institute_state_cache TO authenticated;
GRANT ALL ON public.urban_institute_state_cache TO service_role;

ALTER TABLE public.urban_institute_state_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read urban institute cache"
  ON public.urban_institute_state_cache
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE TRIGGER update_urban_institute_state_cache_updated_at
  BEFORE UPDATE ON public.urban_institute_state_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_urban_institute_state_cache_lookup
  ON public.urban_institute_state_cache (source, state_fips, year);