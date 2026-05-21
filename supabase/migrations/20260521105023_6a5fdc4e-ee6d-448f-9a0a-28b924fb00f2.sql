-- Update matched rows
WITH existing AS (
  SELECT id, state_abbr,
         lower(regexp_replace(city_name, '\s+(city|town|CDP|village|borough|municipality)$', '', 'i')) AS norm_name
  FROM public.us_cities_scored
),
matched AS (
  SELECT s.*, e.id AS existing_id
  FROM public._manus_stage_2026_05_21 s
  JOIN existing e ON e.state_abbr = s.state_abbr AND e.norm_name = s.norm_name
),
upd AS (
  UPDATE public.us_cities_scored u SET
    school_district_count = COALESCE(m.school_district_count, u.school_district_count),
    public_elementary_enrollment = COALESCE(m.public_elementary_enrollment, u.public_elementary_enrollment),
    median_household_income = COALESCE(m.median_household_income, u.median_household_income),
    college_degree_pct = COALESCE(m.college_degree_pct, u.college_degree_pct),
    cost_of_living_index = COALESCE(m.cost_of_living_index, u.cost_of_living_index),
    regional_median_income = COALESCE(m.regional_median_income, u.regional_median_income),
    population = COALESCE(m.population, u.population),
    csi_national_brand_count_weighted = m.csi_national_brand_count_weighted,
    csi_local_provider_estimate = m.csi_local_provider_estimate,
    csi_demand_adjusted_market = m.csi_demand_adjusted_market,
    csi_score = CASE
      WHEN m.csi_score_raw IS NULL THEN NULL
      WHEN m.csi_score_raw <= 1 THEN round(m.csi_score_raw * 10000)::int
      ELSE round(m.csi_score_raw)::int END,
    score_csi = CASE
      WHEN m.csi_score_raw IS NULL THEN NULL
      WHEN m.csi_score_raw <= 1 THEN round(m.csi_score_raw * 10000)::int
      ELSE round(m.csi_score_raw)::int END,
    csi_saturation_category = m.csi_saturation_category,
    csi_confidence = CASE m.csi_confidence_text
      WHEN 'high' THEN 0.9 WHEN 'medium' THEN 0.6 WHEN 'low' THEN 0.3 ELSE NULL END,
    csi_last_updated = m.csi_last_updated,
    csi_brand_detail = CASE WHEN m.csi_brand_detail_text IS NULL OR m.csi_brand_detail_text='' THEN NULL ELSE to_jsonb(m.csi_brand_detail_text) END,
    place_type = COALESCE(m.place_type, u.place_type),
    updated_at = now()
  FROM matched m WHERE u.id = m.existing_id
  RETURNING 1
)
INSERT INTO public.imports (source, batch_label, file_checksum, updated_count, started_at, completed_at, notes)
SELECT 'manus_competitive_landscape', '2026-05-21-v2', md5('competitive-landscape-v2.csv'),
       (SELECT count(*) FROM upd), now(), now(),
       'CSI v2.0 ingest: updates';

-- Insert unmatched rows
WITH existing AS (
  SELECT state_abbr,
         lower(regexp_replace(city_name, '\s+(city|town|CDP|village|borough|municipality)$', '', 'i')) AS norm_name
  FROM public.us_cities_scored
)
INSERT INTO public.us_cities_scored (
  city_name, state_abbr, state_name, population, school_district_count,
  public_elementary_enrollment, median_household_income, college_degree_pct,
  cost_of_living_index, regional_median_income,
  csi_national_brand_count_weighted, csi_local_provider_estimate, csi_demand_adjusted_market,
  csi_score, score_csi, csi_saturation_category, csi_confidence, csi_last_updated, csi_brand_detail,
  place_type
)
SELECT
  s.raw_city, s.state_abbr, s.state_name, s.population, s.school_district_count,
  s.public_elementary_enrollment, s.median_household_income, s.college_degree_pct,
  s.cost_of_living_index, s.regional_median_income,
  s.csi_national_brand_count_weighted, s.csi_local_provider_estimate, s.csi_demand_adjusted_market,
  CASE WHEN s.csi_score_raw IS NULL THEN NULL WHEN s.csi_score_raw <= 1 THEN round(s.csi_score_raw*10000)::int ELSE round(s.csi_score_raw)::int END,
  CASE WHEN s.csi_score_raw IS NULL THEN NULL WHEN s.csi_score_raw <= 1 THEN round(s.csi_score_raw*10000)::int ELSE round(s.csi_score_raw)::int END,
  s.csi_saturation_category,
  CASE s.csi_confidence_text WHEN 'high' THEN 0.9 WHEN 'medium' THEN 0.6 WHEN 'low' THEN 0.3 ELSE NULL END,
  s.csi_last_updated,
  CASE WHEN s.csi_brand_detail_text IS NULL OR s.csi_brand_detail_text='' THEN NULL ELSE to_jsonb(s.csi_brand_detail_text) END,
  s.place_type
FROM public._manus_stage_2026_05_21 s
LEFT JOIN existing e ON e.state_abbr = s.state_abbr AND e.norm_name = s.norm_name
WHERE e.state_abbr IS NULL;

-- Backfill place_type for any rows still missing it
UPDATE public.us_cities_scored
SET place_type = 'incorporated_city'
WHERE place_type IS NULL;

-- Clean up staging
DROP TABLE public._manus_stage_2026_05_21;