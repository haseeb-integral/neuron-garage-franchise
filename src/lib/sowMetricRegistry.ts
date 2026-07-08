// Frontend mirror of supabase/functions/_shared/scoring.ts SOW_METRIC_REGISTRY.
// Duplicated intentionally so the frontend doesn't bundle edge-function code.
// Keep in sync if the backend registry changes.

import type { CategoryKey } from "@/stores/cityScoringStore";
import { isEnabled } from "@/lib/featureFlags";


export type MetricStatus = "live" | "proxy" | "missing" | "blocked";
export type RegistryCategory =
  | "demand"
  | "competitive_landscape"
  | "franchisee_supply";

export type SowMetricEntry = {
  key: string;
  category: RegistryCategory;
  label: string;
  description: string;
  enabled: boolean;
  weight_within_category: number;
  status: MetricStatus;
  /** Human-readable data source shown in the UI under each metric row. */
  source: string;
  /** Optional public URL for the source. When present, the UI may render the
   *  `source` label as a clickable link. Generic table/page links only — never
   *  city-specific deep links — so the URL is always safe regardless of city. */
  sourceUrl?: string;
};

export const CATEGORY_KEY_MAP: Record<RegistryCategory, CategoryKey> = {
  demand: "demand",
  competitive_landscape: "competitiveLandscape",
  franchisee_supply: "franchiseeSupply",
};

export const CATEGORY_PURPOSE: Record<CategoryKey, string> = {
  demand: "Are there enough affluent families with the right-aged kids in this city?",
  competitiveLandscape: "How crowded is the camp market — and how much room is there to win?",
  franchiseeSupply: "Are there enough teachers here to recruit as franchise operators?",
};

export const SOW_METRIC_REGISTRY: readonly SowMetricEntry[] = [
  // ─────────── DEMAND (4-metric lock — Brett+Haseeb 2026-05-21) ───────────
  // Locked to 4 Census ACS sub-metrics. Default sub-weights 30/25/20/25.
  // Ranges in sowNormalize.ts mirror real p5/p95 across 935 scored cities.
  { key: "children_5_12_count", category: "demand", label: "Children Ages 5–12",
    description: "Raw count of kids in the camp's target age range. Bigger pool = more potential customers.",
    enabled: true,  weight_within_category: 0.30, status: "live",
    source: "U.S. Census Bureau API — ACS 5-yr (vars B01001_004/005/028/029)",
    sourceUrl: "https://data.census.gov/table/ACSDT5Y2022.B01001" },
  { key: "median_household_income", category: "demand", label: "Median Household Income",
    description: "Typical family earnings. Above ~$90k starts to support discretionary camp spend.",
    enabled: true,  weight_within_category: 0.25, status: "live",
    source: "U.S. Census Bureau API — ACS 5-yr (B19013_001)",
    sourceUrl: "https://data.census.gov/table/ACSDT5Y2024.B19013" },
  { key: "dual_income_household_pct", category: "demand", label: "% Dual-Income Households",
    description: "Share of families with own children under 18 that are married-couple families where the husband is in the labor force (employed) AND the wife is in the labor force. Single-parent families remain in the denominator.",
    enabled: true,  weight_within_category: 0.20, status: "live",
    source: "U.S. Census Bureau API — ACS 5-yr (B23007: _006 / _002)",
    sourceUrl: "https://data.census.gov/table/ACSDT5Y2024.B23007" },
  { key: "education_bachelors_plus_pct", category: "demand", label: "Parent Education / Bachelor's+",
    description: "Share of adults with a college degree. Educated parents over-index on enrichment spending.",
    enabled: true,  weight_within_category: 0.25, status: "live",
    source: "U.S. Census Bureau API — ACS 5-yr (B15003_022–025)",
    sourceUrl: "https://data.census.gov/table/ACSDT5Y2024.B15003" },

  // Pricing Power, Ease of Operations, and Parent Mindset metrics were
  // retired in the May 21, 2026 6→3 category reshape (final purge).
  // See git history if you need the old entries.

  // ─────────── CSI (single-metric lock — Prompt 1 refactor 2026-07-07) ───────────
  // CSI reduced to ONE input: real counted national-brand supply, weighted
  // STEM ×2.0 / general ×1.0 by Manus v2. Old inputs removed:
  //   - csi_local_camp_estimate (enrollment × 0.003 guess — drowned real counts)
  //   - csi_demand_adjusted_market (duplicated the Demand pillar)
  // weight_within_category = 0 keeps the recompute helper falling back to the
  // server-stored score_csi (percentile-rank of csi_raw_supply across all
  // cities), so the drawer stays read-only and Manus owns the number.
  { key: "csi_national_brand_supply", category: "competitive_landscape", label: "National Brand Supply (weighted count)",
    description: "Weighted count of national camp/enrichment brand locations (STEM brands ×2.0, general brands ×1.0). Higher = more entrenched competition.",
    enabled: true,  weight_within_category: 0, status: "live",
    source: "Manus 2026-05-21 v2 — 15-brand scrape, STEM 2.0× / Other 1.0× weighting" },


  // ─────────── TAM TEACHERS (5-metric lock — Brett+Haseeb 2026-05-21) ───────────
  { key: "public_elementary_school_count", category: "franchisee_supply", label: "Public Elementary Schools",
    description: "Count of K-5 public schools in the city. Direct proxy for the size of the local elementary-teacher recruiting pool.",
    enabled: true,  weight_within_category: 0.20, status: "live",
    source: "NCES Common Core of Data — elementary-serving public schools rolled up to city",
    sourceUrl: "https://nces.ed.gov/ccd/schoolsearch/" },
  { key: "public_elementary_teacher_count", category: "franchisee_supply", label: "Public Elementary Teachers (NCES FTE)",
    description: "Sum of full-time-equivalent teachers across all elementary-serving public schools in the city. Real NCES values — not estimated.",
    enabled: true,  weight_within_category: 0.25, status: "live",
    source: "NCES CCD teachers_fte field, aggregated from public_schools table",
    sourceUrl: "https://nces.ed.gov/ccd/schoolsearch/" },
  { key: "private_charter_school_count", category: "franchisee_supply", label: "Private + Charter Elementary Schools",
    description: "Sum of private + charter elementary schools. These teachers are often more entrepreneurial and open to franchise ownership. Row is hidden when both counts are null.",
    enabled: true,  weight_within_category: 0.15, status: "live",
    source: "Manus AI batch — NCES Private School Universe + NCES CCD charter flag",
    sourceUrl: "https://nces.ed.gov/surveys/pss/privateschoolsearch/" },
  { key: "public_elementary_enrollment", category: "franchisee_supply", label: "Public Elementary Enrollment",
    description: "Total K-5 students enrolled in public schools city-wide. Cross-checks teacher count and indicates market scale.",
    enabled: true,  weight_within_category: 0.15, status: "live",
    source: "NCES Common Core of Data — enrollment field, aggregated to city",
    sourceUrl: "https://nces.ed.gov/ccd/schoolsearch/" },
  { key: "col_salary_index", category: "franchisee_supply", label: "Teacher Salary × Cost of Living Index",
    description: "Average elementary teacher salary normalized by local cost-of-living index (salary × 100 / COL). Lower value = stronger pull toward summer income and franchise ownership.",
    enabled: true,  weight_within_category: 0.25, status: "live",
    source: "BLS OEWS May 2025 SOC 25-2021 (Manus batch, 817 cities) × BEA Regional Price Parity",
    sourceUrl: "https://www.bls.gov/oes/current/oes252021.htm" },

];

export const METRICS_BY_CATEGORY: Record<CategoryKey, SowMetricEntry[]> = (() => {
  const out: Record<CategoryKey, SowMetricEntry[]> = {
    demand: [], competitiveLandscape: [], franchiseeSupply: [],
  };
  for (const m of SOW_METRIC_REGISTRY) out[CATEGORY_KEY_MAP[m.category]].push(m);
  return out;
})();

export const DEFAULT_SUB_WEIGHTS: Record<CategoryKey, Record<string, number>> = (() => {
  const out: Record<CategoryKey, Record<string, number>> = {
    demand: {}, competitiveLandscape: {}, franchiseeSupply: {},
  };
  for (const m of SOW_METRIC_REGISTRY) {
    out[CATEGORY_KEY_MAP[m.category]][m.key] = Math.round(m.weight_within_category * 100);
  }
  return out;
})();
