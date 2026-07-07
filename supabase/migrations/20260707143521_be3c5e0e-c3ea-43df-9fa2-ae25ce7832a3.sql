-- Phase 1: CSI refactor (Prompt 1)
-- Remove enrollment×0.003 local-provider guess and demand-denominator from CSI.
-- New CSI supply = (STEM brand locations × 2.0) + (general brand locations × 1.0),
-- which is already stored pre-weighted in csi_national_brand_count_weighted.
-- Old columns kept in place for rollback per Haseeb's approval.

COMMENT ON COLUMN public.us_cities_scored.csi_local_provider_estimate IS
  'DEPRECATED 2026-07-07: enrollment×0.003 guess removed from CSI formula. Kept for rollback; not read by any code path.';
COMMENT ON COLUMN public.us_cities_scored.csi_demand_adjusted_market IS
  'DEPRECATED 2026-07-07: demand denominator removed from CSI (Demand pillar owns city size and income). Kept for rollback; not read by any code path.';

-- New raw supply column (mirrors csi_national_brand_count_weighted; explicit name
-- so future imports can populate it directly without a computed column).
ALTER TABLE public.us_cities_scored
  ADD COLUMN IF NOT EXISTS csi_raw_supply numeric;
COMMENT ON COLUMN public.us_cities_scored.csi_raw_supply IS
  'Real counted competitors: (stem_brand_locations × 2.0) + (general_brand_locations × 1.0). Feeds score_csi and (in Phase 3) percentile tiers.';

-- Empty thresholds row for Phase 3 percentile tiers (single-row pattern via boolean PK).
CREATE TABLE IF NOT EXISTS public.csi_tier_thresholds (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  p60_ratio numeric,
  p85_ratio numeric,
  city_count integer,
  computed_at timestamptz
);
GRANT SELECT ON public.csi_tier_thresholds TO authenticated;
GRANT ALL ON public.csi_tier_thresholds TO service_role;
ALTER TABLE public.csi_tier_thresholds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "csi_tier_thresholds readable by authenticated"
  ON public.csi_tier_thresholds FOR SELECT TO authenticated USING (true);
INSERT INTO public.csi_tier_thresholds (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- Recompute csi_raw_supply from the already-weighted brand count.
UPDATE public.us_cities_scored
   SET csi_raw_supply = csi_national_brand_count_weighted
 WHERE csi_national_brand_count_weighted IS NOT NULL;

-- Recompute score_csi (and legacy csi_score) as percentile rank of csi_raw_supply
-- across all 817 cities. 0 = least saturated (best opportunity), 100 = most.
-- competitiveOpportunityFromCsi() = 100 − score_csi continues to work unchanged.
WITH ranked AS (
  SELECT id,
         round((percent_rank() OVER (ORDER BY csi_raw_supply))::numeric * 100)::int AS pr
    FROM public.us_cities_scored
   WHERE csi_raw_supply IS NOT NULL
)
UPDATE public.us_cities_scored s
   SET score_csi         = ranked.pr,
       csi_score         = ranked.pr,
       csi_last_updated  = now()
  FROM ranked
 WHERE s.id = ranked.id;

-- Mute the old hardcoded tier labels everywhere until Phase 3 replaces them.
UPDATE public.us_cities_scored
   SET csi_saturation_category = 'Pending recalibration'
 WHERE csi_raw_supply IS NOT NULL;