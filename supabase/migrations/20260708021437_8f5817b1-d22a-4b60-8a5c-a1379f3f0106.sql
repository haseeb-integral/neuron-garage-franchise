ALTER TABLE public.mvs_manus_cities
  ADD COLUMN IF NOT EXISTS provider_count integer,
  ADD COLUMN IF NOT EXISTS provider_names text;