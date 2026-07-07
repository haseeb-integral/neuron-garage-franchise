ALTER TABLE public.site_analysis_acs_cache
  ADD COLUMN IF NOT EXISTS pct_hh_above_200k numeric,
  ADD COLUMN IF NOT EXISTS hh_above_200k numeric;