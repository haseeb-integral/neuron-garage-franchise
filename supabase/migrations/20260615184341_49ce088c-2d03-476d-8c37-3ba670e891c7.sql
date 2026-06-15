-- =========================================================
-- Feature 1B Site Analysis Engine — isolated table set
-- =========================================================

-- 1) site_analyses ----------------------------------------
CREATE TABLE public.site_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  school_name TEXT,
  school_type TEXT,
  enrollment INTEGER,
  grade_band TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  sas_score NUMERIC(5,2),
  school_profile_score NUMERIC(5,2),
  affluence_score NUMERIC(5,2),
  family_density_score NUMERIC(5,2),
  ecosystem_score NUMERIC(5,2),
  accessibility_score NUMERIC(5,2),
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  inputs_hash TEXT,
  engine_version TEXT NOT NULL DEFAULT 'sas-v0.1',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','ready','failed')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_site_analyses_user ON public.site_analyses(user_id, created_at DESC);
CREATE INDEX idx_site_analyses_hash ON public.site_analyses(inputs_hash);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_analyses TO authenticated;
GRANT ALL ON public.site_analyses TO service_role;

ALTER TABLE public.site_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own site analyses"
  ON public.site_analyses FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff read all site analyses"
  ON public.site_analyses FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE TRIGGER update_site_analyses_updated_at
  BEFORE UPDATE ON public.site_analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) site_analysis_isochrones -----------------------------
CREATE TABLE public.site_analysis_isochrones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID NOT NULL REFERENCES public.site_analyses(id) ON DELETE CASCADE,
  minutes SMALLINT NOT NULL CHECK (minutes IN (10,15)),
  provider TEXT NOT NULL DEFAULT 'mapbox',
  geojson JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (analysis_id, minutes)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_analysis_isochrones TO authenticated;
GRANT ALL ON public.site_analysis_isochrones TO service_role;

ALTER TABLE public.site_analysis_isochrones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access isochrones for own analyses"
  ON public.site_analysis_isochrones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.site_analyses a
      WHERE a.id = site_analysis_isochrones.analysis_id
        AND (a.user_id = auth.uid() OR public.is_staff(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.site_analyses a
      WHERE a.id = site_analysis_isochrones.analysis_id
        AND a.user_id = auth.uid()
    )
  );

-- 3) site_analysis_acs_cache ------------------------------
CREATE TABLE public.site_analysis_acs_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  polygon_hash TEXT NOT NULL UNIQUE,
  minutes SMALLINT NOT NULL CHECK (minutes IN (10,15)),
  median_hhi NUMERIC,
  pct_hh_above_150k NUMERIC,
  pct_dual_income NUMERIC,
  children_5_12 INTEGER,
  families_with_kids_5_12 INTEGER,
  total_population INTEGER,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_analysis_acs_cache TO authenticated;
GRANT ALL ON public.site_analysis_acs_cache TO service_role;

ALTER TABLE public.site_analysis_acs_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read acs cache"
  ON public.site_analysis_acs_cache FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE TRIGGER update_acs_cache_updated_at
  BEFORE UPDATE ON public.site_analysis_acs_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) site_analysis_ecosystem_cache ------------------------
CREATE TABLE public.site_analysis_ecosystem_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE, -- "lat,lng,radius_minutes"
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_minutes SMALLINT NOT NULL,
  elementary_count INTEGER,
  private_count INTEGER,
  nearby_student_pop INTEGER,
  road_distance_mi NUMERIC,
  highway_distance_mi NUMERIC,
  pop_reachable_15min INTEGER,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_analysis_ecosystem_cache TO authenticated;
GRANT ALL ON public.site_analysis_ecosystem_cache TO service_role;

ALTER TABLE public.site_analysis_ecosystem_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read ecosystem cache"
  ON public.site_analysis_ecosystem_cache FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE TRIGGER update_ecosystem_cache_updated_at
  BEFORE UPDATE ON public.site_analysis_ecosystem_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
