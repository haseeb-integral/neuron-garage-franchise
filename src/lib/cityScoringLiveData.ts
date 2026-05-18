import { supabase } from "@/integrations/supabase/client";
import { CityData, sampleCities } from "@/data/cityData";

export type RankedMarket = {
  id: number;
  cityId?: string;
  city: string;
  state: string;
  county?: string | null;
  metroArea?: string | null;
  tier: "A" | "B" | "C" | "D" | string;
  compositeScore: number;
  population: number;
  competitorCount: number;
  marketType?: string | null;
  isNonRegistration: boolean;
  lastScrapedAt?: string | null;
  source: "live" | "sample";
  hasLiveData: boolean;
  sample?: CityData;
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

export function tierFromScore(score: number): "A" | "B" | "C" | "D" {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  return "D";
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

export function mapLiveCityToRankedMarket(row: any, index: number, competitorCount = 0): RankedMarket {
  const state = normalizeState(row.state);
  const compositeScore = toNumber(row.composite_score, 0);
  const hasLiveData = compositeScore > 0 || !!row.last_scraped_at;
  return {
    id: 100000 + index,
    cityId: row.id,
    city: row.city ?? "Unknown",
    state,
    county: row.county ?? null,
    metroArea: row.metro_area ?? null,
    tier: row.tier ?? tierFromScore(compositeScore),
    compositeScore,
    population: toNumber(row.population, 0),
    competitorCount,
    marketType: row.market_type ?? null,
    isNonRegistration: NON_REGISTRATION_STATES.has(state),
    lastScrapedAt: row.last_scraped_at ?? null,
    source: "live",
    hasLiveData,
  };
}

export function mapSampleCityToRankedMarket(city: CityData): RankedMarket {
  return {
    id: city.id,
    city: city.city,
    state: city.state,
    county: (city as any).county,
    metroArea: (city as any).metroArea,
    tier: city.tier,
    compositeScore: city.compositeScore,
    population: city.population,
    competitorCount: city.competitorCount,
    marketType: (city as any).marketType,
    isNonRegistration: city.isNonRegistration,
    source: "sample",
    hasLiveData: false,
    sample: city,
  };
}

function marketTypeFromDensity(density: number): string {
  // Per locked Q1: Urban ≥ 3000/km², Suburb 500-3000, Rural < 500.
  if (density >= 3000) return "Urban";
  if (density >= 500) return "Suburb";
  return "Rural";
}

export async function loadLiveRankedMarkets(): Promise<RankedMarket[]> {
  // Canonical source: us_cities_scored (Sam's pre-seeded ~948-city dataset).
  // `cityId` now references us_cities_scored.id (not legacy cities.id) so the
  // watchlist + drawer + compare are all keyed on the same uuid space.
  const { data: scoredRows, error: scoredErr } = await supabase
    .from("us_cities_scored")
    .select(
      "id, city_name, state_name, state_abbr, metro_area, population, population_density, composite_score_default, score_demand, score_pricing_power, score_competitive, score_franchise_supply, score_ease_of_operation, score_parent_mindset, is_registration_state, scored_at, summer_camp_count",
    )
    .order("composite_score_default", { ascending: false, nullsFirst: false })
    .limit(2000);

  if (scoredErr) {
    console.error("loadLiveRankedMarkets us_cities_scored error", scoredErr);
    return [];
  }
  if (!scoredRows?.length) return [];

  const mapped: RankedMarket[] = scoredRows.map((row: any, index: number) => {
    const state = normalizeState(row.state_name ?? row.state_abbr);
    const city = row.city_name ?? "Unknown";
    const composite = toNumber(row.composite_score_default, 0);
    const hasLiveData = composite > 0;
    const density = toNumber(row.population_density, 0);
    return {
      id: 200000 + index,
      cityId: row.id, // us_cities_scored.id is now canonical
      city,
      state,
      county: null,
      metroArea: row.metro_area ?? null,
      tier: tierFromScore(composite),
      compositeScore: composite,
      population: toNumber(row.population, 0),
      competitorCount: toNumber(row.summer_camp_count, 0),
      marketType: marketTypeFromDensity(density),
      isNonRegistration: row.is_registration_state === false,
      lastScrapedAt: row.scored_at ?? null,
      source: "live",
      hasLiveData,
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
        if (minPopulation && market.population < minPopulation) return false;
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

  const [{ data: jobs }, { data: signals }] = await Promise.all([
    supabase
      .from("city_fetch_jobs")
      .select("source, status, started_at, completed_at, created_at, error_message, response_summary")
      .eq("city_id", cityId)
      .order("created_at", { ascending: false }),
    supabase
      .from("city_market_signals")
      .select("source, source_url, updated_at")
      .eq("city_id", cityId),
  ]);

  // Latest job per source.
  const latestJobBySource = new Map<string, any>();
  (jobs ?? []).forEach((j: any) => {
    if (!j.source) return;
    if (!latestJobBySource.has(j.source)) latestJobBySource.set(j.source, j);
  });

  // Signals grouped by source: count + latest URL + latest update.
  const signalAgg = new Map<string, { count: number; url: string | null; latest: string | null }>();
  (signals ?? []).forEach((s: any) => {
    const src = s.source;
    if (!src) return;
    const cur = signalAgg.get(src) ?? { count: 0, url: null, latest: null };
    cur.count += 1;
    if (s.source_url && !cur.url) cur.url = s.source_url;
    if (s.updated_at && (!cur.latest || s.updated_at > cur.latest)) cur.latest = s.updated_at;
    signalAgg.set(src, cur);
  });

  // Only show sources that are real connected APIs. Hide proxy/seed/computed sources entirely.
  const REAL_API_SOURCES = new Set(["census", "bls", "apify", "firecrawl"]);
  const allSources = new Set<string>(
    [...latestJobBySource.keys(), ...signalAgg.keys()].filter((s) => REAL_API_SOURCES.has(s)),
  );
  if (allSources.size === 0) return [];

  return Array.from(allSources).map((source) => {
    const job = latestJobBySource.get(source);
    const sig = signalAgg.get(source);
    const status: CitySourceRow["status"] = job ? jobStatusToRowStatus(job.status) : sig ? "success" : "never";
    const lastFetchedAt = job?.completed_at ?? job?.started_at ?? job?.created_at ?? sig?.latest ?? null;
    return {
      source,
      label: labelFor(source),
      status,
      lastFetchedAt,
      recordCount: sig?.count ?? 0,
      sourceUrl: sig?.url ?? null,
      errorMessage: job?.error_message ?? null,
    };
  }).sort((a, b) => a.label.localeCompare(b.label));
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

  const collected: any[] = [];
  const seen = new Set<string>([opts.cityId]);

  if (opts.metroArea) {
    const { data } = await supabase
      .from("cities")
      .select("id, city, state, metro_area, county, composite_score, tier, population")
      .eq("metro_area", opts.metroArea)
      .gt("composite_score", 0)
      .neq("id", opts.cityId)
      .order("composite_score", { ascending: false })
      .limit(limit);
    (data ?? []).forEach((row: any) => {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        collected.push(row);
      }
    });
  }

  if (collected.length < limit && opts.state) {
    const remaining = limit - collected.length;
    const { data } = await supabase
      .from("cities")
      .select("id, city, state, metro_area, county, composite_score, tier, population")
      .eq("state", opts.state)
      .gt("composite_score", 0)
      .neq("id", opts.cityId)
      .order("composite_score", { ascending: false })
      .limit(remaining + seen.size);
    (data ?? []).forEach((row: any) => {
      if (collected.length >= limit) return;
      if (!seen.has(row.id)) {
        seen.add(row.id);
        collected.push(row);
      }
    });
  }

  return collected.slice(0, limit).map((row: any) => ({
    cityId: row.id,
    city: row.city,
    state: normalizeState(row.state),
    metroArea: row.metro_area ?? null,
    county: row.county ?? null,
    compositeScore: toNumber(row.composite_score, 0),
    tier: row.tier ?? tierFromScore(toNumber(row.composite_score, 0)),
    population: toNumber(row.population, 0),
  }));
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
      String(market.population),
      String(market.competitorCount),
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
