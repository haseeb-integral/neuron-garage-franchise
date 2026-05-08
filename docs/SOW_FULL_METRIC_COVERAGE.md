# Sam SOW Full Metric Coverage Matrix

This document defines the required City Search scoring metrics from Sam's SOW and maps each metric to a source, signal key, implementation status, and scoring category. The goal is to move City Search from a POC signal set to an auditable full-coverage scoring system.

## Source Legend

- `census`: U.S. Census ACS / Census API
- `bls`: Bureau of Labor Statistics API
- `apify_maps`: Apify Google Maps / Places actor
- `firecrawl`: Firecrawl search and page extraction
- `google_trends`: Google Trends actor or equivalent search-demand source
- `weather`: NOAA / Open-Meteo / weather-history API
- `zillow_col`: Zillow/rent/COL proxy or approved COL source
- `aca`: American Camp Association state regulations page
- `state_edu`: State education / NCES / school datasets
- `manual_or_phase2`: likely cannot be reliably automated without account access, scraping approval, or manual research

## Implementation Rules

1. Every SOW metric must have a `city_market_signals.signal_key` row, even when the current value is missing.
2. Missing metrics should be stored with `value = "Not available yet"`, `source = "not_connected"`, and low confidence, not silently omitted.
3. Every metric should include `source`, `source_url`, `confidence`, and `raw_data` where available.
4. Category scoring should use normalized metric values, not raw counts only.
5. The Source Evidence drawer should show all metrics grouped by the 6 SOW categories.
6. The center card should show only the top 8 prioritized signals, but the drawer/report should be comprehensive.

---

## 1. Demand

| SOW Metric | Proposed signal_key | Source | Current Status | Notes |
|---|---|---|---|---|
| Number of children ages 5–12 | `children_5_12_count` | census | missing exact | Need ACS age-band variables. Current system only uses under-18 proxy. |
| % of population ages 5–12 | `children_5_12_pct` | census | missing exact | Calculate from children_5_12_count / total_population. |
| Number of households with children under 13 | `households_with_children_under_13` | census | missing | Need ACS family/household variable mapping. |
| Median household income | `median_household_income` | census | live but not always surfaced | Already fetched from ACS. Ensure signal row always exists. |
| % households earning $100k+ | `income_100k_plus_pct` | census | live but not always surfaced | Already calculated from ACS income brackets. Ensure visible in full drawer/report. |
| % households earning $150k+ | `income_150k_plus_pct` | census | live but not always surfaced | Already calculated from ACS income brackets. Ensure visible in full drawer/report. |
| Growth rate of young families | `young_family_growth_rate` | census | missing | Requires multi-year ACS comparison, e.g. current ACS vs older ACS. |
| % dual-income households | `dual_income_household_pct` | census | missing | Need ACS employment/family variable mapping. |
| Parent education (% college+) | `education_bachelors_plus_pct` | census | live but not always surfaced | Already calculated from ACS education variables. |
| Summer weather index | `summer_weather_index` | weather | missing | Derived score from average highs and 100F-day frequency. |
| Avg peak summer temperatures | `avg_peak_summer_temperature` | weather | missing | NOAA/Open-Meteo historical climate. |
| Number of 100°+ days | `days_above_100f` | weather | missing | NOAA/Open-Meteo historical weather/climate. |

## 2. Pricing Power

| SOW Metric | Proposed signal_key | Source | Current Status | Notes |
|---|---|---|---|---|
| Average weekly camp tuition in market | `avg_weekly_camp_tuition` | firecrawl/apify_maps | missing | Requires competitor website extraction or pricing pages. |
| Average hourly equivalent camp pricing | `avg_hourly_camp_pricing` | computed | missing | Requires weekly tuition + camp hours/duration. |
| Premium STEM / maker / enrichment camp pricing | `premium_stem_camp_pricing` | firecrawl/apify_maps | missing | Requires extracting prices from STEM/coding camp pages. |
| Private elementary school tuition levels | `private_school_tuition_proxy` | firecrawl/state_edu | missing | May require school websites/private school datasets. |
| Number of private school students | `private_school_student_count` | state_edu | missing | Need state education/private school enrollment source. |
| Childcare / nanny hourly rates | `childcare_nanny_hourly_rate_proxy` | bls/manual_or_phase2 | partial | BLS childcare worker wage is not consumer nanny price but usable as proxy. |
| Household discretionary income estimates | `household_discretionary_income_proxy` | census/computed | missing | Compute from income + COL proxy once COL is available. |

## 3. Competitive Landscape

| SOW Metric | Proposed signal_key | Source | Current Status | Notes |
|---|---|---|---|---|
| Number of summer day camps per 10,000 children | `summer_camps_per_10k_children` | apify_maps + census | partial | Need exact summer camp bucket and exact 5–12 child denominator. |
| Number of STEM / robotics / maker camps | `stem_robotics_maker_camp_count` | apify_maps | partial/live | Current `stem_enrichment_count` is close but should be renamed/expanded. |
| Number of school-based summer camps | `school_based_summer_camp_count` | firecrawl/apify_maps | missing/partial | Need classifier for camps held at schools. |
| Presence of national brands | `national_brand_presence` | apify_maps | missing/partial | Detect names: Galileo, Steve & Kate's, Code Ninjas, iCode, Mathnasium, etc. |
| Google search demand: summer camp [city] | `google_search_demand_summer_camp` | google_trends | missing | Need Trends actor/source. |
| Google search demand: summer day camp in [city] | `google_search_demand_summer_day_camp` | google_trends | missing | Need Trends actor/source. |
| Google search demand: Summer Day Camps [Current Year] | `google_search_demand_summer_day_camps_year` | google_trends | missing | Need Trends actor/source. |
| Waitlist / sold-out signals from competitors | `waitlist_sold_out_signal_count` | firecrawl | missing | Requires page text extraction for waitlist/sold out/unavailable terms. |

## 4. Franchisee Supply

| SOW Metric | Proposed signal_key | Source | Current Status | Notes |
|---|---|---|---|---|
| Number of public elementary teachers | `public_elementary_teacher_count` | state_edu/bls | missing | BLS gives wage, not count at city level. Need state/NCES district source. |
| Number of elementary private / charter / Montessori teachers | `private_charter_montessori_teacher_count` | state_edu/apify_maps | missing | May need school count estimate until exact teacher counts available. |
| Number of elementary schools in market | `elementary_school_count` | apify_maps | live | Current signal exists. |
| Average teacher salary | `teacher_salary_proxy` | bls | partial/live in backend intent | Must ensure signal row is inserted and visible in drawer/report. |
| Cost of living | `cost_of_living_index` | zillow_col | missing | Need source decision. Zillow/rent proxy or other COL source. |
| Summer Income Need Ratio | `summer_income_need_ratio` | computed | missing | Formula: teacher_salary_proxy / cost_of_living_index or market rent/COL proxy. |

## 5. Ease of Operations

| SOW Metric | Proposed signal_key | Source | Current Status | Notes |
|---|---|---|---|---|
| School/church/rec center rental availability | `rental_venue_count` | apify_maps | live/partial | Current signal exists. |
| Typical classroom rental cost per week | `classroom_rental_cost_weekly` | firecrawl/manual_or_phase2 | missing | Hard to automate; use extracted venue pricing where available. |
| Commute times / geographic sprawl | `commute_sprawl_index` | census/maps/manual_or_phase2 | missing | Could start with Census commute time + city area if available. |
| State camp regulations/licensing complexity | `state_camp_regulation_complexity` | aca | missing | Use ACA state regulation source and state-level scoring. |
| Estimated Guide wage rates | `guide_wage_proxy` | bls | partial | BLS recreation/childcare wage proxy. Ensure signal row is inserted. |

## 6. Parent Mindset Indicators

| SOW Metric | Proposed signal_key | Source | Current Status | Notes |
|---|---|---|---|---|
| Homeschool population | `homeschool_population_proxy` | state_edu/census | missing | Source varies by state. May require state education data. |
| Elementary Montessori school density | `montessori_school_density` | apify_maps + census | partial | Current Montessori/premium school count exists; normalize by child population. |
| Children's museum participation | `childrens_museum_signal` | apify_maps/firecrawl | partial | Current place count only. Participation requires attendance data if available. |
| Robotics clubs / maker spaces | `robotics_maker_space_count` | apify_maps/firecrawl | partial | Current STEM enrichment is close but should be split. |
| Library program engagement | `library_children_program_signal` | firecrawl/apify_maps | partial/missing | Need crawl library program pages and engagement proxy. |
| Parenting Facebook group activity | `parenting_facebook_group_activity` | manual_or_phase2 | missing | Facebook access restrictions likely make this non-API for now. |
| Other parent communities (Nextdoor, etc.) | `parent_community_activity_proxy` | manual_or_phase2 | missing | Restricted sources; likely manual/Phase 2. |

---

## Immediate Engineering Work Needed

### Backend

1. Expand `fetch-city-market-data` to insert all SOW metric signal rows.
2. Add exact Census age-band variables for children 5–12.
3. Add missing Census variables for children-households, dual-income households, and multi-year growth.
4. Ensure existing Census/BLS values are inserted as visible `city_market_signals` rows, not only used in scoring.
5. Add weather/climate source for summer heat metrics.
6. Add ACA regulations parser/state-level mapping.
7. Add Google Trends source or skip with explicit `missing` signal rows until actor is selected.
8. Add Firecrawl extraction pass for pricing, waitlist/sold-out, and venue rental evidence.
9. Add normalization fields so counts can be compared across city sizes.

### Database / Data Model

Recommended additions:

- `city_metric_coverage` or expanded `city_market_signals` rows for every SOW metric.
- Add `status` field: `live`, `proxy`, `missing`, `blocked`, `manual`.
- Add `used_in_score` boolean.
- Add `normalized_value` numeric.
- Add `metric_category` text.

### UI

1. Source Evidence drawer should group signals by SOW category.
2. Report modal should use live signals, not hardcoded sample signals.
3. Add coverage status labels: Live, Proxy, Missing, Blocked.
4. Center panel should remain compact and show only top 8 signals.

## Current Honest Status

The current City Search system has a working live API pipeline, but it does not yet fully cover Sam's SOW metrics. It should be treated as an integration proof until the metric registry above is implemented and populated.
