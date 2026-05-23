-- Step 1 (Metric Truth Cleanup): drop orphan columns on us_cities_scored
-- that are not part of the live 12-metric registry and not written by any
-- active edge function. Pre-release; no preservation needed.
ALTER TABLE public.us_cities_scored
  DROP COLUMN IF EXISTS summer_camp_count,
  DROP COLUMN IF EXISTS school_hosted_camp_count,
  DROP COLUMN IF EXISTS avg_camp_price_per_hour,
  DROP COLUMN IF EXISTS camp_waitlist_signals;