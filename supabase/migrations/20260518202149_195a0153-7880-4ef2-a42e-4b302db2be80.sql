-- B10 PSS normalization residual fix.
-- Only one true normalization residual found in the embedded NCES PSS 2021-22 dataset:
-- "WINSTON SALEM, NC = 12" exists in the source but catalog stores it as "Winston-Salem".
-- St. Louis / St. Paul / St. Petersburg / Port St. Lucie / Dallas etc. are NOT in the
-- embedded PSS data at all — those require a fresh NCES PSS pull (tracked in OPEN_TASKS).

UPDATE public.us_cities_scored
SET private_elementary_count = 12,
    nces_last_updated = CURRENT_DATE
WHERE city_name = 'Winston-Salem' AND state_abbr = 'NC'
  AND private_elementary_count IS NULL;

INSERT INTO public.city_market_signals (city_id, signal_key, label, value, source, confidence, updated_at)
SELECT id, 'private_elementary_count', 'Private elementary schools (NCES PSS)', '12',
       'NCES PSS 2021-22', 0.9, now()
FROM public.us_cities_scored
WHERE city_name = 'Winston-Salem' AND state_abbr = 'NC'
ON CONFLICT (city_id, signal_key)
DO UPDATE SET value = EXCLUDED.value, source = EXCLUDED.source,
              confidence = EXCLUDED.confidence, updated_at = EXCLUDED.updated_at;