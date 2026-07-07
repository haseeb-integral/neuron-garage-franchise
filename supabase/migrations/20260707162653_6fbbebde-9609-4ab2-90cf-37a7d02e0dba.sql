ALTER TABLE public.us_cities_scored
  ADD COLUMN IF NOT EXISTS provider_count integer;

COMMENT ON COLUMN public.us_cities_scored.provider_count IS
  'Count of providers in mvs_providers for this city (Phase 4 of Tier 1 rework). Nullable — cities outside the pilot set stay null until v1.8.';