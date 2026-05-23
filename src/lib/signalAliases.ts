// Maps legacy fetcher signal_key values → SOW registry canonical keys.
// Used by MarketDetailDrawer to join old DB rows to the registry while we
// transition fetchers to write canonical keys directly.

// Only aliases whose canonical target is in the live 12-metric registry
// (src/lib/sowMetricRegistry.ts) belong here. Ghost-metric aliases pruned
// 2026-05-23 as part of the "kill the 46" cleanup.
export const LEGACY_TO_CANONICAL: Record<string, string> = {
  children_population_proxy: "children_5_12_count",
  education_bachelors_plus_proxy: "education_bachelors_plus_pct",
  dual_income_pct: "dual_income_household_pct",
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
