
-- Custom scoring criteria (team-shared, like other internal tables)
CREATE TABLE public.custom_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  name text NOT NULL,
  weight numeric NOT NULL DEFAULT 5,
  data_source text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_custom_criteria_category ON public.custom_criteria(category);

ALTER TABLE public.custom_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view custom criteria"
  ON public.custom_criteria FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert custom criteria"
  ON public.custom_criteria FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update custom criteria"
  ON public.custom_criteria FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete custom criteria"
  ON public.custom_criteria FOR DELETE TO authenticated USING (true);

-- Scoring config: single team-shared row holding selected preset + master weights
CREATE TABLE public.scoring_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_name text NOT NULL DEFAULT 'Balanced',
  master_weights jsonb NOT NULL,
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scoring_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view scoring config"
  ON public.scoring_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert scoring config"
  ON public.scoring_config FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update scoring config"
  ON public.scoring_config FOR UPDATE TO authenticated USING (true);

CREATE TRIGGER set_scoring_config_updated_at
  BEFORE UPDATE ON public.scoring_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
