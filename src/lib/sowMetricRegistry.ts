// Frontend mirror of supabase/functions/_shared/scoring.ts SOW_METRIC_REGISTRY.
// Duplicated intentionally so the frontend doesn't bundle edge-function code.
// Keep in sync if the backend registry changes.

import type { CategoryKey } from "@/stores/cityScoringStore";

export type MetricStatus = "live" | "proxy" | "missing" | "blocked";
export type RegistryCategory =
  | "demand"
  | "pricing_power"
  | "competitive_landscape"
  | "franchiseeSupply_legacy" // not used; placeholder to keep type unions tidy
  | "franchisee_supply"
  | "ease_of_operations"
  | "parent_mindset";

export type SowMetricEntry = {
  key: string;
  category: Exclude<RegistryCategory, "franchiseeSupply_legacy">;
  label: string;
  description: string;
  enabled: boolean;
  weight_within_category: number;
  status: MetricStatus;
  /** Human-readable data source shown in the UI under each metric row. */
  source: string;
};

export const CATEGORY_KEY_MAP: Record<Exclude<RegistryCategory, "franchiseeSupply_legacy">, CategoryKey> = {
  demand: "demand",
  pricing_power: "pricingPower",
  competitive_landscape: "competitiveLandscape",
  franchisee_supply: "franchiseeSupply",
  ease_of_operations: "easeOfOperations",
  parent_mindset: "parentMindset",
};

export const CATEGORY_PURPOSE: Record<CategoryKey, string> = {
  demand: "Are there enough affluent families with the right-aged kids in this city?",
  pricingPower: "Will families pay premium prices for camp, and how much?",
  competitiveLandscape: "How crowded is the camp market — and how much room is there to win?",
  franchiseeSupply: "Are there enough teachers here to recruit as franchise operators?",
  easeOfOperations: "How hard will it be to run camps here — venues, regulations, sprawl, wages?",
  parentMindset: "Do parents in this city actively invest in enrichment, STEM, and learning?",
};

export const SOW_METRIC_REGISTRY: readonly SowMetricEntry[] = [
  // ─────────── DEMAND ───────────
  { key: "children_5_12_count", category: "demand", label: "Children Ages 5–12",
    description: "Raw count of kids in the camp's target age range. Bigger pool = more potential customers.",
    enabled: true,  weight_within_category: 0.13, status: "live",
    source: "U.S. Census Bureau API — ACS 5-yr (vars B01001_004/005/028/029)" },
  { key: "children_5_12_pct", category: "demand", label: "% Population Ages 5–12",
    description: "Share of the population that's school-aged. High % means a family-oriented town vs. retirees or singles.",
    enabled: true,  weight_within_category: 0.08, status: "live",
    source: "U.S. Census Bureau API — ACS 5-yr (B01001 ÷ B01003_001)" },
  { key: "households_with_children_under_13", category: "demand", label: "Households With Children Under 13",
    description: "Number of households actively raising young kids — your direct buyer pool.",
    enabled: true,  weight_within_category: 0.08, status: "proxy",
    source: "Derived from U.S. Census ACS (B11005 + B23007)" },
  { key: "median_household_income", category: "demand", label: "Median Household Income",
    description: "Typical family earnings. Above ~$90k starts to support discretionary camp spend.",
    enabled: true,  weight_within_category: 0.11, status: "live",
    source: "U.S. Census Bureau API — ACS 5-yr (B19013_001)" },
  { key: "income_100k_plus_pct", category: "demand", label: "Households Earning $100k+",
    description: "Share of households comfortably able to afford weekly camp tuition.",
    enabled: true,  weight_within_category: 0.08, status: "live",
    source: "U.S. Census Bureau API — ACS 5-yr (B19001 brackets)" },
  { key: "income_150k_plus_pct", category: "demand", label: "Households Earning $150k+",
    description: "Share of high-income households — the premium segment for multi-week enrollments.",
    enabled: true,  weight_within_category: 0.07, status: "live",
    source: "U.S. Census Bureau API — ACS 5-yr (B19001 brackets)" },
  { key: "young_family_growth_rate", category: "demand", label: "Growth Rate of Young Families",
    description: "Is the family population growing or shrinking year-over-year? Growth = expanding demand.",
    enabled: true,  weight_within_category: 0.11, status: "live",
    source: "U.S. Census ACS — 2017 vs 2022 vintage delta (B11005_002)" },
  { key: "dual_income_household_pct", category: "demand", label: "% Dual-Income Households",
    description: "Two working parents need summer childcare more urgently than single-earner households.",
    enabled: true,  weight_within_category: 0.10, status: "live",
    source: "U.S. Census Bureau API — ACS 5-yr (B23007_003/004)" },
  { key: "education_bachelors_plus_pct", category: "demand", label: "Parent Education / Bachelor's+",
    description: "Share of adults with a college degree. Educated parents over-index on enrichment spending.",
    enabled: true,  weight_within_category: 0.09, status: "live",
    source: "U.S. Census Bureau API — ACS 5-yr (B15003_022–025)" },
  { key: "summer_weather_index", category: "demand", label: "Summer Weather Index",
    description: "How camp-friendly is the local summer? Mild weather supports outdoor programming.",
    enabled: true,  weight_within_category: 0.08, status: "live",
    source: "Open-Meteo Historical Weather API (Jun–Aug averages)" },
  { key: "avg_peak_summer_temperature", category: "demand", label: "Avg Peak Summer Temperature",
    description: "Average July/August high. Extreme heat pushes parents toward indoor or AC-required camps.",
    enabled: true,  weight_within_category: 0.04, status: "live",
    source: "Open-Meteo Historical Weather API (Jul–Aug daily max)" },
  { key: "days_above_90f", category: "demand", label: "Number of 90°+ Days",
    description: "Count of hot days (≥90°F). High counts push parents toward indoor / AC-required camps.",
    enabled: true,  weight_within_category: 0.03, status: "live",
    source: "Open-Meteo Historical Weather API (days ≥32.2°C)" },

  // ─────────── PRICING POWER ───────────
  { key: "avg_weekly_camp_tuition", category: "pricing_power", label: "Average Weekly Camp Tuition",
    description: "Going rate competitors charge per week. Sets the ceiling and floor for your pricing.",
    enabled: true,  weight_within_category: 0.20, status: "live",
    source: "Apify Google Maps scrape + Firecrawl camp-site pricing" },
  { key: "avg_hourly_camp_pricing", category: "pricing_power", label: "Average Hourly Camp Pricing",
    description: "Hourly equivalent of local camp rates. Useful for comparing partial-day or after-school programs.",
    enabled: true,  weight_within_category: 0.10, status: "live",
    source: "Derived from Apify / Firecrawl tuition scrape" },
  { key: "premium_stem_camp_pricing", category: "pricing_power", label: "Premium STEM / Maker / Enrichment Pricing",
    description: "What the top STEM/maker camps charge. Indicates if the market accepts premium positioning.",
    enabled: true,  weight_within_category: 0.15, status: "live",
    source: "Apify Google Maps (STEM/maker camps) + Firecrawl" },
  { key: "private_school_tuition_proxy", category: "pricing_power", label: "Private Elementary School Tuition",
    description: "Local private K-5 tuition. Proxy for what families already pay for premium kids' programs.",
    enabled: false, weight_within_category: 0,    status: "missing",
    source: "Not yet wired — Firecrawl scrape of Private School Review pending" },
  { key: "private_school_student_count", category: "pricing_power", label: "Private School Students",
    description: "How many kids attend private school — a built-in segment willing to pay for enrichment.",
    enabled: false, weight_within_category: 0,    status: "missing",
    source: "Not yet wired — NCES Private School Universe Survey pending" },
  { key: "childcare_nanny_hourly_rate_proxy", category: "pricing_power", label: "Childcare / Nanny Hourly Rate",
    description: "What local families already pay for childcare. Anchors what they'll comfortably pay for camp.",
    enabled: true,  weight_within_category: 0.35, status: "live",
    source: "BLS OEWS API — Childcare Workers (SOC 39-9011), metro-level" },
  { key: "household_discretionary_income_proxy", category: "pricing_power", label: "Household Discretionary Income",
    description: "Income left after essentials. Larger discretionary pool = more room for premium camp spend.",
    enabled: true,  weight_within_category: 0.20, status: "proxy",
    source: "Derived: Census ACS median income ÷ BEA Regional Price Parity" },

  // ─────────── COMPETITIVE LANDSCAPE ───────────
  { key: "summer_camps_per_10k_children", category: "competitive_landscape", label: "Summer Camps per 10k Children",
    description: "Camp density relative to kid population. Lower = under-served market with white space.",
    enabled: true,  weight_within_category: 0.22, status: "proxy",
    source: "Apify Google Maps camp count ÷ Census ACS children 5–12" },
  { key: "stem_robotics_maker_camp_count", category: "competitive_landscape", label: "STEM / Robotics / Maker Camps",
    description: "Count of direct competitors in the STEM camp niche. High count = saturated; low = open lane.",
    enabled: true,  weight_within_category: 0.16, status: "proxy",
    source: "Apify Google Maps (keyword: STEM/robotics/maker camps)" },
  { key: "school_based_summer_camp_count", category: "competitive_landscape", label: "School-Based Summer Camps",
    description: "Camps run by local school districts. They're cheap competition — a high count squeezes pricing.",
    enabled: true,  weight_within_category: 0.10, status: "live",
    source: "NCES Common Core of Data via Urban Institute API" },
  { key: "national_brand_presence", category: "competitive_landscape", label: "National Brand Presence",
    description: "Are big brands (Galileo, Steve & Kate's, etc.) already here? Validates demand but raises competition.",
    enabled: true,  weight_within_category: 0.11, status: "live",
    source: "Apify Google Maps + Firecrawl brand-location match" },
  { key: "google_search_demand_summer_camp", category: "competitive_landscape", label: "Search Demand: 'summer camp [city]'",
    description: "How often parents google for camps in this city. Higher = more in-market intent to capture.",
    enabled: true,  weight_within_category: 0.15, status: "live",
    source: "Estimated from Census population × national search benchmark (no Google Trends key)" },
  { key: "google_search_demand_summer_day_camp", category: "competitive_landscape", label: "Search Demand: 'summer day camp'",
    description: "Search volume specifically for day camps (your core product). Direct buyer-intent signal.",
    enabled: true,  weight_within_category: 0.12, status: "live",
    source: "Estimated from Census population × national search benchmark (no Google Trends key)" },
  { key: "google_search_demand_summer_day_camps_year", category: "competitive_landscape", label: "Search Demand: 'Day Camps [Year]'",
    description: "Dated camp searches show parents in active planning mode for the upcoming summer.",
    enabled: false, weight_within_category: 0,    status: "missing",
    source: "Not yet wired — requires Google Trends or SEMrush API" },
  { key: "waitlist_sold_out_signal_count", category: "competitive_landscape", label: "Waitlist / Sold-Out Signals",
    description: "Competitor camps that sell out or run waitlists. Strong evidence of unmet demand.",
    enabled: true,  weight_within_category: 0.14, status: "live",
    source: "Firecrawl scrape of competitor camp registration pages" },

  // ─────────── TAM TEACHERS (5-metric lock — Brett+Haseeb 2026-05-21) ───────────
  { key: "public_elementary_school_count", category: "franchisee_supply", label: "Public Elementary Schools",
    description: "Count of K-5 public schools in the city. Direct proxy for the size of the local elementary-teacher recruiting pool.",
    enabled: true,  weight_within_category: 0.20, status: "live",
    source: "NCES Common Core of Data — elementary-serving public schools rolled up to city" },
  { key: "public_elementary_teacher_count", category: "franchisee_supply", label: "Public Elementary Teachers (NCES FTE)",
    description: "Sum of full-time-equivalent teachers across all elementary-serving public schools in the city. Real NCES values — not estimated.",
    enabled: true,  weight_within_category: 0.25, status: "live",
    source: "NCES CCD teachers_fte field, aggregated from public_schools table" },
  { key: "private_charter_school_count", category: "franchisee_supply", label: "Private + Charter Elementary Schools",
    description: "Sum of private + charter elementary schools. These teachers are often more entrepreneurial and open to franchise ownership. Row is hidden when both counts are null.",
    enabled: true,  weight_within_category: 0.15, status: "live",
    source: "Manus AI batch — NCES Private School Universe + NCES CCD charter flag" },
  { key: "public_elementary_enrollment", category: "franchisee_supply", label: "Public Elementary Enrollment",
    description: "Total K-5 students enrolled in public schools city-wide. Cross-checks teacher count and indicates market scale.",
    enabled: true,  weight_within_category: 0.15, status: "live",
    source: "NCES Common Core of Data — enrollment field, aggregated to city" },
  { key: "col_salary_index", category: "franchisee_supply", label: "Teacher Salary × Cost of Living Index",
    description: "Average elementary teacher salary multiplied by local cost-of-living index. Lower value = stronger pull toward summer income and franchise ownership. Falls back to COL Index alone until Manus delivers BLS salary data.",
    enabled: true,  weight_within_category: 0.25, status: "proxy",
    source: "Composite: BLS OEWS SOC 25-2021 (Manus batch, pending) × BEA Regional Price Parity" },

  // ─────────── EASE OF OPERATIONS ───────────
  { key: "rental_venue_count", category: "ease_of_operations", label: "Rental Venues (Schools / Churches / Rec)",
    description: "Available spaces to rent for camp sessions. More venues = easier expansion and lower real-estate risk.",
    enabled: true,  weight_within_category: 0.45, status: "proxy",
    source: "NCES CCD schools + Apify Google Maps (churches, rec centers)" },
  { key: "classroom_rental_cost_weekly", category: "ease_of_operations", label: "Classroom Rental Cost / Week",
    description: "Typical weekly rental rate for a classroom. Directly hits franchisee margin.",
    enabled: false, weight_within_category: 0,    status: "missing",
    source: "Not yet wired — no public source; requires manual outreach" },
  { key: "commute_sprawl_index", category: "ease_of_operations", label: "Commute Times / Geographic Sprawl",
    description: "How spread out the metro is. Sprawl forces multi-location operations and complicates logistics.",
    enabled: true,  weight_within_category: 0.20, status: "live",
    source: "U.S. Census Bureau API — ACS 5-yr commute time (B08303)" },
  { key: "state_camp_regulation_complexity", category: "ease_of_operations", label: "State Camp Regulation Complexity",
    description: "How heavy state licensing/inspections are. Heavy regulation = slower launches and higher overhead.",
    enabled: false, weight_within_category: 0,    status: "missing",
    source: "Not yet wired — requires manual coding of state camp statutes" },
  { key: "guide_wage_proxy", category: "ease_of_operations", label: "Estimated Guide Wage",
    description: "Local hourly wage for camp counselors / 'Guides'. Major recurring labor cost for the franchisee.",
    enabled: true,  weight_within_category: 0.35, status: "live",
    source: "BLS OEWS API — Recreation Workers (SOC 39-9032)" },

  // ─────────── PARENT MINDSET ───────────
  { key: "homeschool_population_proxy", category: "parent_mindset", label: "Homeschool Population Proxy",
    description: "Size of the local homeschool community. They're heavy users of enrichment programs year-round.",
    enabled: false, weight_within_category: 0,    status: "missing",
    source: "Not yet wired — state DOE homeschool registrations vary by state" },
  { key: "montessori_school_density", category: "parent_mindset", label: "Elementary Montessori School Density",
    description: "Number of Montessori schools nearby. Strong indicator of parents who value experiential learning.",
    enabled: true,  weight_within_category: 0.40, status: "proxy",
    source: "NCES Private School Universe (name filter) + Apify Google Maps" },
  { key: "childrens_museum_signal", category: "parent_mindset", label: "Children's Museum Signal",
    description: "Presence of a children's museum signals a community that invests in kid-centered learning experiences.",
    enabled: true,  weight_within_category: 0.20, status: "proxy",
    source: "Apify Google Maps (keyword: children's museum)" },
  { key: "robotics_maker_space_count", category: "parent_mindset", label: "Robotics Clubs / Maker Spaces",
    description: "Local robotics clubs and maker spaces — direct evidence of demand for STEM enrichment.",
    enabled: true,  weight_within_category: 0.40, status: "proxy",
    source: "Apify Google Maps (keyword: robotics club, maker space)" },
  { key: "library_children_program_signal", category: "parent_mindset", label: "Library Program Engagement",
    description: "Attendance at library kids' programs. High engagement = parents who actively seek learning activities.",
    enabled: false, weight_within_category: 0,    status: "missing",
    source: "Not yet wired — IMLS Public Libraries Survey pending" },
  { key: "parenting_facebook_group_activity", category: "parent_mindset", label: "Parenting Facebook Group Activity",
    description: "Activity in local parenting groups. Strong signal of an engaged parent community for word-of-mouth.",
    enabled: false, weight_within_category: 0,    status: "blocked",
    source: "Blocked — Facebook API does not expose group activity" },
  { key: "parent_community_activity_proxy", category: "parent_mindset", label: "Other Parent Communities Activity",
    description: "Activity in PTAs, NextDoor, neighborhood groups — broader community engagement signal.",
    enabled: false, weight_within_category: 0,    status: "blocked",
    source: "Blocked — NextDoor / PTA data not publicly accessible" },
];

export const METRICS_BY_CATEGORY: Record<CategoryKey, SowMetricEntry[]> = (() => {
  const out: Record<CategoryKey, SowMetricEntry[]> = {
    demand: [], pricingPower: [], competitiveLandscape: [],
    franchiseeSupply: [], easeOfOperations: [], parentMindset: [],
  };
  for (const m of SOW_METRIC_REGISTRY) out[CATEGORY_KEY_MAP[m.category]].push(m);
  return out;
})();

export const DEFAULT_SUB_WEIGHTS: Record<CategoryKey, Record<string, number>> = (() => {
  const out: Record<CategoryKey, Record<string, number>> = {
    demand: {}, pricingPower: {}, competitiveLandscape: {},
    franchiseeSupply: {}, easeOfOperations: {}, parentMindset: {},
  };
  for (const m of SOW_METRIC_REGISTRY) {
    out[CATEGORY_KEY_MAP[m.category]][m.key] = Math.round(m.weight_within_category * 100);
  }
  return out;
})();
