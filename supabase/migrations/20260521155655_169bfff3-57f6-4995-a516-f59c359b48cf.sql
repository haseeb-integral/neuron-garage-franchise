-- ============================================================
-- PART A: Merge 8 leftover duplicate pairs
-- Each pair: canonical (Census) row gets nullable Manus values via COALESCE; Manus row is deleted.
-- ============================================================

WITH pairs AS (
  SELECT
    canon.id  AS canon_id,
    suffix.id AS suffix_id
  FROM us_cities_scored canon
  JOIN us_cities_scored suffix ON suffix.state_abbr = canon.state_abbr
  WHERE (canon.city_name, canon.state_abbr, suffix.city_name) IN (
    ('Indianapolis','IN','Indianapolis city (balance)'),
    ('Nashville','TN','Nashville-Davidson metropolitan government (balance)'),
    ('Louisville','KY','Louisville/Jefferson County metro government (balance)'),
    ('Lexington','KY','Lexington-Fayette urban county'),
    ('Macon','GA','Macon-Bibb County'),
    ('Augusta','GA','Augusta-Richmond County consolidated government (balance)'),
    ('Athens','GA','Athens-Clarke County unified government (balance)'),
    ('Boise','ID','Boise City')
  )
)
UPDATE us_cities_scored c SET
  csi_score                          = COALESCE(c.csi_score, s.csi_score),
  csi_brand_detail                   = COALESCE(c.csi_brand_detail, s.csi_brand_detail),
  csi_last_updated                   = COALESCE(c.csi_last_updated, s.csi_last_updated),
  csi_confidence                     = COALESCE(c.csi_confidence, s.csi_confidence),
  csi_saturation_category            = COALESCE(c.csi_saturation_category, s.csi_saturation_category),
  csi_demand_adjusted_market         = COALESCE(c.csi_demand_adjusted_market, s.csi_demand_adjusted_market),
  csi_local_provider_estimate        = COALESCE(c.csi_local_provider_estimate, s.csi_local_provider_estimate),
  csi_national_brand_count_weighted  = COALESCE(c.csi_national_brand_count_weighted, s.csi_national_brand_count_weighted),
  weather_last_updated               = COALESCE(c.weather_last_updated, s.weather_last_updated),
  summer_precip_days                 = COALESCE(c.summer_precip_days, s.summer_precip_days),
  days_above_90f                     = COALESCE(c.days_above_90f, s.days_above_90f),
  avg_peak_summer_temperature        = COALESCE(c.avg_peak_summer_temperature, s.avg_peak_summer_temperature),
  summer_weather_index               = COALESCE(c.summer_weather_index, s.summer_weather_index),
  composite_score_default            = COALESCE(c.composite_score_default, s.composite_score_default),
  score_tam_teachers                 = COALESCE(c.score_tam_teachers, s.score_tam_teachers),
  score_csi                          = COALESCE(c.score_csi, s.score_csi),
  score_demand                       = COALESCE(c.score_demand, s.score_demand),
  camp_waitlist_signals              = COALESCE(c.camp_waitlist_signals, s.camp_waitlist_signals),
  school_hosted_camp_count           = COALESCE(c.school_hosted_camp_count, s.school_hosted_camp_count),
  avg_camp_price_per_hour            = COALESCE(c.avg_camp_price_per_hour, s.avg_camp_price_per_hour),
  summer_camp_count                  = COALESCE(c.summer_camp_count, s.summer_camp_count),
  charter_elementary_count           = COALESCE(c.charter_elementary_count, s.charter_elementary_count),
  private_elementary_count           = COALESCE(c.private_elementary_count, s.private_elementary_count),
  public_elementary_count            = COALESCE(c.public_elementary_count, s.public_elementary_count),
  public_elementary_enrollment       = COALESCE(c.public_elementary_enrollment, s.public_elementary_enrollment),
  public_elementary_teacher_count    = COALESCE(c.public_elementary_teacher_count, s.public_elementary_teacher_count),
  public_school_count                = COALESCE(c.public_school_count, s.public_school_count),
  public_school_enrollment           = COALESCE(c.public_school_enrollment, s.public_school_enrollment),
  school_district_count              = COALESCE(c.school_district_count, s.school_district_count),
  avg_elementary_teacher_salary_usd  = COALESCE(c.avg_elementary_teacher_salary_usd, s.avg_elementary_teacher_salary_usd),
  cost_of_living_index               = COALESCE(c.cost_of_living_index, s.cost_of_living_index),
  col_salary_index                   = COALESCE(c.col_salary_index, s.col_salary_index),
  private_charter_share_pct          = COALESCE(c.private_charter_share_pct, s.private_charter_share_pct),
  regional_median_income             = COALESCE(c.regional_median_income, s.regional_median_income),
  median_household_income            = COALESCE(c.median_household_income, s.median_household_income),
  labor_force_participation          = COALESCE(c.labor_force_participation, s.labor_force_participation),
  stem_job_concentration             = COALESCE(c.stem_job_concentration, s.stem_job_concentration),
  population_density                 = COALESCE(c.population_density, s.population_density),
  college_degree_pct                 = COALESCE(c.college_degree_pct, s.college_degree_pct),
  dual_working_families_pct          = COALESCE(c.dual_working_families_pct, s.dual_working_families_pct),
  children_5_12                      = COALESCE(c.children_5_12, s.children_5_12),
  census_population_2020             = COALESCE(c.census_population_2020, s.census_population_2020),
  place_type                         = COALESCE(c.place_type, s.place_type),
  scored_at                          = COALESCE(c.scored_at, s.scored_at),
  firecrawl_last_updated             = COALESCE(c.firecrawl_last_updated, s.firecrawl_last_updated),
  apify_last_updated                 = COALESCE(c.apify_last_updated, s.apify_last_updated),
  greatschools_last_updated          = COALESCE(c.greatschools_last_updated, s.greatschools_last_updated),
  nces_last_updated                  = COALESCE(c.nces_last_updated, s.nces_last_updated),
  fred_last_updated                  = COALESCE(c.fred_last_updated, s.fred_last_updated),
  bea_last_updated                   = COALESCE(c.bea_last_updated, s.bea_last_updated),
  bls_last_updated                   = COALESCE(c.bls_last_updated, s.bls_last_updated),
  census_last_updated                = COALESCE(c.census_last_updated, s.census_last_updated),
  metro_counties                     = COALESCE(c.metro_counties, s.metro_counties),
  updated_at                         = now()
FROM us_cities_scored s, pairs
WHERE c.id = pairs.canon_id AND s.id = pairs.suffix_id;

DELETE FROM us_cities_scored
WHERE id IN (
  SELECT suffix.id
  FROM us_cities_scored suffix
  WHERE (suffix.city_name, suffix.state_abbr) IN (
    ('Indianapolis city (balance)','IN'),
    ('Nashville-Davidson metropolitan government (balance)','TN'),
    ('Louisville/Jefferson County metro government (balance)','KY'),
    ('Lexington-Fayette urban county','KY'),
    ('Macon-Bibb County','GA'),
    ('Augusta-Richmond County consolidated government (balance)','GA'),
    ('Athens-Clarke County unified government (balance)','GA'),
    ('Boise City','ID')
  )
);

-- ============================================================
-- PART B: Pure renames (no canonical sibling exists)
-- ============================================================

UPDATE us_cities_scored SET city_name='Milford',  updated_at=now() WHERE city_name='Milford city (balance)' AND state_abbr='CT';
UPDATE us_cities_scored SET city_name='Ventura',  updated_at=now() WHERE city_name='San Buenaventura (Ventura)' AND state_abbr='CA';

-- ============================================================
-- PART C1: County backfill via us_cities_geo (direct match)
-- ============================================================

UPDATE us_cities_scored s
SET county_name = g.county_name, updated_at = now()
FROM us_cities_geo g
WHERE (s.county_name IS NULL OR s.county_name='')
  AND g.state_id = s.state_abbr
  AND LOWER(g.city) = LOWER(s.city_name)
  AND g.county_name IS NOT NULL AND g.county_name <> '';

-- ============================================================
-- PART C2: Manual county assignments for 5 rows not in us_cities_geo
-- (Sources: US Census Bureau 2024 Gazetteer Places file)
-- ============================================================

UPDATE us_cities_scored SET county_name='Nassau',    updated_at=now() WHERE city_name='Hempstead'     AND state_abbr='NY' AND (county_name IS NULL OR county_name='');
UPDATE us_cities_scored SET county_name='Essex',     updated_at=now() WHERE city_name='Methuen'       AND state_abbr='MA' AND (county_name IS NULL OR county_name='');
UPDATE us_cities_scored SET county_name='Norfolk',   updated_at=now() WHERE city_name='Weymouth Town' AND state_abbr='MA' AND (county_name IS NULL OR county_name='');
UPDATE us_cities_scored SET county_name='New Haven', updated_at=now() WHERE city_name='Milford'       AND state_abbr='CT' AND (county_name IS NULL OR county_name='');
UPDATE us_cities_scored SET county_name='Honolulu',  updated_at=now() WHERE city_name='Urban Honolulu' AND state_abbr='HI' AND (county_name IS NULL OR county_name='');
UPDATE us_cities_scored SET county_name='Ventura',   updated_at=now() WHERE city_name='Ventura'       AND state_abbr='CA' AND (county_name IS NULL OR county_name='');

-- ============================================================
-- PART C3: Metro backfill from sibling rows (same state + county already has metro_area)
-- ============================================================

UPDATE us_cities_scored s
SET metro_area = sib.metro_area, updated_at = now()
FROM (
  SELECT state_abbr, county_name, MAX(metro_area) AS metro_area
  FROM us_cities_scored
  WHERE metro_area IS NOT NULL AND metro_area <> ''
  GROUP BY state_abbr, county_name
) sib
WHERE (s.metro_area IS NULL OR s.metro_area='')
  AND s.county_name IS NOT NULL AND s.county_name <> ''
  AND sib.state_abbr = s.state_abbr
  AND sib.county_name = s.county_name;