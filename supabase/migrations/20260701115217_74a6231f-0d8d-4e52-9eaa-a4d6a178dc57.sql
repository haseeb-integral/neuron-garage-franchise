ALTER TABLE public.mvs_providers
  ADD COLUMN IF NOT EXISTS ai_overview_snippet text,
  ADD COLUMN IF NOT EXISTS ai_overview_source_url text;