import { supabase } from "@/integrations/supabase/client";
import { CityData, sampleCities } from "@/data/cityData";
import type { CategoryKey } from "@/stores/cityScoringStore";
import { canonicalKey } from "@/lib/signalAliases";
import { competitiveOpportunityFromCsi } from "@/lib/marketView";
import { tierFromRawComposite } from "@/lib/cityTiers";



/**
 * Subset of `us_cities_scored` columns this module reads.
 * Keep aligned with the SELECT in `loadLiveRankedMarkets`. All values come
 * from PostgREST so numerics may surface as numbers or strings; consumers
 * should run them through `toNumber`.
 */
export type ScoredCityRow = {
  id: string;
  city_name: string | null;
  state_name: string | null;
  state_abbr: string | null;
  metro_area: string | null;
  county_name: string | null;
  metro_counties: string[] | null;
  population: number | string | null;
  population_density: number | string | null;
  children_5_12: number | string | null;
  median_household_income: number | string | null;
  dual_working_families_pct: number | string | null;
  college_degree_pct: number | string | null;
  cost_of_living_index: number | string | null;
  public_school_count: number | string | null;
  public_school_enrollment: number | string | null;
  public_elementary_count: number | string | null;
  public_elementary_enrollment: number | string | null;
  public_elementary_teacher_count: number | string | null;
  private_elementary_count: number | string | null;
  charter_elementary_count: number | string | null;
  composite_score_default: number | string | null;
  score_demand: number | string | null;
  score_csi: number | string | null;
  score_tam_teachers: number | string | null;
  csi_score: number | string | null;
  csi_saturation_category: string | null;
  csi_confidence: number | string | null;
  csi_national_brand_count_weighted: number | string | null;
  csi_local_provider_estimate: number | string | null;
  csi_demand_adjusted_market: number | string | null;
  csi_brand_detail: unknown;
  csi_last_updated: string | null;
  place_type: string | null;
  census_population_2020: number | string | null;
  avg_elementary_teacher_salary_usd: number | string | null;
  col_salary_index: number | string | null;
  is_registration_state: boolean | null;
  scored_at: string | null;
  provider_count: number | string | null;
  // Per-source freshness columns are read by `getCitySourceData` via a
  // narrower SELECT; not required on the main scored-row union.
};

/** Live `market_signals` row as consumed by the merger. Fields are loose
 * because legacy fetchers wrote varying shapes; everything is normalized
 * via `canonicalKey` + the merger fallbacks. */
export type LiveSignal = {
  signal_key?: string | null;
  label?: string | null;
  value?: string | number | null;
  source?: string | null;
  raw_data?: unknown;
};

export type RankedMarket = {
  id: number;
  cityId?: string;
  city: string;
  state: string;
  county?: string | null;
  metroArea?: string | null;
  metroCounties?: string[] | null;
  tier: "A" | "B" | "C" | "D" | string;
  compositeScore: number;
  population: number | null;
  competitorCount: number | null;
  marketType?: string | null;
  isNonRegistration: boolean;
  lastScrapedAt?: string | null;
  source: "live" | "sample";
  hasLiveData: boolean;
  // Count of providers detected in this city (from mvs_providers).
  // Populated for the 16 pilot cities; null for others until v1.8. Phase 4
  // of the Tier 1 rework (2026-07-07).
  providerCount: number | null;
  categoryScores?: Partial<Record<CategoryKey, number>>;
  scoredRow?: ScoredCityRow | null;
  sample?: CityData;
};

type SeededMetricCategory =
  | "demand"
  | "pricing_power"
  | "competitive_landscape"
  | "franchisee_supply"
  | "ease_of_operations"
  | "parent_mindset";

export type SeededFallbackSignal = {
  signal_key: string;
  label: string;
  value: string | number | null;
  source: "Pre-seeded";
  raw_data: {
    status: "proxy";
    used_in_score: boolean;
    metric_category: SeededMetricCategory;
  };
};

export type RankedMarketFilters = {
  searchTerm: string;
  stateFilter: string;
  tierFilter: string;
  nonRegOnly: boolean;
  minScore: number;
  minPop: string;
};

const NON_REGISTRATION_STATES = new Set(["Texas", "Florida"]);

// Display-score tiers (May 24, 2026 Brett rule). Input is the RAW composite
// (0–100); the calibration curve maps it to the school-grade display score
// before tier assignment, so this stays consistent with the table/center
// panel/spreadsheet/compare/report (all driven by cityTiers + marketView).
export function tierFromScore(score: number): "A" | "B" | "C" | "D" {
  return tierFromRawComposite(Number.isFinite(score) ? score : 0);
}

function normalizeState(state?: string | null) {
  if (!state) return "";
  if (state === "TX") return "Texas";
  if (state === "FL") return "Florida";
  return state;
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// mapLiveCityToRankedMarket removed 2026-05-23 — unused. The live mapping
// path runs inline inside `loadLiveRankedMarkets` against the wider
// `us_cities_scored` SELECT; no caller ever exercised the legacy `cities`
// shape this helper expected.

export function mapSampleCityToRankedMarket(city: CityData): RankedMarket {
  return {
    id: city.id,
    city: city.city,
    state: city.state,
    county: null,
    metroArea: null,
    tier: city.tier,
    compositeScore: city.compositeScore,
    population: city.population,
    competitorCount: city.competitorCount,
    marketType: null,
    isNonRegistration: city.isNonRegistration,
    source: "sample",
    hasLiveData: false,
    providerCount: null,
    sample: city,
  };
}

function marketTypeFromDensity(density: number): string {
  // Per locked Q1: Urban ≥ 3000/km², Suburb 500-3000, Rural < 500.
  if (density >= 3000) return "Urban";
  if (density >= 500) return "Suburb";
  return "Rural";
}

export async function loadLiveRankedMarkets(_opts?: { includeExtras?: boolean }): Promise<RankedMarket[]> {
  // Canonical source: us_cities_scored.
  // Universe is the 817 Manus cities — the 160 legacy rows were hard-deleted
  // on 2026-05-22 after verifying zero teacher_prospects referenced them.
  const query = supabase
    .from("us_cities_scored")
    .select(
      // 2026-05-23: camp_waitlist_signals removed from select (orphan column,
      // not read by any downstream consumer). summer_camp_count dropped
      // 2026-05-22 — 0/817 populated; CSI is fully covered by
      // csi_national_brand_count_weighted, csi_local_provider_estimate, and
      // csi_demand_adjusted_market (all 817/817 from Manus).
      "id, city_name, state_name, state_abbr, metro_area, county_name, metro_counties, population, population_density, children_5_12, median_household_income, dual_working_families_pct, college_degree_pct, cost_of_living_index, public_school_count, public_school_enrollment, public_elementary_count, public_elementary_enrollment, public_elementary_teacher_count, private_elementary_count, charter_elementary_count, composite_score_default, score_demand, score_csi, score_tam_teachers, csi_score, csi_saturation_category, csi_confidence, csi_national_brand_count_weighted, csi_local_provider_estimate, csi_demand_adjusted_market, csi_brand_detail, csi_last_updated, place_type, census_population_2020, avg_elementary_teacher_salary_usd, col_salary_index, is_registration_state, scored_at, provider_count",
    )
    .order("composite_score_default", { ascending: false, nullsFirst: false })
    .limit(2000);

  const t0 = performance.now();
  const { data: scoredRows, error: scoredErr } = await query;
  const queryMs = Math.round(performance.now() - t0);

  // Telemetry breadcrumb so next time anyone reports "no data" we can read
  // exactly what happened from their browser console.
  const { data: sessionData } = await supabase.auth.getSession();
  const sess = sessionData?.session ?? null;
  console.info("[CitySearch] loadLiveRankedMarkets", {
    rowCount: scoredRows?.length ?? 0,
    hasSession: !!sess,
    sessionExpiresAt: sess?.expires_at
      ? new Date(sess.expires_at * 1000).toISOString()
      : null,
    error: scoredErr?.message ?? null,
  });

  // Surface to the manager-only <DbDebugFooter />.
  void import("@/lib/dbHealth/queryLogger").then(({ logDbQuery }) =>
    logDbQuery({
      label: "loadLiveRankedMarkets",
      table: "us_cities_scored",
      rowCount: scoredRows?.length ?? 0,
      ms: queryMs,
      error: scoredErr?.message ?? null,
    }),
  );

  if (scoredErr) {
    // Throw so React Query surfaces an error state instead of rendering
    // a silent empty list (which is what the May-25 "no data" report was).
    console.error("loadLiveRankedMarkets us_cities_scored error", scoredErr);
    throw new Error(`City database query failed: ${scoredErr.message}`);
  }

  // Sanity check: if we got 0 rows back but the table actually has data,
  // it's an auth/RLS problem — surface as an error, don't silently empty.
  if (!scoredRows?.length) {
    const { count, error: countErr } = await supabase
      .from("us_cities_scored")
      .select("id", { count: "exact", head: true });
    if (!countErr && (count ?? 0) > 0) {
      throw new Error(
        `City list returned 0 rows but database has ${count}. Your session may have expired — please sign out and back in.`,
      );
    }
    return [];
  }

  const mapped: RankedMarket[] = (scoredRows as ScoredCityRow[]).map((row, index) => {
    const state = normalizeState(row.state_name ?? row.state_abbr);
    const city = row.city_name ?? "Unknown";
    const composite = toNumber(row.composite_score_default, 0);
    const hasLiveData = composite > 0;
    const density = toNumber(row.population_density, 0);
    return {
      id: 200000 + index,
      cityId: row.id,
      city,
      state,
      county: row.county_name ?? null,
      metroArea: row.metro_area ?? null,
      metroCounties: Array.isArray(row.metro_counties) ? row.metro_counties : null,
      tier: tierFromScore(composite),
      compositeScore: composite,
      population: row.population == null ? null : Number(row.population),
      // competitorCount retired 2026-05-22 — see SELECT comment above.
      competitorCount: null,
      marketType: marketTypeFromDensity(density),
      isNonRegistration: row.is_registration_state === false,
      lastScrapedAt: row.scored_at ?? null,
      source: "live",
      hasLiveData,
      providerCount: row.provider_count == null ? null : Number(row.provider_count),
      scoredRow: row,
      categoryScores: {
        demand: row.score_demand == null ? undefined : toNumber(row.score_demand, 0),
        // CSI is stored as SATURATION (higher = crowded = bad). The single
        // shared helper `competitiveOpportunityFromCsi` flips it into the
        // Competitive Opportunity pillar (higher = better). Never inline
        // `100 - score_csi` — always go through the helper.
        competitiveLandscape:
          competitiveOpportunityFromCsi(row.score_csi == null ? null : toNumber(row.score_csi, 0)) ?? undefined,
        franchiseeSupply: row.score_tam_teachers == null ? undefined : toNumber(row.score_tam_teachers, 0),
      },
    };
  });


  return dedupeRankedMarkets(mapped);
}

export function dedupeRankedMarkets(markets: RankedMarket[]): RankedMarket[] {
  const byKey = new Map<string, RankedMarket>();
  const score = (m: RankedMarket) => (m.lastScrapedAt ? new Date(m.lastScrapedAt).getTime() : 0);
  for (const m of markets) {
    const key = `${(m.city ?? "").trim().toLowerCase()}|${normalizeState(m.state).toLowerCase()}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, m);
      continue;
    }
    // A live row always wins over a sample row for the same key — even if the
    // live row has no scoring yet. We never substitute hardcoded sample numbers
    // for a city that exists in the DB. Optionally copy missing geo fields.
    const enrichGeo = (base: RankedMarket, geo: RankedMarket): RankedMarket => ({
      ...base,
      metroArea: base.metroArea ?? geo.metroArea,
      county: base.county ?? geo.county,
      marketType: base.marketType ?? geo.marketType,
    });

    let winner = existing;
    if (m.source === "live" && existing.source === "sample") {
      winner = enrichGeo(m, existing);
    } else if (existing.source === "live" && m.source === "sample") {
      winner = enrichGeo(existing, m);
    } else if (m.source === existing.source) {
      const a = score(m);
      const b = score(existing);
      if (a > b) winner = m;
      else if (a === b && m.compositeScore > existing.compositeScore) winner = m;
    }
    byKey.set(key, winner);
  }
  return Array.from(byKey.values());
}

export function filterRankedMarkets(markets: RankedMarket[], filters: RankedMarketFilters) {
  const minPopulation = Number(filters.minPop || 0);
  return dedupeRankedMarkets(markets)
    .filter((market) => {
      const haystack = `${market.city} ${market.state} ${market.county ?? ""} ${market.metroArea ?? ""}`.toLowerCase();
      if (filters.searchTerm && !haystack.includes(filters.searchTerm.toLowerCase())) return false;
      if (filters.stateFilter !== "All" && market.state !== filters.stateFilter) return false;
      // No-data cities always pass the score / tier / population filters so the
      // user can still see them and trigger a Refresh to fetch real data.
      if (market.hasLiveData) {
        if (filters.tierFilter !== "All" && market.tier !== filters.tierFilter) return false;
        if (filters.nonRegOnly && !market.isNonRegistration) return false;
        if (market.compositeScore < filters.minScore) return false;
        if (minPopulation && (market.population ?? 0) < minPopulation) return false;
      } else {
        // Still respect the explicit non-registration toggle for no-data rows.
        if (filters.nonRegOnly && !market.isNonRegistration) return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Data-bearing markets first (by score desc), no-data markets at the bottom (alpha).
      if (a.hasLiveData !== b.hasLiveData) return a.hasLiveData ? -1 : 1;
      if (a.hasLiveData) return b.compositeScore - a.compositeScore;
      return a.city.localeCompare(b.city);
    });
}

export function sampleRankedMarkets() {
  return sampleCities.map(mapSampleCityToRankedMarket);
}

export function buildSeededFallbackSignalsFromScored(
  scoredRow?: Partial<ScoredCityRow> | null,
  _childrenPct?: number | null,
): SeededFallbackSignal[] {
  if (!scoredRow) return [];

  // (childrenPct param kept for backwards-compatible signature; not used here
  // because the registry surfaces `children_5_12_count` directly.)
  // campCount / campsPer10k removed 2026-05-22 — summer_camp_count was 0/817
  // populated and the derived per-10k value was never referenced.
  const seeded = (
    signal_key: string,
    label: string,
    value: string | number | null | undefined,
    metric_category: SeededMetricCategory,
    used_in_score: boolean,
  ): SeededFallbackSignal => ({
    signal_key,
    label,
    value: value ?? null,
    source: "Pre-seeded",
    raw_data: { status: "proxy", used_in_score, metric_category },
  });

  return [
    seeded("total_population", "Total Population", scoredRow.population, "demand", false),
    // Demand — 4-metric lock (Brett+Haseeb 2026-05-21)
    seeded("children_5_12_count", "Children Ages 5–12", scoredRow.children_5_12, "demand", true),
    seeded("median_household_income", "Median Household Income", scoredRow.median_household_income, "demand", true),
    seeded("dual_income_household_pct", "% Dual-Income Households", scoredRow.dual_working_families_pct, "demand", true),
    seeded("education_bachelors_plus_pct", "Bachelor's+ Attainment", scoredRow.college_degree_pct, "demand", true),
    // CSI — single input after 2026-07-07 refactor (Prompt 1). Local-provider
    // estimate and demand-adjusted market removed: the first was a guess that
    // drowned real counts, the second duplicated the Demand pillar.
    seeded("csi_national_brand_supply", "National Brand Supply (weighted)", scoredRow.csi_national_brand_count_weighted, "competitive_landscape", true),
    // TAM Teachers — 5-metric lock (Brett+Haseeb 2026-05-21)
    seeded("public_elementary_school_count", "Public Elementary Schools", scoredRow.public_elementary_count, "franchisee_supply", true),
    seeded("public_elementary_teacher_count", "Public Elementary Teachers (NCES FTE)", scoredRow.public_elementary_teacher_count, "franchisee_supply", true),
    seeded("private_charter_school_count", "Private + Charter Elementary Schools", (toNumber(scoredRow.private_elementary_count, 0) + toNumber(scoredRow.charter_elementary_count, 0)) || null, "franchisee_supply", true),
    seeded("public_elementary_enrollment", "Public Elementary Enrollment", scoredRow.public_elementary_enrollment, "franchisee_supply", true),
    seeded("col_salary_index", "Teacher Salary × Cost of Living Index", scoredRow.col_salary_index ?? scoredRow.cost_of_living_index, "franchisee_supply", true),
    // Retired/orphan metrics removed 2026-05-22:
    //   avg_camp_price_per_hour (pricing category retired May 15),
    //   summer_weather_index / avg_peak_summer_temperature / days_above_90f /
    //   summer_precip_days (weather is not in any live category).
    // DB columns are preserved; UI no longer surfaces them.
  ];
  // Note: rows with null values are KEPT — the UI shows them as "—" so the
  // user can see exactly which metrics are not yet seeded for this city,
  // instead of getting a near-empty panel that looks like a UI bug.
}

export type MergedSignal = SeededFallbackSignal | (LiveSignal & { signal_key: string });

export function mergeSignalsPreferLive(
  liveSignals: LiveSignal[] | null | undefined,
  scoredRow?: Partial<ScoredCityRow> | null,
  childrenPct?: number | null,
): MergedSignal[] {
  const seededSignals = buildSeededFallbackSignalsFromScored(scoredRow, childrenPct);
  const liveByCanonical = new Map<string, LiveSignal & { signal_key: string }>();

  (liveSignals ?? []).forEach((signal) => {
    const key = canonicalKey(signal?.signal_key ?? null);
    if (!key) return;
    liveByCanonical.set(key, { ...signal, signal_key: key });
  });

  const merged: MergedSignal[] = seededSignals.map((seeded) => {
    const live = liveByCanonical.get(seeded.signal_key);
    return live
      ? {
          ...seeded,
          ...live,
          signal_key: seeded.signal_key,
          label: live.label ?? seeded.label,
          value: live.value ?? seeded.value,
          raw_data: live.raw_data ?? seeded.raw_data,
        }
      : seeded;
  });

  liveByCanonical.forEach((signal, key) => {
    if (!merged.some((row) => row.signal_key === key)) {
      merged.push({
        ...signal,
        source: signal.source ?? "Live",
        signal_key: key,
        label: signal.label ?? key,
        value: signal.value ?? null,
        raw_data: signal.raw_data ?? null,
      });
    }
  });

  return merged;
}

// ============================================================================
// Source Data (provenance) for the selected city
// ============================================================================
export type CitySourceRow = {
  source: string;
  label: string;
  status: "success" | "error" | "running" | "queued" | "never";
  lastFetchedAt: string | null;
  recordCount: number;
  sourceUrl: string | null;
  errorMessage: string | null;
};

const SOURCE_LABELS: Record<string, string> = {
  census: "U.S. Census Bureau",
  bls: "BLS (Occupational Data)",
  apify: "Yelp / Google Maps / Apify",
  firecrawl: "Firecrawl",
  google_trends: "Google Trends",
  state_edu: "State Education Databases",
  aca: "ACA Camp Regulations",
  zillow_col: "Zillow / Cost of Living",
  weather: "Weather Data",
  census_maps: "Census Maps",
  computed: "Computed Metrics",
  manual_or_phase2: "Manual / Phase 2",
  live_api: "Live API Aggregator",
  sow_metric_coverage: "SOW Metric Engine",
  poc: "Proof of Concept",
};

function labelFor(source: string) {
  return SOURCE_LABELS[source] ?? source.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function jobStatusToRowStatus(status: string | null | undefined): CitySourceRow["status"] {
  if (!status) return "never";
  if (status === "completed" || status === "completed_with_warnings") return "success";
  if (status === "running" || status === "in_progress") return "running";
  if (status === "queued" || status === "pending") return "queued";
  return "error";
}

export async function getCitySourceData(cityId: string): Promise<CitySourceRow[]> {
  if (!cityId) return [];

  // Legacy `city_market_signals` and `city_fetch_jobs` were severed on 2026-05-21.
  // Source Data panel now reads per-source freshness directly from the scored row.
  const { data: scoredRow } = await supabase
    .from("us_cities_scored")
    .select(
      "census_last_updated,bls_last_updated,apify_last_updated,firecrawl_last_updated,bea_last_updated,fred_last_updated,nces_last_updated,greatschools_last_updated,weather_last_updated",
    )
    .eq("id", cityId)
    .maybeSingle();

  if (!scoredRow) return [];

  // Only show sources that are real connected APIs.
  const REAL_API_SOURCES: { key: string; column: string }[] = [
    { key: "census", column: "census_last_updated" },
    { key: "bls", column: "bls_last_updated" },
    { key: "apify", column: "apify_last_updated" },
    { key: "firecrawl", column: "firecrawl_last_updated" },
  ];

  const freshness = scoredRow as Record<string, string | null>;
  const rows: CitySourceRow[] = REAL_API_SOURCES
    .map(({ key, column }) => {
      const lastFetchedAt = freshness[column] ?? null;
      return {
        source: key,
        label: labelFor(key),
        status: (lastFetchedAt ? "success" : "never") as CitySourceRow["status"],
        lastFetchedAt,
        recordCount: lastFetchedAt ? 1 : 0,
        sourceUrl: null,
        errorMessage: null,
      };
    })
    .filter((r) => r.lastFetchedAt != null);

  return rows.sort((a, b) => a.label.localeCompare(b.label));
}


// ============================================================================
// Nearby Markets — same metro_area first, then same state fallback
// ============================================================================
export type NearbyMarket = {
  cityId: string;
  city: string;
  state: string;
  metroArea: string | null;
  county: string | null;
  compositeScore: number;
  tier: string;
  population: number;
};

export async function getNearbyMarkets(opts: {
  cityId: string;
  state: string;
  metroArea: string | null;
  limit?: number;
}): Promise<NearbyMarket[]> {
  const limit = opts.limit ?? 5;
  if (!opts.cityId) return [];

  type NearbyRow = Pick<
    ScoredCityRow,
    "id" | "city_name" | "state_name" | "state_abbr" | "metro_area" | "composite_score_default" | "population"
  >;
  const collected: NearbyRow[] = [];
  const seen = new Set<string>([opts.cityId]);
  const selectCols = "id, city_name, state_name, state_abbr, metro_area, composite_score_default, population";

  if (opts.metroArea) {
    const { data } = await supabase
      .from("us_cities_scored")
      .select(selectCols)
      .eq("metro_area", opts.metroArea)
      .gt("composite_score_default", 0)
      .neq("id", opts.cityId)
      .order("composite_score_default", { ascending: false })
      .limit(limit);
    ((data ?? []) as NearbyRow[]).forEach((row) => {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        collected.push(row);
      }
    });
  }

  if (collected.length < limit && opts.state) {
    const remaining = limit - collected.length;
    const { data } = await supabase
      .from("us_cities_scored")
      .select(selectCols)
      .eq("state_name", opts.state)
      .gt("composite_score_default", 0)
      .neq("id", opts.cityId)
      .order("composite_score_default", { ascending: false })
      .limit(remaining + seen.size);
    ((data ?? []) as NearbyRow[]).forEach((row) => {
      if (collected.length >= limit) return;
      if (!seen.has(row.id)) {
        seen.add(row.id);
        collected.push(row);
      }
    });
  }

  return collected.slice(0, limit).map((row) => {
    const composite = toNumber(row.composite_score_default, 0);
    return {
      cityId: row.id,
      city: row.city_name ?? "Unknown",
      state: normalizeState(row.state_name ?? row.state_abbr),
      metroArea: row.metro_area ?? null,
      county: null,
      compositeScore: composite,
      tier: tierFromScore(composite),
      population: toNumber(row.population, 0),
    };
  });
}

export function buildRankedMarketsCsv(markets: RankedMarket[]) {
  const rows = [
    ["Rank", "Market", "State", "Tier", "Composite Score", "Population", "Competitors", "Source", "Last Refreshed"],
    ...markets.map((market, index) => [
      String(index + 1),
      market.city,
      market.state,
      String(market.tier),
      String(market.compositeScore),
      market.population == null ? "" : String(market.population),
      market.competitorCount == null ? "" : String(market.competitorCount),
      market.source,
      market.lastScrapedAt ?? "",
    ]),
  ];

  return rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
}

export function downloadRankedMarketsCsv(markets: RankedMarket[]) {
  const csv = buildRankedMarketsCsv(markets);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ranked-markets-live-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
