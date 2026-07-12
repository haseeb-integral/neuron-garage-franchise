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

// ---------- State normalization (canonical full names) ----------

const STATE_ABBR_TO_NAME: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
  PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

const STATE_NAMES_LOWER: Set<string> = new Set(
  Object.values(STATE_ABBR_TO_NAME).map((n) => n.toLowerCase()),
);

// Normalize "tx" / "TX" / "texas" / "Texas" → "Texas". Unknown values returned trimmed as-is.
export function normalizeStateName(input: string | null | undefined): string {
  const raw = (input ?? "").trim();
  if (!raw) return raw;
  if (raw.length === 2) {
    const up = raw.toUpperCase();
    if (STATE_ABBR_TO_NAME[up]) return STATE_ABBR_TO_NAME[up];
  }
  const lower = raw.toLowerCase();
  if (STATE_NAMES_LOWER.has(lower)) {
    // Title-case the canonical form by looking it up.
    for (const name of Object.values(STATE_ABBR_TO_NAME)) {
      if (name.toLowerCase() === lower) return name;
    }
  }
  return raw;
}

// ---------- Tier hysteresis (stability guard) ----------

export type TierStability = {
  previous_score: number | null;
  previous_tier: string | null;
  new_score: number;
  raw_new_tier: "A" | "B" | "C" | "D";
  final_tier: "A" | "B" | "C" | "D";
  applied: boolean;
  reason: string;
};

// If previous tier exists and the new composite is within 1 point of the prior
// composite, keep the previous tier to avoid API-count noise flipping tiers
// near a boundary. Otherwise, use the freshly computed tier.
export function applyTierHysteresis(
  newScore: number,
  prevScore: number | null | undefined,
  prevTier: string | null | undefined,
): TierStability {
  const rawNewTier = tierFromComposite(newScore);
  const validPrevTier = prevTier && /^[ABCD]$/.test(prevTier) ? (prevTier as "A"|"B"|"C"|"D") : null;
  if (validPrevTier && typeof prevScore === "number" && Math.abs(newScore - prevScore) <= 1 && rawNewTier !== validPrevTier) {
    return {
      previous_score: prevScore,
      previous_tier: validPrevTier,
      new_score: newScore,
      raw_new_tier: rawNewTier,
      final_tier: validPrevTier,
      applied: true,
      reason: "New score within 1 point of prior score; retained prior tier to reduce API-count noise.",
    };
  }
  return {
    previous_score: typeof prevScore === "number" ? prevScore : null,
    previous_tier: validPrevTier,
    new_score: newScore,
    raw_new_tier: rawNewTier,
    final_tier: rawNewTier,
    applied: false,
    reason: validPrevTier
      ? (rawNewTier === validPrevTier
          ? "Tier unchanged from prior; no hysteresis needed."
          : "Score moved 2+ points from prior; tier change allowed.")
      : "No prior tier to compare; using fresh tier.",
  };
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
// TAM Teachers rebuild 2026-07-12 (Brett+Haseeb). Three sub-metrics only.
// Keep the frontend mirror in src/lib/sowMetricRegistry.ts in sync.
export const TAM_WEIGHT_FTE            = 0.45; // pct_rank_teacher_fte (percentile)
export const TAM_WEIGHT_RECRUITABILITY = 0.35; // col_salary_index inverted min-max (worse pay = higher score, don't fix)
export const TAM_WEIGHT_PRIVATE        = 0.20; // pct_rank_private_elem (percentile)

export const SOW_METRIC_REGISTRY: readonly SowMetricEntry[] = [
  // ─────────── DEMAND (4-metric lock — Brett+Haseeb 2026-05-21) ───────────
  { key: "children_5_12_count",                 category: "demand", label: "Children Ages 5–12",                       enabled: true,  weight_within_category: 0.30, status: "live"  },
  { key: "median_household_income",             category: "demand", label: "Median Household Income",                  enabled: true,  weight_within_category: 0.25, status: "live"  },
  { key: "dual_income_household_pct",           category: "demand", label: "% Dual-Income Households",                 enabled: true,  weight_within_category: 0.20, status: "live"  },
  { key: "education_bachelors_plus_pct",        category: "demand", label: "Parent Education / Bachelor's+",           enabled: true,  weight_within_category: 0.25, status: "live"  },

  // ─────────── PRICING POWER ───────────
  { key: "avg_weekly_camp_tuition",             category: "pricing_power", label: "Average Weekly Camp Tuition",                       enabled: true,  weight_within_category: 0.20, status: "live" },
  { key: "avg_hourly_camp_pricing",             category: "pricing_power", label: "Average Hourly Camp Pricing",                       enabled: true,  weight_within_category: 0.10, status: "live" },
  { key: "premium_stem_camp_pricing",           category: "pricing_power", label: "Premium STEM / Maker / Enrichment Camp Pricing",    enabled: true,  weight_within_category: 0.15, status: "live" },
  { key: "private_school_tuition_proxy",        category: "pricing_power", label: "Private Elementary School Tuition Levels",          enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "private_school_student_count",        category: "pricing_power", label: "Number of Private School Students",                 enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "childcare_nanny_hourly_rate_proxy",   category: "pricing_power", label: "Childcare / Nanny Hourly Rate Proxy",               enabled: true,  weight_within_category: 0.35, status: "live"  },
  { key: "household_discretionary_income_proxy",category: "pricing_power", label: "Household Discretionary Income Estimate",           enabled: true,  weight_within_category: 0.20, status: "proxy" },

  // ─────────── CSI (3-metric lock — Brett+Haseeb 2026-05-21) ───────────
  // Inputs from Brett's 2026-05-21 Manus upload. NB and LCE invert in
  // normalizeSowMetric (more competition = lower opportunity); DAM not
  // inverted. Recomputed category score is OPPORTUNITY (high = good).
  { key: "csi_national_brand_supply",  category: "competitive_landscape", label: "National Brand Supply (weighted count)", enabled: true, weight_within_category: 0.34, status: "live"  },
  { key: "csi_local_camp_estimate",    category: "competitive_landscape", label: "Local Camp Supply (estimated)",          enabled: true, weight_within_category: 0.33, status: "proxy" },
  { key: "csi_demand_adjusted_market", category: "competitive_landscape", label: "Demand-Adjusted Market (DAM)",           enabled: true, weight_within_category: 0.33, status: "live"  },

  // ─────────── TAM TEACHERS (3-metric rebuild — Brett+Haseeb 2026-07-12) ───────────
  // Public Elementary Schools + Public Elementary Enrollment removed — they
  // duplicated the FTE signal. Teacher FTE and Private Elementary Schools now
  // score via percentile rank across all scored cities (see pct_rank_teacher_fte
  // / pct_rank_private_elem columns on us_cities_scored). Recruitability
  // (col_salary_index) keeps inverted min–max — worse pay = higher score,
  // don't fix, that's the whole point of the signal.
  { key: "public_elementary_teacher_count",     category: "franchisee_supply", label: "Public Elementary Teachers (NCES FTE)",         enabled: true,  weight_within_category: TAM_WEIGHT_FTE,           status: "live"  },
  { key: "col_salary_index",                    category: "franchisee_supply", label: "Teacher Salary × Cost of Living Index",         enabled: true,  weight_within_category: TAM_WEIGHT_RECRUITABILITY, status: "proxy" },
  { key: "private_charter_school_count",        category: "franchisee_supply", label: "Private Elementary Schools",                    enabled: true,  weight_within_category: TAM_WEIGHT_PRIVATE,       status: "live"  },

  // ─────────── EASE OF OPERATIONS ───────────
  { key: "rental_venue_count",                  category: "ease_of_operations", label: "Rental Venues (Schools / Churches / Rec)",     enabled: true,  weight_within_category: 0.45, status: "proxy" },
  { key: "classroom_rental_cost_weekly",        category: "ease_of_operations", label: "Typical Classroom Rental Cost per Week",       enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "commute_sprawl_index",                category: "ease_of_operations", label: "Commute Times / Geographic Sprawl",            enabled: true,  weight_within_category: 0.20, status: "live"    },
  { key: "state_camp_regulation_complexity",    category: "ease_of_operations", label: "State Camp Regulation Complexity",             enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "guide_wage_proxy",                    category: "ease_of_operations", label: "Estimated Guide Wage Proxy",                   enabled: true,  weight_within_category: 0.35, status: "live"  },

  // ─────────── PARENT MINDSET ───────────
  { key: "homeschool_population_proxy",         category: "parent_mindset", label: "Homeschool Population Proxy",                      enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "montessori_school_density",           category: "parent_mindset", label: "Elementary Montessori School Density",             enabled: true,  weight_within_category: 0.40, status: "proxy" },
  { key: "childrens_museum_signal",             category: "parent_mindset", label: "Children's Museum Signal",                         enabled: true,  weight_within_category: 0.20, status: "proxy" },
  { key: "robotics_maker_space_count",          category: "parent_mindset", label: "Robotics Clubs / Maker Spaces",                    enabled: true,  weight_within_category: 0.40, status: "proxy" },
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
// Ranges updated for sow_official_v1 (absolute normalized scoring).
export function normalizeSowMetric(
  signalKey: string,
  value: number | null | undefined,
): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const v = Number(value);
  switch (signalKey) {
    // Demand (4-metric lock 2026-05-21 — real p5/p95 across 935 cities).
    // Keep ranges in sync with src/lib/sowNormalize.ts.
    case "children_5_12_count":               return lin(v, 3000, 110000);
    case "median_household_income":           return lin(v, 45000, 150000);
    case "dual_income_household_pct":         return lin(v, 85, 98);
    case "education_bachelors_plus_pct":      return lin(v, 15, 70);
    // Pricing power
    case "childcare_nanny_hourly_rate_proxy": return lin(v, 11, 25); // BLS SOC 39-9011 hourly mean wage ($/hr)
    case "household_discretionary_income_proxy": return lin(v, 20000, 150000);
    case "avg_weekly_camp_tuition":           return lin(v, 200, 600);
    case "avg_hourly_camp_pricing":           return lin(v, 8, 20);
    case "premium_stem_camp_pricing":         return lin(v, 300, 800);
    case "private_school_tuition_proxy":      return lin(v, 8000, 35000);
    // CSI (3-metric lock 2026-05-21 — Brett+Haseeb). NB / LCE invert so
    // more competition lowers the opportunity score; DAM not inverted.
    // Ranges = real p5/p95 across 817 Manus-populated cities. Keep in
    // sync with src/lib/sowNormalize.ts.
    case "csi_national_brand_supply":         return lin(v, 0, 25,    true);
    case "csi_local_camp_estimate":           return lin(v, 0, 125,   true);
    case "csi_demand_adjusted_market":        return lin(v, 0, 45000, false);
    // TAM Teachers (5 sub-metrics, lock 2026-05-21)
    case "public_elementary_school_count":    return lin(v, 0, 250);
    case "public_elementary_teacher_count":   return lin(v, 0, 6000);
    case "private_charter_school_count":      return lin(v, 0, 180);
    case "public_elementary_enrollment":      return lin(v, 0, 90000);
    case "col_salary_index":                  return lin(v, 30000, 120000, true); // salary*COL/100; lower = stronger recruiting pull

    // Backstop: bare COL when col_salary_index not yet computed (Manus salary pending)
    case "cost_of_living_index":              return lin(v, 80, 180, true);
    // Ease of operations
    case "rental_venue_count":                return lin(v, 0, 25);
    case "guide_wage_proxy":                  return lin(v, 11, 25, true); // BLS SOC 39-9011 hourly mean wage; lower wage = better unit economics
    case "classroom_rental_cost_weekly":      return lin(v, 250, 2000, true);
    case "commute_sprawl_index":              return lin(v, 10, 60, true);
    case "state_camp_regulation_complexity":  return lin(v, 1, 5, true);
    // Parent mindset
    case "montessori_school_density":         return lin(v, 0, 10);
    case "robotics_maker_space_count":        return lin(v, 0, 20);
    case "childrens_museum_signal":           return lin(v, 0, 10);
    case "library_children_program_signal":   return lin(v, 0, 20);
    case "homeschool_population_proxy":       return lin(v, 0, 10000);
    case "parenting_facebook_group_activity": return lin(v, 0, 100);
    case "parent_community_activity_proxy":   return lin(v, 0, 100);
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
      // Conservative: with fewer than 3 usable metrics, blend 50/50 with
      // fallback if available to avoid sparse-proxy swings.
      if (b.count < 3 && typeof fb === "number") {
        raw = (raw * 0.5) + (fb * 0.5);
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

// ---------- Phase C.1: shadow scoring diagnostics ----------

export type CategoryConfidence = "high" | "medium" | "low";

export type CategoryDiagnostic = {
  enabled_metrics_used: number;
  enabled_metrics_available: number;
  missing_or_disabled_metrics: number;
  total_registry_metrics: number;
  confidence: CategoryConfidence;
  notes: string;
};

export type ScoreReadiness = {
  ready_for_cutover: boolean;
  reason: string;
  categories_with_sufficient_metrics: number;
  min_metrics_per_category_required: number;
};

const CATEGORY_LABELS: Record<keyof CategoryScores, string> = {
  demand: "Demand",
  pricing_power: "Pricing Power",
  competitive_landscape: "Competitive Landscape",
  franchisee_supply: "Franchisee Supply",
  ease_of_operations: "Ease of Operations",
  parent_mindset: "Parent Mindset",
};

function confidenceFor(used: number): CategoryConfidence {
  if (used >= 3) return "high";
  if (used === 2) return "medium";
  return "low";
}

function notesFor(
  cat: keyof CategoryScores,
  used: number,
  available: number,
  missingDisabledLabels: string[],
): string {
  if (available === 0) {
    return `No metrics enabled in registry yet for ${CATEGORY_LABELS[cat]}.`;
  }
  if (used === 0) {
    return `No usable values for enabled ${CATEGORY_LABELS[cat]} metrics; falling back to current category score if available.`;
  }
  if (used >= 3) {
    return `${used} enabled metrics contributing; ${CATEGORY_LABELS[cat]} score has solid coverage.`;
  }
  const missingPreview = missingDisabledLabels.slice(0, 3).join(", ");
  if (used === 1) {
    return `${CATEGORY_LABELS[cat]} score is not final because only 1 metric is contributing. Missing: ${missingPreview || "additional registry metrics"}.`;
  }
  return `${CATEGORY_LABELS[cat]} has ${used} contributing metrics; needs more for high confidence. Missing: ${missingPreview || "additional registry metrics"}.`;
}

export function buildShadowDiagnostics(
  values: SowMetricValues,
  perCategoryUsed: Record<keyof CategoryScores, number>,
): {
  category_diagnostics: Record<keyof CategoryScores, CategoryDiagnostic>;
  score_readiness: ScoreReadiness;
} {
  const minRequired = 3;
  const diagnostics = {} as Record<keyof CategoryScores, CategoryDiagnostic>;
  let categoriesReady = 0;

  (Object.keys(CATEGORY_LABELS) as (keyof CategoryScores)[]).forEach((cat) => {
    const inCat = SOW_METRIC_REGISTRY.filter((m) => m.category === cat);
    const enabledInCat = inCat.filter((m) => m.enabled);
    const used = perCategoryUsed[cat] ?? 0;
    const available = enabledInCat.length;
    // Missing or disabled = total registry metrics in this category that did NOT contribute.
    const missingOrDisabled = inCat.length - used;
    const missingDisabledLabels = inCat
      .filter((m) => {
        if (!m.enabled) return true;
        const v = values[m.key];
        return v == null || !Number.isFinite(Number(v));
      })
      .map((m) => m.label);

    const confidence = confidenceFor(used);
    if (used >= minRequired) categoriesReady++;

    diagnostics[cat] = {
      enabled_metrics_used: used,
      enabled_metrics_available: available,
      missing_or_disabled_metrics: missingOrDisabled,
      total_registry_metrics: inCat.length,
      confidence,
      notes: notesFor(cat, used, available, missingDisabledLabels),
    };
  });

  const totalCats = Object.keys(CATEGORY_LABELS).length;
  // "Most" = at least 4 of 6 categories have >= 3 contributing metrics.
  const ready = categoriesReady >= Math.ceil(totalCats * 2 / 3);

  return {
    category_diagnostics: diagnostics,
    score_readiness: {
      ready_for_cutover: ready,
      reason: ready
        ? `${categoriesReady}/${totalCats} categories have at least ${minRequired} contributing metrics.`
        : `Only ${categoriesReady}/${totalCats} categories have at least ${minRequired} contributing metrics. Shadow score is useful for testing but not ready to replace current score.`,
      categories_with_sufficient_metrics: categoriesReady,
      min_metrics_per_category_required: minRequired,
    },
  };
}

// ---------- Phase D: Official SOW scoring (sow_official_v1) ----------
//
// Absolute normalized scoring derived from the 46-metric SOW registry.
// Reuses calculateSowCategoryScores (which already implements the spec:
// weighted average of usable normalized metrics, 1-metric blend with
// fallback, clamp 40..98). Composite is weighted by CATEGORY_WEIGHTS,
// renormalized over categories that produced a score.

export const SOW_OFFICIAL_SCORING_VERSION = "sow_official_v1";

export type OfficialSowScoringResult = {
  scoring_version: string;
  category_scores: Partial<CategoryScores>;
  composite_score: number | null;
  tier: "A" | "B" | "C" | "D" | null;
  enabled_metric_count: number;
  ignored_metric_count: number;
  per_category_metric_counts: Record<keyof CategoryScores, number>;
  category_diagnostics: Record<keyof CategoryScores, CategoryDiagnostic>;
  readiness: {
    missing_metrics_tracked: true;
    missing_metrics_count: number;
    note: string;
  };
};

export function calculateOfficialSowScoring(
  values: SowMetricValues,
  fallback?: Partial<CategoryScores> | null,
): OfficialSowScoringResult {
  const cat = calculateSowCategoryScores(values, fallback);
  const composite = calculateSowShadowComposite(cat.category_scores);
  const tier = composite != null ? tierFromComposite(composite) : null;
  const diag = buildShadowDiagnostics(values, cat.per_category_metric_counts);

  // Count missing metrics across registry (enabled metrics with no usable value
  // + disabled/missing entries). These are tracked but NOT counted as zero.
  let missingCount = 0;
  for (const m of SOW_METRIC_REGISTRY) {
    if (!m.enabled) { missingCount++; continue; }
    const norm = normalizeSowMetric(m.key, values[m.key] ?? null);
    if (norm == null) missingCount++;
  }

  return {
    scoring_version: SOW_OFFICIAL_SCORING_VERSION,
    category_scores: cat.category_scores,
    composite_score: composite,
    tier,
    enabled_metric_count: cat.enabled_metric_count,
    ignored_metric_count: cat.ignored_metric_count,
    per_category_metric_counts: cat.per_category_metric_counts,
    category_diagnostics: diag.category_diagnostics,
    readiness: {
      missing_metrics_tracked: true,
      missing_metrics_count: missingCount,
      note: "Missing metrics are tracked but not counted as zero.",
    },
  };
}
