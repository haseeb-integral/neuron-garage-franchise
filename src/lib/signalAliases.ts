// Maps legacy fetcher signal_key values → SOW registry canonical keys.
// Used by MarketDetailDrawer to join old DB rows to the registry while we
// transition fetchers to write canonical keys directly.

export const LEGACY_TO_CANONICAL: Record<string, string> = {
  children_population_proxy: "children_5_12_count",
  income_100k_plus_proxy: "income_100k_plus_pct",
  education_bachelors_plus_proxy: "education_bachelors_plus_pct",
  dual_income_pct: "dual_income_household_pct",
  young_families_growth_5yr: "young_family_growth_rate",
  long_commute_pct: "commute_sprawl_index",
  montessori_count: "montessori_school_density",
  stem_enrichment_count: "stem_robotics_maker_camp_count",
  // competitor_count is a raw count, not a per-10k rate; surfaced as a proxy
  // until a true rate is computed by fetch-city-market-data.
  competitor_count: "summer_camps_per_10k_children",
};

// Diagnostic / readiness rows that pollute the metric view — hidden from the
// SOW coverage list and surfaced separately.
export const FETCHER_DIAGNOSTIC_KEYS = new Set<string>([
  "data_readiness",
  "bls_data_readiness",
  "census_data_readiness",
  "firecrawl_source_pages",
  "education_labor_market_proxy",
  "sow_metric_coverage_readiness",
  "gtrends_summer_camp_city",
  "gtrends_summer_day_camp",
  "competitor_waitlist_count",
  "competitor_soldout_count",
]);

export function canonicalKey(rawKey?: string | null): string | null {
  if (!rawKey) return null;
  return LEGACY_TO_CANONICAL[rawKey] ?? rawKey;
}
