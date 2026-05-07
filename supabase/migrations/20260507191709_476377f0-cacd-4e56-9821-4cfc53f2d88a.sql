-- TABLES
CREATE TABLE IF NOT EXISTS public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  metro_area TEXT,
  county TEXT,
  market_type TEXT NOT NULL DEFAULT 'Suburb',
  tier TEXT NOT NULL DEFAULT 'C',
  composite_score INTEGER NOT NULL DEFAULT 0 CHECK (composite_score BETWEEN 0 AND 100),
  population INTEGER,
  elementary_schools INTEGER,
  children_pct NUMERIC(5,2),
  median_income INTEGER,
  competitor_count INTEGER NOT NULL DEFAULT 0,
  is_non_registration BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  last_scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (city, state)
);

CREATE TABLE IF NOT EXISTS public.city_category_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (city_id, category)
);

CREATE TABLE IF NOT EXISTS public.city_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  pricing TEXT,
  capacity INTEGER,
  source TEXT,
  source_url TEXT,
  raw_data JSONB,
  scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.city_market_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  signal_key TEXT NOT NULL,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  delta TEXT,
  delta_type TEXT,
  source TEXT,
  source_url TEXT,
  raw_data JSONB,
  confidence NUMERIC(3,2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (city_id, signal_key)
);

CREATE TABLE IF NOT EXISTS public.city_fetch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  request_payload JSONB,
  response_summary JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_cities_state ON public.cities(state);
CREATE INDEX IF NOT EXISTS idx_cities_tier ON public.cities(tier);
CREATE INDEX IF NOT EXISTS idx_cities_composite_score ON public.cities(composite_score DESC);
CREATE INDEX IF NOT EXISTS idx_city_category_scores_city_id ON public.city_category_scores(city_id);
CREATE INDEX IF NOT EXISTS idx_city_competitors_city_id ON public.city_competitors(city_id);
CREATE INDEX IF NOT EXISTS idx_city_market_signals_city_id ON public.city_market_signals(city_id);
CREATE INDEX IF NOT EXISTS idx_city_fetch_jobs_city_id ON public.city_fetch_jobs(city_id);
CREATE INDEX IF NOT EXISTS idx_city_fetch_jobs_status ON public.city_fetch_jobs(status);

-- TRIGGERS
DROP TRIGGER IF EXISTS trg_cities_updated_at ON public.cities;
CREATE TRIGGER trg_cities_updated_at
  BEFORE UPDATE ON public.cities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_city_category_scores_updated_at ON public.city_category_scores;
CREATE TRIGGER trg_city_category_scores_updated_at
  BEFORE UPDATE ON public.city_category_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_city_market_signals_updated_at ON public.city_market_signals;
CREATE TRIGGER trg_city_market_signals_updated_at
  BEFORE UPDATE ON public.city_market_signals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.cities                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_category_scores  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_competitors      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_market_signals   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_fetch_jobs       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view cities"   ON public.cities;
DROP POLICY IF EXISTS "Authenticated can insert cities" ON public.cities;
DROP POLICY IF EXISTS "Authenticated can update cities" ON public.cities;
DROP POLICY IF EXISTS "Authenticated can delete cities" ON public.cities;
CREATE POLICY "Authenticated can view cities"   ON public.cities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert cities" ON public.cities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update cities" ON public.cities FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete cities" ON public.cities FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can view category scores"   ON public.city_category_scores;
DROP POLICY IF EXISTS "Authenticated can insert category scores" ON public.city_category_scores;
DROP POLICY IF EXISTS "Authenticated can update category scores" ON public.city_category_scores;
DROP POLICY IF EXISTS "Authenticated can delete category scores" ON public.city_category_scores;
CREATE POLICY "Authenticated can view category scores"   ON public.city_category_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert category scores" ON public.city_category_scores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update category scores" ON public.city_category_scores FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete category scores" ON public.city_category_scores FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can view competitors"   ON public.city_competitors;
DROP POLICY IF EXISTS "Authenticated can insert competitors" ON public.city_competitors;
DROP POLICY IF EXISTS "Authenticated can update competitors" ON public.city_competitors;
DROP POLICY IF EXISTS "Authenticated can delete competitors" ON public.city_competitors;
CREATE POLICY "Authenticated can view competitors"   ON public.city_competitors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert competitors" ON public.city_competitors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update competitors" ON public.city_competitors FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete competitors" ON public.city_competitors FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can view market signals"   ON public.city_market_signals;
DROP POLICY IF EXISTS "Authenticated can insert market signals" ON public.city_market_signals;
DROP POLICY IF EXISTS "Authenticated can update market signals" ON public.city_market_signals;
DROP POLICY IF EXISTS "Authenticated can delete market signals" ON public.city_market_signals;
CREATE POLICY "Authenticated can view market signals"   ON public.city_market_signals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert market signals" ON public.city_market_signals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update market signals" ON public.city_market_signals FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete market signals" ON public.city_market_signals FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can view fetch jobs"   ON public.city_fetch_jobs;
DROP POLICY IF EXISTS "Authenticated can insert fetch jobs" ON public.city_fetch_jobs;
DROP POLICY IF EXISTS "Authenticated can update fetch jobs" ON public.city_fetch_jobs;
DROP POLICY IF EXISTS "Authenticated can delete fetch jobs" ON public.city_fetch_jobs;
CREATE POLICY "Authenticated can view fetch jobs"   ON public.city_fetch_jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert fetch jobs" ON public.city_fetch_jobs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update fetch jobs" ON public.city_fetch_jobs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete fetch jobs" ON public.city_fetch_jobs FOR DELETE TO authenticated USING (true);