
-- Enums
CREATE TYPE public.mvs_tier AS ENUM ('premium', 'mid', 'budget', 'community');
CREATE TYPE public.mvs_week_status AS ENUM ('open', 'limited', 'waitlist', 'sold_out', 'unknown');
CREATE TYPE public.mvs_qa_entity AS ENUM ('provider', 'week');
CREATE TYPE public.mvs_overlap AS ENUM ('direct', 'adjacent', 'distant');
CREATE TYPE public.mvs_run_status AS ENUM ('queued', 'running', 'done', 'failed');

-- mvs_pipeline_runs (referenced by providers/weeks, create first)
CREATE TABLE public.mvs_pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  status public.mvs_run_status NOT NULL DEFAULT 'queued',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  firecrawl_calls INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mvs_pipeline_runs TO authenticated;
GRANT ALL ON public.mvs_pipeline_runs TO service_role;
ALTER TABLE public.mvs_pipeline_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mvs_runs read auth" ON public.mvs_pipeline_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "mvs_runs write mgr" ON public.mvs_pipeline_runs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- mvs_providers
CREATE TABLE public.mvs_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  url TEXT,
  price_min NUMERIC,
  price_max NUMERIC,
  category_raw TEXT,
  category_classified TEXT,
  tier public.mvs_tier,
  screenshot_url TEXT,
  confidence NUMERIC,
  source_run_id UUID REFERENCES public.mvs_pipeline_runs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mvs_providers_city ON public.mvs_providers(city);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mvs_providers TO authenticated;
GRANT ALL ON public.mvs_providers TO service_role;
ALTER TABLE public.mvs_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mvs_providers read auth" ON public.mvs_providers FOR SELECT TO authenticated USING (true);
CREATE POLICY "mvs_providers write mgr" ON public.mvs_providers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- mvs_weeks
CREATE TABLE public.mvs_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.mvs_providers(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  status public.mvs_week_status NOT NULL DEFAULT 'unknown',
  status_evidence TEXT,
  screenshot_url TEXT,
  confidence NUMERIC,
  source_run_id UUID REFERENCES public.mvs_pipeline_runs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mvs_weeks_provider ON public.mvs_weeks(provider_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mvs_weeks TO authenticated;
GRANT ALL ON public.mvs_weeks TO service_role;
ALTER TABLE public.mvs_weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mvs_weeks read auth" ON public.mvs_weeks FOR SELECT TO authenticated USING (true);
CREATE POLICY "mvs_weeks write mgr" ON public.mvs_weeks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- mvs_qa_queue
CREATE TABLE public.mvs_qa_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type public.mvs_qa_entity NOT NULL,
  entity_id UUID NOT NULL,
  reason TEXT NOT NULL,
  confidence NUMERIC,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mvs_qa_queue TO authenticated;
GRANT ALL ON public.mvs_qa_queue TO service_role;
ALTER TABLE public.mvs_qa_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mvs_qa read mgr" ON public.mvs_qa_queue FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "mvs_qa write mgr" ON public.mvs_qa_queue FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- mvs_operator_watchlist
CREATE TABLE public.mvs_operator_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  overlap public.mvs_overlap NOT NULL DEFAULT 'direct',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mvs_operator_watchlist TO authenticated;
GRANT ALL ON public.mvs_operator_watchlist TO service_role;
ALTER TABLE public.mvs_operator_watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mvs_watch read auth" ON public.mvs_operator_watchlist FOR SELECT TO authenticated USING (true);
CREATE POLICY "mvs_watch write mgr" ON public.mvs_operator_watchlist FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- mvs_city_overlap_overrides
CREATE TABLE public.mvs_city_overlap_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  operator_name TEXT NOT NULL,
  overlap_override public.mvs_overlap NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (city, operator_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mvs_city_overlap_overrides TO authenticated;
GRANT ALL ON public.mvs_city_overlap_overrides TO service_role;
ALTER TABLE public.mvs_city_overlap_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mvs_overlap read auth" ON public.mvs_city_overlap_overrides FOR SELECT TO authenticated USING (true);
CREATE POLICY "mvs_overlap write mgr" ON public.mvs_city_overlap_overrides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- updated_at triggers (reuse existing public.update_updated_at_column())
CREATE TRIGGER trg_mvs_providers_updated_at BEFORE UPDATE ON public.mvs_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_mvs_weeks_updated_at BEFORE UPDATE ON public.mvs_weeks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_mvs_qa_updated_at BEFORE UPDATE ON public.mvs_qa_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_mvs_watch_updated_at BEFORE UPDATE ON public.mvs_operator_watchlist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_mvs_overlap_updated_at BEFORE UPDATE ON public.mvs_city_overlap_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_mvs_runs_updated_at BEFORE UPDATE ON public.mvs_pipeline_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
