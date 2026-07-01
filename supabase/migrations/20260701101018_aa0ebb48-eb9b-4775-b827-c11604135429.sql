-- Fix Austin IDEA Lab Kids swapped price row (price_min > price_max).
-- One-shot correction: swap min/max for any Austin row where min > max.
UPDATE public.mvs_providers
   SET price_min = price_max,
       price_max = price_min,
       updated_at = now()
 WHERE city = 'Austin, TX'
   AND price_min IS NOT NULL
   AND price_max IS NOT NULL
   AND price_min > price_max;

-- Defensive guard for the whole table: catch any other legacy swaps.
UPDATE public.mvs_providers
   SET price_min = price_max,
       price_max = price_min,
       updated_at = now()
 WHERE price_min IS NOT NULL
   AND price_max IS NOT NULL
   AND price_min > price_max;

-- Partial unique index so future runs can't insert duplicate (city, name) rows.
-- Uses lower(name) so casing variants collapse; skips NULL names.
CREATE UNIQUE INDEX IF NOT EXISTS mvs_providers_city_lower_name_uniq
  ON public.mvs_providers (city, lower(name))
  WHERE name IS NOT NULL;