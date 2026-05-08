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
  if (score >= 85) return "A";
  if (score >= 75) return "B";
  if (score >= 65) return "C";
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
    sample: city,
  };
}

export async function loadLiveRankedMarkets(): Promise<RankedMarket[]> {
  const { data: cityRows, error } = await supabase
    .from("cities")
    .select("*")
    .order("composite_score", { ascending: false });

  if (error) {
    console.error("loadLiveRankedMarkets cities error", error);
    return [];
  }

  if (!cityRows?.length) return [];

  const cityIds = cityRows.map((row: any) => row.id).filter(Boolean);
  const competitorCounts = new Map<string, number>();

  if (cityIds.length) {
    const { data: competitors, error: compError } = await supabase
      .from("city_competitors")
      .select("city_id")
      .in("city_id", cityIds);

    if (compError) {
      console.error("loadLiveRankedMarkets competitors error", compError);
    } else {
      (competitors ?? []).forEach((row: any) => {
        competitorCounts.set(row.city_id, (competitorCounts.get(row.city_id) ?? 0) + 1);
      });
    }
  }

  return cityRows.map((row: any, index: number) =>
    mapLiveCityToRankedMarket(row, index, competitorCounts.get(row.id) ?? 0),
  );
}

export function filterRankedMarkets(markets: RankedMarket[], filters: RankedMarketFilters) {
  const minPopulation = Number(filters.minPop || 0);
  return markets
    .filter((market) => {
      const haystack = `${market.city} ${market.state} ${market.county ?? ""} ${market.metroArea ?? ""}`.toLowerCase();
      if (filters.searchTerm && !haystack.includes(filters.searchTerm.toLowerCase())) return false;
      if (filters.stateFilter !== "All" && market.state !== filters.stateFilter) return false;
      if (filters.tierFilter !== "All" && market.tier !== filters.tierFilter) return false;
      if (filters.nonRegOnly && !market.isNonRegistration) return false;
      if (market.compositeScore < filters.minScore) return false;
      if (minPopulation && market.population < minPopulation) return false;
      return true;
    })
    .sort((a, b) => b.compositeScore - a.compositeScore);
}

export function sampleRankedMarkets() {
  return sampleCities.map(mapSampleCityToRankedMarket);
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
