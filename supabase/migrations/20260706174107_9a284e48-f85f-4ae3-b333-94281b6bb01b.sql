ALTER TABLE public.us_cities_scored
  ADD COLUMN IF NOT EXISTS affluent_families_count integer,
  ADD COLUMN IF NOT EXISTS affluent_families_share numeric,
  ADD COLUMN IF NOT EXISTS affluent_families_snapped_bracket integer,
  ADD COLUMN IF NOT EXISTS affluent_families_effective_threshold integer;

COMMENT ON COLUMN public.us_cities_scored.affluent_families_count IS 'B19131: count of families with own children <18 with income above snapped bracket. Nullable — null means fetch failed or city outside coverage; scoring falls back to old 4-metric Demand.';
COMMENT ON COLUMN public.us_cities_scored.affluent_families_share IS 'B19131: share (0-1) of families with own children <18 above snapped bracket.';
COMMENT ON COLUMN public.us_cities_scored.affluent_families_snapped_bracket IS 'B19131 bracket lower bound the effective threshold snapped to (e.g. 150000, 200000).';
COMMENT ON COLUMN public.us_cities_scored.affluent_families_effective_threshold IS 'AFFLUENCE_THRESHOLD_BASE (150000) × city RPP / 100, before snap.';