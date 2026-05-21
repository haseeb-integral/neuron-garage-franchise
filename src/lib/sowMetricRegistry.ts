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
  // ─────────── DEMAND (4-metric lock — Brett+Haseeb 2026-05-21) ───────────
  // Locked to 4 Census ACS sub-metrics. Default sub-weights 30/25/20/25.
  // Ranges in sowNormalize.ts mirror real p5/p95 across 935 scored cities.
  { key: "children_5_12_count", category: "demand", label: "Children Ages 5–12",
    description: "Raw count of kids in the camp's target age range. Bigger pool = more potential customers.",
    enabled: true,  weight_within_category: 0.30, status: "live",
    source: "U.S. Census Bureau API — ACS 5-yr (vars B01001_004/005/028/029)" },
  { key: "median_household_income", category: "demand", label: "Median Household Income",
    description: "Typical family earnings. Above ~$90k starts to support discretionary camp spend.",
    enabled: true,  weight_within_category: 0.25, status: "live",
    source: "U.S. Census Bureau API — ACS 5-yr (B19013_001)" },
  { key: "dual_income_household_pct", category: "demand", label: "% Dual-Income Households",
    description: "Two working parents need summer childcare more urgently than single-earner households.",
    enabled: true,  weight_within_category: 0.20, status: "live",
    source: "U.S. Census Bureau API — ACS 5-yr (B23007_003/004)" },
  { key: "education_bachelors_plus_pct", category: "demand", label: "Parent Education / Bachelor's+",
    description: "Share of adults with a college degree. Educated parents over-index on enrichment spending.",
    enabled: true,  weight_within_category: 0.25, status: "live",
    source: "U.S. Census Bureau API — ACS 5-yr (B15003_022–025)" },

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

  // ─────────── CSI (3-metric lock — Brett+Haseeb 2026-05-21) ───────────
  // CSI inputs from Brett's 2026-05-21 Manus upload (csi_* columns on
  // us_cities_scored). Default sub-weights 34 / 33 / 33. CSI is SATURATION
  // (higher = more crowded = worse opportunity). Sub-metrics are normalized
  // on the OPPORTUNITY axis (NB and LCE inverted in sowNormalize.ts, DAM not
  // inverted) so the recomputed category score reads high = good, matching
  // Demand and TAM. Raw csi_score (saturation) is shown for reference.
  { key: "csi_national_brand_supply", category: "competitive_landscape", label: "National Brand Supply (weighted count)",
    description: "Weighted count of national camp/enrichment brand locations in the city. Higher = more entrenched competition = worse opportunity.",
    enabled: true,  weight_within_category: 0.34, status: "live",
    source: "Manus 2026-05-21 batch — national brand scrape, weighted by brand strength" },
  { key: "csi_local_camp_estimate", category: "competitive_landscape", label: "Local Camp Supply (estimated)",
    description: "Brett's estimated count of local independent camp providers. Higher = more crowded local market = worse opportunity.",
    enabled: true,  weight_within_category: 0.33, status: "proxy",
    source: "Manus 2026-05-21 batch — local provider estimate (stored value, not enrollment × 0.15)" },
  { key: "csi_demand_adjusted_market", category: "competitive_landscape", label: "Demand-Adjusted Market (DAM)",
    description: "Elementary enrollment scaled by household income vs $65k baseline. Higher = bigger addressable market = better opportunity.",
    enabled: true,  weight_within_category: 0.33, status: "live",
    source: "Derived: public_elementary_enrollment × (median_household_income / 65,000)" },

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
