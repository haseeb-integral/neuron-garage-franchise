
-- Phase 3: Relative CSI saturation tiers

CREATE OR REPLACE FUNCTION public.compute_csi_tiers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_p60 numeric;
  v_p85 numeric;
  v_count integer;
BEGIN
  -- 1) Percentiles of ratio = raw_supply / score_demand (guarded)
  WITH ratios AS (
    SELECT (csi_raw_supply::numeric / NULLIF(score_demand, 0)) AS r
    FROM public.us_cities_scored
    WHERE csi_raw_supply IS NOT NULL
      AND score_demand IS NOT NULL
      AND score_demand > 0
  )
  SELECT
    percentile_cont(0.60) WITHIN GROUP (ORDER BY r),
    percentile_cont(0.85) WITHIN GROUP (ORDER BY r),
    count(*)
  INTO v_p60, v_p85, v_count
  FROM ratios;

  -- 2) Upsert the single-row thresholds config
  INSERT INTO public.csi_tier_thresholds (id, p60_ratio, p85_ratio, city_count, computed_at)
  VALUES (true, v_p60, v_p85, v_count, now())
  ON CONFLICT (id) DO UPDATE
    SET p60_ratio = EXCLUDED.p60_ratio,
        p85_ratio = EXCLUDED.p85_ratio,
        city_count = EXCLUDED.city_count,
        computed_at = EXCLUDED.computed_at;

  -- 3) Label each city
  UPDATE public.us_cities_scored s
  SET csi_saturation_category = CASE
    WHEN s.csi_raw_supply IS NULL OR s.score_demand IS NULL OR s.score_demand = 0 THEN NULL
    WHEN (s.csi_raw_supply::numeric / s.score_demand) > v_p85 THEN 'Saturated'
    WHEN (s.csi_raw_supply::numeric / s.score_demand) > v_p60 THEN 'Competitive'
    ELSE 'Open'
  END;
END;
$$;

-- Trigger function: statement-level; recomputes whenever raw supply changes
CREATE OR REPLACE FUNCTION public.trg_recompute_csi_tiers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.compute_csi_tiers();
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS recompute_csi_tiers_on_supply_change ON public.us_cities_scored;
CREATE TRIGGER recompute_csi_tiers_on_supply_change
AFTER INSERT OR UPDATE OF csi_raw_supply ON public.us_cities_scored
FOR EACH STATEMENT
EXECUTE FUNCTION public.trg_recompute_csi_tiers();

-- Run once now to populate real tiers
SELECT public.compute_csi_tiers();
