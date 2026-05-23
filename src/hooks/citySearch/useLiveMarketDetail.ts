// useLiveMarketDetail — owns every piece of "live, DB-backed market detail"
// state for /city-scoring. Split into two surfaces so the page can call each
// at the point in its render where its inputs are actually defined:
//
//   - useLiveRankedMarkets()           — mount-once load of the ranked universe
//   - useLiveSelectedMarket({...})     — cache-first detail for SELECTED market

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCached, setCached } from "@/lib/pageCache";
import {
  buildSeededFallbackSignalsFromScored,
  loadLiveRankedMarkets,
  type RankedMarket,
} from "@/lib/cityScoringLiveData";

// Façade-shaped rows. Kept as `any` to match the page's existing read sites,
// which reach into legacy `cities.*` fields too freely to type strictly today.
// Tightening is a follow-up.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LiveCityRow = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LiveSignalRow = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LiveJobRow = any;

type DetailCache = {
  city: LiveCityRow | null;
  signals: LiveSignalRow[];
  scores: Record<string, number>;
  comps: unknown[];
  job: LiveJobRow | null;
};

export function useLiveRankedMarkets() {
  const [liveRankedMarkets, setLiveRankedMarketsRaw] = useState<RankedMarket[]>(
    () => getCached<RankedMarket[]>("city:rankedMarkets") ?? [],
  );
  const setLiveRankedMarkets = useCallback((v: RankedMarket[]) => {
    setCached("city:rankedMarkets", v);
    setLiveRankedMarketsRaw(v);
  }, []);

  useEffect(() => {
    loadLiveRankedMarkets()
      .then(setLiveRankedMarkets)
      .catch((err) => console.error("loadLiveRankedMarkets error", err));
  }, [setLiveRankedMarkets]);

  return { liveRankedMarkets, setLiveRankedMarkets };
}

interface SelectedOptions {
  selectedCity: string | null | undefined;
  selectedState: string | null | undefined;
  selectedMarketKey: { city: string; state: string };
  setLiveRankedMarkets: (v: RankedMarket[]) => void;
}

export function useLiveSelectedMarket({
  selectedCity,
  selectedState,
  selectedMarketKey,
  setLiveRankedMarkets,
}: SelectedOptions) {
  const initialMarketKey = `${selectedMarketKey.city}|${selectedMarketKey.state}`;
  const initialDetail = getCached<DetailCache>(`city:detail:${initialMarketKey}`);

  const [liveCity, setLiveCity] = useState<LiveCityRow | null>(initialDetail?.city ?? null);
  const [liveSignals, setLiveSignals] = useState<LiveSignalRow[]>(initialDetail?.signals ?? []);
  const [liveCategoryScores, setLiveCategoryScores] = useState<Record<string, number>>(initialDetail?.scores ?? {});
  const [liveCompetitors, setLiveCompetitors] = useState<unknown[]>(initialDetail?.comps ?? []);
  const [liveJob, setLiveJob] = useState<LiveJobRow | null>(initialDetail?.job ?? null);
  const [marketRefreshVersion, setMarketRefreshVersion] = useState(0);

  const loadLiveData = useCallback(async (city: string, state: string) => {
    try {
      const stateAbbr = state === "Texas" ? "TX" : state === "Florida" ? "FL" : state;
      const { data: scoredRow } = await supabase
        .from("us_cities_scored")
        .select("*")
        .ilike("city_name", city)
        .or(`state_name.ilike.${state},state_abbr.ilike.${stateAbbr}`)
        .maybeSingle();

      if (!scoredRow) {
        setLiveCity(null);
        setLiveSignals([]);
        setLiveCategoryScores({});
        setLiveCompetitors([]);
        setLiveJob(null);
        return;
      }

      const density = Number(scoredRow.population_density ?? 0);
      const marketTypeDerived = density >= 3000 ? "Urban" : density >= 500 ? "Suburb" : "Rural";
      const composite = Number(scoredRow.composite_score_default ?? 0);
      const tierDerived =
        composite >= 80 ? "A" : composite >= 65 ? "B" : composite >= 50 ? "C" : "D";
      const pop = Number(scoredRow.population ?? 0);
      const kids = Number(scoredRow.children_5_12 ?? 0);
      const childrenPct = pop > 0 ? Math.round((kids / pop) * 1000) / 10 : null;
      const stateNormalized = state === "TX" ? "Texas" : state === "FL" ? "Florida" : state;

      // `cities`-shaped façade so downstream code keeps reading the same names.
      // `id` IS the us_cities_scored uuid — canonical cityId across watchlist,
      // drawer, report, and nearby panels.
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
      // CSI is stored as SATURATION (high = crowded = bad). Invert to
      // OPPORTUNITY (high = good) so all three categories share direction.
      if (scoredRow.score_csi != null) {
        scoresMap["competitive_landscape"] = Math.max(0, Math.min(100, 100 - Number(scoredRow.score_csi)));
      }

      // Legacy `city_market_signals` was severed on 2026-05-21. Evidence rows
      // are synthesized directly from us_cities_scored via the seeded fallback.
      const signals = buildSeededFallbackSignalsFromScored(scoredRow, childrenPct);
      const comps: unknown[] = [];
      const jobs: LiveJobRow[] = [];

      setLiveCity(cityRow);
      setLiveSignals(signals ?? []);
      setLiveCategoryScores(scoresMap);
      setLiveCompetitors(comps);
      setLiveJob(jobs[0] ?? null);
      setCached(`city:detail:${city}|${state}`, {
        city: cityRow,
        signals: signals ?? [],
        scores: scoresMap,
        comps,
        job: jobs[0] ?? null,
      });
    } catch (err) {
      console.error("loadLiveData error", err);
    }
  }, []);

  useEffect(() => {
    if (!selectedCity || !selectedState) return;
    const cached = getCached<DetailCache>(`city:detail:${selectedCity}|${selectedState}`);
    if (cached) {
      setLiveCity(cached.city);
      setLiveSignals(cached.signals);
      setLiveCategoryScores(cached.scores);
      setLiveCompetitors(cached.comps);
      setLiveJob(cached.job);
    } else {
      setLiveCity(null);
      setLiveSignals([]);
      setLiveCategoryScores({});
      setLiveCompetitors([]);
      setLiveJob(null);
    }
    loadLiveData(selectedCity, selectedState);
  }, [selectedCity, selectedState, loadLiveData]);

  const reloadSelectedMarketView = useCallback(async (city: string, state: string) => {
    await Promise.all([
      loadLiveData(city, state),
      loadLiveRankedMarkets()
        .then(setLiveRankedMarkets)
        .catch((err) => console.error("loadLiveRankedMarkets after refresh failed", err)),
    ]);
  }, [loadLiveData, setLiveRankedMarkets]);

  const bumpRefresh = useCallback(() => setMarketRefreshVersion((v) => v + 1), []);

  return {
    liveCity,
    liveSignals,
    liveCategoryScores,
    liveCompetitors,
    liveJob,
    marketRefreshVersion,
    bumpRefresh,
    reloadSelectedMarketView,
  };
}
