ALTER TABLE public.cities
  ADD COLUMN IF NOT EXISTS latitude  numeric(9,6),
  ADD COLUMN IF NOT EXISTS longitude numeric(9,6);

CREATE INDEX IF NOT EXISTS idx_cities_lat_lng ON public.cities(latitude, longitude);