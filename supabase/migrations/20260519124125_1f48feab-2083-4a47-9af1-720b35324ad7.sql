ALTER TABLE public.us_cities_scored
  ADD COLUMN IF NOT EXISTS county_name text,
  ADD COLUMN IF NOT EXISTS metro_counties text[];

CREATE INDEX IF NOT EXISTS us_cities_scored_county_name_idx
  ON public.us_cities_scored (county_name);