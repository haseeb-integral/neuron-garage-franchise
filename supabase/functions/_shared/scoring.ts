// Shared scoring module for City Search.
//
// Phase A: holds the CURRENT production scoring formula, extracted verbatim
// from fetch-city-market-data/index.ts. Output must remain bit-for-bit
// identical to the previous inline implementation.
//
// Phase B: adds a typed SOW metric registry. The registry is consulted by
// fetch-city-market-data-sow ONLY to set raw_data.used_in_score honestly.
// It is NOT yet used to compute category scores, composite, or tier.

export type MetricCategory =
  | "demand"
  | "pricing_power"
  | "competitive_landscape"
  | "franchisee_supply"
  | "ease_of_operations"
  | "parent_mindset";

export type MetricStatus = "live" | "proxy" | "missing" | "blocked" | "manual";

// ---------- Phase A: current production scoring ----------

export function clampScore(n: number, lo = 40, hi = 98): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

export type CensusScoringInput = {
  total_population: number | null;
  median_household_income: number | null;
  children_pct: number | null;
  bachelors_plus_pct: number | null;
  income_100k_plus_pct: number | null;
  income_150k_plus_pct: number | null;
} | null;

export type BlsScoringInput = {
  teacher_mean_wage: number | null;
  childcare_mean_wage: number | null;
  recreation_mean_wage: number | null;
} | null;

export type CategoryScoreInputs = {
  elementary: number;
  private_: number;
  preschool: number;
  competitors: number;
  stem: number;
  rentals: number;
  parent: number;
  firecrawl: number;
  census: CensusScoringInput;
  bls: BlsScoringInput;
};

export type CategoryScores = {
  demand: number;
  pricing_power: number;
  competitive_landscape: number;
  franchisee_supply: number;
  ease_of_operations: number;
  parent_mindset: number;
};

export const CATEGORY_WEIGHTS: Record<keyof CategoryScores, number> = {
  demand: 0.25,
  pricing_power: 0.20,
  competitive_landscape: 0.20,
  franchisee_supply: 0.15,
  ease_of_operations: 0.10,
  parent_mindset: 0.10,
};

export function calculateCurrentCategoryScores(b: CategoryScoreInputs): CategoryScores {
  const c = b.census;
  // Census-driven boosts (bounded contributions)
  let demandBoost = 0;
  if (c?.total_population) demandBoost += Math.min(15, Math.log10(Math.max(1, c.total_population)) * 2.5);
  if (c?.children_pct) demandBoost += Math.min(10, (c.children_pct - 18) * 0.8);
  let priceBoost = 0;
  if (c?.median_household_income) priceBoost += Math.min(20, (c.median_household_income - 60000) / 4000);
  if (c?.income_100k_plus_pct) priceBoost += Math.min(10, (c.income_100k_plus_pct - 25) * 0.4);
  if (c?.income_150k_plus_pct) priceBoost += Math.min(8, (c.income_150k_plus_pct - 10) * 0.5);
  let mindsetBoost = 0;
  if (c?.bachelors_plus_pct) mindsetBoost += Math.min(20, (c.bachelors_plus_pct - 30) * 0.6);
  if (c?.children_pct) mindsetBoost += Math.min(6, (c.children_pct - 18) * 0.4);

  // BLS modest adjustments (small, bounded; never dominate)
  let supplyAdj = 0;
  if (b.bls?.teacher_mean_wage) supplyAdj += Math.max(-6, Math.min(6, (65000 - b.bls.teacher_mean_wage) / 4000));
  let easeAdj = 0;
  const wageProxy = b.bls?.recreation_mean_wage ?? b.bls?.childcare_mean_wage ?? null;
  if (wageProxy) easeAdj += Math.max(-5, Math.min(5, (32000 - wageProxy) / 3000));

  return {
    demand: clampScore(50 + b.elementary * 3 + b.preschool * 1.5 + b.firecrawl * 1 + demandBoost),
    pricing_power: clampScore(45 + b.private_ * 4 + b.parent * 1 + priceBoost),
    competitive_landscape: clampScore(95 - b.competitors * 3 - b.stem * 1.5),
    franchisee_supply: clampScore(55 + b.elementary * 3 + b.private_ * 2 + supplyAdj),
    ease_of_operations: clampScore(55 + b.rentals * 4 + easeAdj),
    parent_mindset: clampScore(50 + b.parent * 3 + b.private_ * 1.5 + b.firecrawl * 0.5 + mindsetBoost),
  };
}

export function calculateCompositeScore(cat: CategoryScores): number {
  return Math.round(
    cat.demand * CATEGORY_WEIGHTS.demand +
      cat.pricing_power * CATEGORY_WEIGHTS.pricing_power +
      cat.competitive_landscape * CATEGORY_WEIGHTS.competitive_landscape +
      cat.franchisee_supply * CATEGORY_WEIGHTS.franchisee_supply +
      cat.ease_of_operations * CATEGORY_WEIGHTS.ease_of_operations +
      cat.parent_mindset * CATEGORY_WEIGHTS.parent_mindset,
  );
}

export function tierFromComposite(score: number): "A" | "B" | "C" | "D" {
  if (score >= 85) return "A";
  if (score >= 75) return "B";
  if (score >= 65) return "C";
  return "D";
}

// ---------- Phase B: SOW metric registry ----------

export type SowMetricEntry = {
  key: string;
  category: MetricCategory;
  label: string;
  enabled: boolean;            // intended-to-count in future registry-driven score
  weight_within_category: number; // placeholder; not yet applied
  status: MetricStatus;        // baseline expected status (runtime may differ)
};

// 46 SOW metrics. `enabled: true` only where reliable live/proxy data already
// exists in the current pipeline (Census, BLS, or Apify-derived counts).
// Weights are placeholders for the future registry-driven composite; they are
// NOT applied today. Total per category is informational only.
export const SOW_METRIC_REGISTRY: readonly SowMetricEntry[] = [
  // Demand
  { key: "children_5_12_count",                 category: "demand", label: "Children Ages 5–12",                     enabled: true,  weight_within_category: 0.20, status: "proxy" },
  { key: "children_5_12_pct",                   category: "demand", label: "% Population Ages 5–12",                  enabled: true,  weight_within_category: 0.10, status: "proxy" },
  { key: "households_with_children_under_13",   category: "demand", label: "Households With Children Under 13",       enabled: true,  weight_within_category: 0.10, status: "proxy" },
  { key: "median_household_income",             category: "demand", label: "Median Household Income",                 enabled: true,  weight_within_category: 0.15, status: "live"  },
  { key: "income_100k_plus_pct",                category: "demand", label: "Households Earning $100k+",               enabled: true,  weight_within_category: 0.10, status: "live"  },
  { key: "income_150k_plus_pct",                category: "demand", label: "Households Earning $150k+",               enabled: true,  weight_within_category: 0.10, status: "live"  },
  { key: "young_family_growth_rate",            category: "demand", label: "Growth Rate of Young Families",           enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "dual_income_household_pct",           category: "demand", label: "% Dual-Income Households",                enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "education_bachelors_plus_pct",        category: "demand", label: "Parent Education / Bachelor's+",          enabled: true,  weight_within_category: 0.10, status: "live"  },
  { key: "summer_weather_index",                category: "demand", label: "Summer Weather Index",                    enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "avg_peak_summer_temperature",         category: "demand", label: "Avg Peak Summer Temperature",             enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "days_above_100f",                     category: "demand", label: "Number of 100°+ Days",                    enabled: false, weight_within_category: 0,    status: "missing" },

  // Pricing Power
  { key: "avg_weekly_camp_tuition",             category: "pricing_power", label: "Average Weekly Camp Tuition",                       enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "avg_hourly_camp_pricing",             category: "pricing_power", label: "Average Hourly Camp Pricing",                       enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "premium_stem_camp_pricing",           category: "pricing_power", label: "Premium STEM / Maker / Enrichment Camp Pricing",    enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "private_school_tuition_proxy",        category: "pricing_power", label: "Private Elementary School Tuition Levels",          enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "private_school_student_count",        category: "pricing_power", label: "Number of Private School Students",                 enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "childcare_nanny_hourly_rate_proxy",   category: "pricing_power", label: "Childcare / Nanny Hourly Rate Proxy",               enabled: true,  weight_within_category: 0.40, status: "proxy" },
  { key: "household_discretionary_income_proxy",category: "pricing_power", label: "Household Discretionary Income Estimate",           enabled: false, weight_within_category: 0,    status: "missing" },

  // Competitive Landscape
  { key: "summer_camps_per_10k_children",       category: "competitive_landscape", label: "Summer Camps per 10,000 Children",          enabled: true,  weight_within_category: 0.30, status: "proxy" },
  { key: "stem_robotics_maker_camp_count",      category: "competitive_landscape", label: "STEM / Robotics / Maker Camps",             enabled: true,  weight_within_category: 0.20, status: "proxy" },
  { key: "school_based_summer_camp_count",      category: "competitive_landscape", label: "School-Based Summer Camps",                 enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "national_brand_presence",             category: "competitive_landscape", label: "National Brand Presence",                   enabled: false, weight_within_category: 0,    status: "proxy" },
  { key: "google_search_demand_summer_camp",    category: "competitive_landscape", label: "Google Search Demand: summer camp [city]",  enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "google_search_demand_summer_day_camp",category: "competitive_landscape", label: "Google Search Demand: summer day camp",     enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "google_search_demand_summer_day_camps_year", category: "competitive_landscape", label: "Google Search Demand: Day Camps [Year]", enabled: false, weight_within_category: 0, status: "missing" },
  { key: "waitlist_sold_out_signal_count",      category: "competitive_landscape", label: "Waitlist / Sold-Out Signals",               enabled: false, weight_within_category: 0,    status: "missing" },

  // Franchisee Supply
  { key: "public_elementary_teacher_count",     category: "franchisee_supply", label: "Public Elementary Teachers",                    enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "private_charter_montessori_teacher_count", category: "franchisee_supply", label: "Private / Charter / Montessori Teachers", enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "elementary_school_count",             category: "franchisee_supply", label: "Elementary Schools",                            enabled: true,  weight_within_category: 0.40, status: "proxy" },
  { key: "teacher_salary_proxy",                category: "franchisee_supply", label: "Average Teacher Salary Proxy",                  enabled: true,  weight_within_category: 0.30, status: "proxy" },
  { key: "cost_of_living_index",                category: "franchisee_supply", label: "Cost of Living Index",                          enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "summer_income_need_ratio",            category: "franchisee_supply", label: "Summer Income Need Ratio",                      enabled: false, weight_within_category: 0,    status: "missing" },

  // Ease of Operations
  { key: "rental_venue_count",                  category: "ease_of_operations", label: "Rental Venues (Schools / Churches / Rec)",     enabled: true,  weight_within_category: 0.50, status: "proxy" },
  { key: "classroom_rental_cost_weekly",        category: "ease_of_operations", label: "Typical Classroom Rental Cost per Week",       enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "commute_sprawl_index",                category: "ease_of_operations", label: "Commute Times / Geographic Sprawl",            enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "state_camp_regulation_complexity",    category: "ease_of_operations", label: "State Camp Regulation Complexity",             enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "guide_wage_proxy",                    category: "ease_of_operations", label: "Estimated Guide Wage Proxy",                   enabled: true,  weight_within_category: 0.30, status: "proxy" },

  // Parent Mindset
  { key: "homeschool_population_proxy",         category: "parent_mindset", label: "Homeschool Population Proxy",                      enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "montessori_school_density",           category: "parent_mindset", label: "Elementary Montessori School Density",             enabled: true,  weight_within_category: 0.30, status: "proxy" },
  { key: "childrens_museum_signal",             category: "parent_mindset", label: "Children's Museum Signal",                         enabled: false, weight_within_category: 0,    status: "proxy" },
  { key: "robotics_maker_space_count",          category: "parent_mindset", label: "Robotics Clubs / Maker Spaces",                    enabled: true,  weight_within_category: 0.30, status: "proxy" },
  { key: "library_children_program_signal",     category: "parent_mindset", label: "Library Program Engagement",                       enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "parenting_facebook_group_activity",   category: "parent_mindset", label: "Parenting Facebook Group Activity",                enabled: false, weight_within_category: 0,    status: "blocked" },
  { key: "parent_community_activity_proxy",     category: "parent_mindset", label: "Other Parent Communities Activity",                enabled: false, weight_within_category: 0,    status: "blocked" },
];

const REGISTRY_BY_KEY: Record<string, SowMetricEntry> = Object.fromEntries(
  SOW_METRIC_REGISTRY.map((m) => [m.key, m]),
);

export function getRegistryEntry(key: string): SowMetricEntry | undefined {
  return REGISTRY_BY_KEY[key];
}

export function isMetricEnabled(key: string): boolean {
  return REGISTRY_BY_KEY[key]?.enabled ?? false;
}

// ---------- Phase C: SOW shadow scoring ----------
//
// Computes a parallel category + composite score from the SOW registry's
// `enabled` metrics. Output is for observation only; it is NOT yet written
// to cities.composite_score / cities.tier / city_category_scores.

export const SOW_SHADOW_SCORING_VERSION = "sow_shadow_v1";

export type SowMetricValues = Record<string, number | null | undefined>;

// Linear normalizer with clamp to 0..100. If invert=true, lower input → higher score.
function lin(v: number, lo: number, hi: number, invert = false): number {
  if (hi === lo) return 50;
  let t = (v - lo) / (hi - lo);
  if (invert) t = 1 - t;
  return Math.max(0, Math.min(100, t * 100));
}

// Conservative per-metric normalization. Returns 0..100 or null if not scorable.
export function normalizeSowMetric(
  signalKey: string,
  value: number | null | undefined,
): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const v = Number(value);
  switch (signalKey) {
    // Demand
    case "children_5_12_count":               return lin(v, 0, 8000);
    case "children_5_12_pct":                 return lin(v, 5, 15);
    case "households_with_children_under_13": return lin(v, 0, 8000);
    case "median_household_income":           return lin(v, 50000, 150000);
    case "income_100k_plus_pct":              return lin(v, 20, 70);
    case "income_150k_plus_pct":              return lin(v, 5, 50);
    case "education_bachelors_plus_pct":      return lin(v, 20, 70);
    // Pricing power
    case "childcare_nanny_hourly_rate_proxy": return lin(v, 20000, 45000);
    // Competitive landscape (lower competitor density = better)
    case "summer_camps_per_10k_children":     return lin(v, 0, 30, true);
    case "stem_robotics_maker_camp_count":    return lin(v, 0, 20, true);
    // Franchisee supply
    case "elementary_school_count":           return lin(v, 0, 30);
    case "teacher_salary_proxy":              return lin(v, 45000, 80000, true);
    // Ease of operations
    case "rental_venue_count":                return lin(v, 0, 50);
    case "guide_wage_proxy":                  return lin(v, 25000, 50000, true);
    // Parent mindset
    case "montessori_school_density":         return lin(v, 0, 5);
    case "robotics_maker_space_count":        return lin(v, 0, 20);
    default:                                  return null;
  }
}

export type SowShadowCategoryResult = {
  category_scores: Partial<CategoryScores>;
  enabled_metric_count: number;
  ignored_metric_count: number;
  per_category_metric_counts: Record<keyof CategoryScores, number>;
};

export function calculateSowCategoryScores(
  values: SowMetricValues,
  fallback?: Partial<CategoryScores> | null,
): SowShadowCategoryResult {
  const buckets: Record<keyof CategoryScores, { sum: number; weight: number; count: number }> = {
    demand:                { sum: 0, weight: 0, count: 0 },
    pricing_power:         { sum: 0, weight: 0, count: 0 },
    competitive_landscape: { sum: 0, weight: 0, count: 0 },
    franchisee_supply:     { sum: 0, weight: 0, count: 0 },
    ease_of_operations:    { sum: 0, weight: 0, count: 0 },
    parent_mindset:        { sum: 0, weight: 0, count: 0 },
  };

  let enabled = 0;
  let ignored = 0;

  for (const m of SOW_METRIC_REGISTRY) {
    if (!m.enabled) { ignored++; continue; }
    const norm = normalizeSowMetric(m.key, values[m.key] ?? null);
    if (norm == null) { ignored++; continue; }
    const w = m.weight_within_category > 0 ? m.weight_within_category : 1;
    const b = buckets[m.category];
    b.sum += norm * w;
    b.weight += w;
    b.count += 1;
    enabled++;
  }

  const out: Partial<CategoryScores> = {};
  const perCount: Record<keyof CategoryScores, number> = {
    demand: 0, pricing_power: 0, competitive_landscape: 0,
    franchisee_supply: 0, ease_of_operations: 0, parent_mindset: 0,
  };

  (Object.keys(buckets) as (keyof CategoryScores)[]).forEach((cat) => {
    const b = buckets[cat];
    perCount[cat] = b.count;
    const fb = fallback?.[cat];
    if (b.weight > 0 && b.count > 0) {
      let raw = b.sum / b.weight;
      // Conservative: with only 1 metric, blend 50/50 with fallback if available
      // to avoid wild single-proxy swings.
      if (b.count === 1 && typeof fb === "number") {
        raw = (raw + fb) / 2;
      }
      out[cat] = clampScore(raw);
    } else if (typeof fb === "number") {
      out[cat] = clampScore(fb);
    }
    // else: leave undefined (no usable signal, no fallback)
  });

  return {
    category_scores: out,
    enabled_metric_count: enabled,
    ignored_metric_count: ignored,
    per_category_metric_counts: perCount,
  };
}

export function calculateSowShadowComposite(
  cat: Partial<CategoryScores>,
): number | null {
  let sum = 0;
  let wsum = 0;
  (Object.keys(CATEGORY_WEIGHTS) as (keyof CategoryScores)[]).forEach((k) => {
    const v = cat[k];
    if (typeof v === "number") {
      sum += v * CATEGORY_WEIGHTS[k];
      wsum += CATEGORY_WEIGHTS[k];
    }
  });
  if (wsum <= 0) return null;
  return Math.round(sum / wsum);
}
