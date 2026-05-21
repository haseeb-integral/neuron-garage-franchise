-- Add gap-log table and ensure us_cities_scored is updatable for backfill jobs.

CREATE TABLE IF NOT EXISTS public.city_data_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL,
  field_name text NOT NULL,
  reason text NOT NULL,
  checked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city_id, field_name)
);

ALTER TABLE public.city_data_gaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view city_data_gaps"
  ON public.city_data_gaps FOR SELECT TO authenticated USING (true);

-- Allow service role / authenticated update on us_cities_scored
-- (backfill jobs need UPDATE; previously only INSERT/SELECT were allowed).
DROP POLICY IF EXISTS "Authenticated can update scored cities" ON public.us_cities_scored;
CREATE POLICY "Authenticated can update scored cities"
  ON public.us_cities_scored FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- One-time backfill: pull missing lat/long from us_cities_geo
UPDATE public.us_cities_scored s
SET latitude = g.lat, longitude = g.lng
FROM public.us_cities_geo g
WHERE (s.latitude IS NULL OR s.longitude IS NULL)
  AND g.state_id = s.state_abbr
  AND (LOWER(g.city_ascii) = LOWER(s.city_name) OR LOWER(g.city) = LOWER(s.city_name));