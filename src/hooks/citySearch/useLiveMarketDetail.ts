// useLiveMarketDetail — React Query-backed live market detail for /city-scoring.
//
// Surfaces (unchanged public API):
//   - useLiveRankedMarkets()           — full ranked universe, dedup'd + cached
//   - useLiveSelectedMarket({...})     — detail for SELECTED market, cache-first
//
// Migrated from a hand-rolled module-level Map (`pageCache`) to React Query so:
//   - Concurrent callers dedupe the same fetch
//   - Re-mount / tab-switch shows cached data instantly with background refetch
//   - Invalidation is centralized (`reloadSelectedMarketView` invalidates both keys)

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  buildSeededFallbackSignalsFromScored,
  loadLiveRankedMarkets,
  type RankedMarket,
} from "@/lib/cityScoringLiveData";
import { competitiveOpportunityFromCsi } from "@/lib/marketView";


// Façade-shaped rows. Kept loose to match the page's existing read sites,
// which reach into legacy `cities.*` fields too freely to type strictly today.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LiveCityRow = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LiveSignalRow = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LiveJobRow = any;

type DetailPayload = {
  city: LiveCityRow | null;
  signals: LiveSignalRow[];
  scores: Record<string, number>;
  comps: unknown[];
  job: LiveJobRow | null;
};

const EMPTY_DETAIL: DetailPayload = { city: null, signals: [], scores: {}, comps: [], job: null };

const rankedKey = ["city", "rankedMarkets"] as const;
const detailKey = (city: string, state: string) => ["city", "detail", city, state] as const;

// --- Detail fetcher (extracted so React Query owns lifecycle) -----------------
async function fetchSelectedMarketDetail(city: string, state: string): Promise<DetailPayload> {
  const stateAbbr = state === "Texas" ? "TX" : state === "Florida" ? "FL" : state;
  const { data: scoredRow } = await supabase
    .from("us_cities_scored")
    .select("*")
    .ilike("city_name", city)
    .or(`state_name.ilike.${state},state_abbr.ilike.${stateAbbr}`)
    .maybeSingle();

  if (!scoredRow) return EMPTY_DETAIL;

  const density = Number(scoredRow.population_density ?? 0);
  const marketTypeDerived = density >= 3000 ? "Urban" : density >= 500 ? "Suburb" : "Rural";
  const composite = Number(scoredRow.composite_score_default ?? 0);
  const tierDerived = composite >= 80 ? "A" : composite >= 65 ? "B" : composite >= 50 ? "C" : "D";
  const pop = Number(scoredRow.population ?? 0);
  const kids = Number(scoredRow.children_5_12 ?? 0);
  const childrenPct = pop > 0 ? Math.round((kids / pop) * 1000) / 10 : null;
  const stateNormalized = state === "TX" ? "Texas" : state === "FL" ? "Florida" : state;

  const cityRow: LiveCityRow = {
    id: scoredRow.id,
    city: scoredRow.city_name,
    state: stateNormalized,
    composite_score: composite,
    tier: tierDerived,
    population: pop,
    // competitor_count removed 2026-05-22 — summer_camp_count 0/817 populated.
    competitor_count: null,
    county: scoredRow.county_name ?? null,
    metro_area: scoredRow.metro_area ?? null,
    metro_counties: Array.isArray(scoredRow.metro_counties) ? scoredRow.metro_counties : null,
    market_type: marketTypeDerived,
    last_scraped_at: scoredRow.scored_at ?? null,
    notes: null,
    median_income: scoredRow.median_household_income ?? null,
    children_pct: childrenPct,
    elementary_schools: scoredRow.public_elementary_count ?? null,
    latitude: scoredRow.latitude ?? null,
    longitude: scoredRow.longitude ?? null,
    is_non_registration: scoredRow.is_registration_state === false,
    scored: scoredRow,
  };

  const scoresMap: Record<string, number> = {};
  const addScore = (k: string, v: unknown) => {
    if (v != null) scoresMap[k] = Number(v);
  };
  addScore("demand", scoredRow.score_demand);
  addScore("tam_teachers", scoredRow.score_tam_teachers);
  // CSI saturation → Competitive Opportunity via the single shared helper.
  // Never inline `100 - score_csi` here — go through competitiveOpportunityFromCsi.
  const oppRaw = competitiveOpportunityFromCsi(scoredRow.score_csi as number | null | undefined);
  if (oppRaw != null) scoresMap["competitive_landscape"] = oppRaw;


  // Legacy `city_market_signals` was severed on 2026-05-21. Evidence rows
  // are synthesized directly from us_cities_scored via the seeded fallback.
  const signals = buildSeededFallbackSignalsFromScored(scoredRow, childrenPct);

  return {
    city: cityRow,
    signals: signals ?? [],
    scores: scoresMap,
    comps: [],
    job: null,
  };
}

// --- Hook 1: ranked universe -------------------------------------------------
export function useLiveRankedMarkets() {
  const qc = useQueryClient();
  const query = useQuery<RankedMarket[]>({
    queryKey: [...rankedKey],
    queryFn: () => loadLiveRankedMarkets(),
    staleTime: 60_000,
    // Keep previous data on refetch so the list never flashes empty.
    placeholderData: (prev) => prev,
  });

  const liveRankedMarkets = query.data ?? [];

  const setLiveRankedMarkets = useCallback(
    (v: RankedMarket[]) => {
      qc.setQueryData(rankedKey, v);
    },
    [qc],
  );

  return {
    liveRankedMarkets,
    setLiveRankedMarkets,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: () => query.refetch(),
  };
}

interface SelectedOptions {
  selectedCity: string | null | undefined;
  selectedState: string | null | undefined;
  selectedMarketKey: { city: string; state: string };
  // Accepted for backward compat; ranked invalidation now goes through React Query.
  setLiveRankedMarkets?: (v: RankedMarket[]) => void;
}

// --- Hook 2: selected market detail -----------------------------------------
export function useLiveSelectedMarket({
  selectedCity,
  selectedState,
}: SelectedOptions) {
  const qc = useQueryClient();

  const city = selectedCity ?? "";
  const state = selectedState ?? "";
  const enabled = Boolean(city && state);

  const query = useQuery<DetailPayload>({
    queryKey: [...detailKey(city, state)],
    queryFn: () => fetchSelectedMarketDetail(city, state),
    enabled,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const detail = query.data ?? EMPTY_DETAIL;

  const [marketRefreshVersion, setMarketRefreshVersion] = useState(0);

  const reloadSelectedMarketView = useCallback(
    async (c: string, s: string) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: detailKey(c, s) }),
        qc.invalidateQueries({ queryKey: rankedKey }),
      ]);
    },
    [qc],
  );

  const bumpRefresh = useCallback(() => setMarketRefreshVersion((v) => v + 1), []);

  // Memoize the return object so consumers that depend on it don't
  // re-render on unrelated React Query internal updates.
  return useMemo(
    () => ({
      liveCity: detail.city,
      liveSignals: detail.signals,
      liveCategoryScores: detail.scores,
      liveCompetitors: detail.comps,
      liveJob: detail.job,
      marketRefreshVersion,
      bumpRefresh,
      reloadSelectedMarketView,
    }),
    [detail, marketRefreshVersion, bumpRefresh, reloadSelectedMarketView],
  );
}
