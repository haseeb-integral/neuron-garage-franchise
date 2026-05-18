
-- =====================================================================
-- Phase 1: us_cities_scored + city_seed_runs
-- =====================================================================

CREATE TABLE public.city_seed_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase text NOT NULL CHECK (phase IN ('phase_1_free', 'phase_1b_paid', 'refresh')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  cities_processed integer NOT NULL DEFAULT 0,
  cities_failed integer NOT NULL DEFAULT 0,
  error_summary jsonb,
  notes text
);

ALTER TABLE public.city_seed_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view seed runs"
  ON public.city_seed_runs FOR SELECT
  TO authenticated USING (true);

-- Writes only via service role (no INSERT/UPDATE/DELETE policy => denied for authenticated)

CREATE INDEX idx_city_seed_runs_started_at ON public.city_seed_runs (started_at DESC);

-- =====================================================================

CREATE TABLE public.us_cities_scored (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  city_name text NOT NULL,
  state_abbr text NOT NULL,
  state_name text NOT NULL,
  population integer,
  latitude numeric,
  longitude numeric,
  metro_area text,
  is_registration_state boolean NOT NULL DEFAULT true,

  -- Raw signals (Phase 1, free sources)
  children_5_12 integer,
  median_household_income numeric,
  dual_working_families_pct numeric,
  college_degree_pct numeric,
  population_density numeric,
  stem_job_concentration numeric,
  labor_force_participation numeric,
  regional_median_income numeric,
  cost_of_living_index numeric,
  public_elementary_count integer,
  public_elementary_enrollment integer,

  -- Raw signals (Phase 1b, deferred paid sources — nullable now)
  private_elementary_count integer,
  charter_elementary_count integer,
  summer_camp_count integer,
  avg_camp_price_per_hour numeric,
  school_hosted_camp_count integer,
  camp_waitlist_signals jsonb,

  -- Normalized 0-100 category scores
  score_demand integer,
  score_pricing_power integer,
  score_competitive integer,
  score_franchise_supply integer,
  score_ease_of_operation integer,
  score_parent_mindset integer,

  -- Composite
  composite_score_default integer,

  -- Per-source data vintage (date returned by source, not seed time)
  census_last_updated date,
  bls_last_updated date,
  bea_last_updated date,
  fred_last_updated date,
  nces_last_updated date,
  greatschools_last_updated date,
  apify_last_updated date,
  firecrawl_last_updated date,

  -- Run tracking
  scored_at timestamptz,
  seed_run_id uuid REFERENCES public.city_seed_runs(id) ON DELETE SET NULL,
  refresh_count integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (city_name, state_abbr)
);

ALTER TABLE public.us_cities_scored ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view scored cities"
  ON public.us_cities_scored FOR SELECT
  TO authenticated USING (true);

-- Writes only via service role (seed-cities-database edge function)

CREATE INDEX idx_us_cities_scored_composite
  ON public.us_cities_scored (composite_score_default DESC NULLS LAST);
CREATE INDEX idx_us_cities_scored_state
  ON public.us_cities_scored (state_abbr);
CREATE INDEX idx_us_cities_scored_population
  ON public.us_cities_scored (population DESC NULLS LAST);

CREATE TRIGGER update_us_cities_scored_updated_at
  BEFORE UPDATE ON public.us_cities_scored
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
