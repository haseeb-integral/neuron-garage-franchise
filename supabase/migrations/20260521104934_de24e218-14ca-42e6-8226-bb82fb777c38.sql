CREATE TABLE IF NOT EXISTS public._manus_stage_2026_05_21 (
  norm_name text,
  state_abbr text,
  raw_city text,
  state_name text,
  population int,
  school_district_count int,
  public_elementary_enrollment int,
  median_household_income numeric,
  college_degree_pct numeric,
  cost_of_living_index numeric,
  regional_median_income numeric,
  csi_national_brand_count_weighted numeric,
  csi_local_provider_estimate numeric,
  csi_demand_adjusted_market numeric,
  csi_score_raw numeric,
  csi_saturation_category text,
  csi_confidence_text text,
  csi_last_updated timestamptz,
  csi_brand_detail_text text,
  place_type text
);
ALTER TABLE public._manus_stage_2026_05_21 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stage authenticated all" ON public._manus_stage_2026_05_21 FOR ALL TO authenticated USING (true) WITH CHECK (true);