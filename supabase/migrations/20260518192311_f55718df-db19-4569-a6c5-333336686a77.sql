-- 1. Drop legacy FK
ALTER TABLE public.city_market_signals
  DROP CONSTRAINT city_market_signals_city_id_fkey;

-- 2. Remove any rows that point at the legacy cities table only (no us_cities_scored equivalent)
DELETE FROM public.city_market_signals
WHERE city_id NOT IN (SELECT id FROM public.us_cities_scored);

-- 3. Add new FK to us_cities_scored
ALTER TABLE public.city_market_signals
  ADD CONSTRAINT city_market_signals_city_id_fkey
  FOREIGN KEY (city_id) REFERENCES public.us_cities_scored(id) ON DELETE CASCADE;