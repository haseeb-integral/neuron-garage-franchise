
-- ============================================================================
-- city_narratives — cached AI-written exec summary + market research report
-- ============================================================================
CREATE TABLE public.city_narratives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_id UUID NOT NULL,
  weights_hash TEXT NOT NULL DEFAULT 'default',
  model_id TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  prompt_version TEXT NOT NULL DEFAULT 'v1',
  executive_summary TEXT NOT NULL,
  report_snapshot TEXT NOT NULL,
  report_demand TEXT NOT NULL,
  report_supply TEXT NOT NULL,
  report_next_move TEXT NOT NULL,
  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (city_id, weights_hash, model_id, prompt_version)
);

CREATE INDEX idx_city_narratives_city ON public.city_narratives(city_id);

ALTER TABLE public.city_narratives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view city_narratives"
  ON public.city_narratives FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert city_narratives"
  ON public.city_narratives FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update city_narratives"
  ON public.city_narratives FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete city_narratives"
  ON public.city_narratives FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_city_narratives_updated_at
  BEFORE UPDATE ON public.city_narratives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- city_briefs — pre-baked compact context bundle per city
-- ============================================================================
CREATE TABLE public.city_briefs (
  city_id UUID NOT NULL PRIMARY KEY,
  city_name TEXT NOT NULL,
  state_abbr TEXT NOT NULL,
  state_name TEXT NOT NULL,
  metro_area TEXT,
  tier TEXT NOT NULL,
  composite_score INTEGER NOT NULL,
  pillar_demand INTEGER,
  pillar_tam INTEGER,
  pillar_opp INTEGER,
  brief JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_city_briefs_tier ON public.city_briefs(tier);
CREATE INDEX idx_city_briefs_state ON public.city_briefs(state_abbr);
CREATE INDEX idx_city_briefs_metro ON public.city_briefs(metro_area);
CREATE INDEX idx_city_briefs_score ON public.city_briefs(composite_score DESC);

ALTER TABLE public.city_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view city_briefs"
  ON public.city_briefs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert city_briefs"
  ON public.city_briefs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update city_briefs"
  ON public.city_briefs FOR UPDATE TO authenticated USING (true);

CREATE TRIGGER trg_city_briefs_updated_at
  BEFORE UPDATE ON public.city_briefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ask_city_conversations — per-user, per-city chat history
-- ============================================================================
CREATE TABLE public.ask_city_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  city_id UUID NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, city_id)
);

CREATE INDEX idx_ask_city_conv_user ON public.ask_city_conversations(user_id);

ALTER TABLE public.ask_city_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ask_city conversations"
  ON public.ask_city_conversations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own ask_city conversations"
  ON public.ask_city_conversations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own ask_city conversations"
  ON public.ask_city_conversations FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own ask_city conversations"
  ON public.ask_city_conversations FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_ask_city_conv_updated_at
  BEFORE UPDATE ON public.ask_city_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
