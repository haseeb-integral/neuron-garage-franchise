/* eslint-disable no-restricted-syntax */
// useCityRanking — single home for "take the live universe + the user's
// current weights/filters, return reranked rows + tier counts + map slice".
//
// This hook owns the few remaining raw `.compositeScore` reads on the page
// (sorts, reductions, the preview projection). The render tree should
// continue to read displayed composites through `row.view` (MarketView).
import { useMemo } from "react";
import {
  filterRankedMarkets,
  buildSeededFallbackSignalsFromScored,
  type RankedMarket,
} from "@/lib/cityScoringLiveData";
import { METRICS_BY_CATEGORY } from "@/lib/sowMetricRegistry";
import { parseSignalValue } from "@/lib/sowNormalize";
import { recomputeCategoryScore, recomputeComposite } from "@/lib/clientSubWeightScoring";
import {
  assignPercentileTiers,
} from "@/lib/cityTiers";
import {
  buildMarketView,
  beginDriftRender,
  assertNoCompositeDrift,
  weightsHash as buildWeightsHash,
} from "@/lib/marketView";
import { DEFAULT_WEIGHTS } from "@/stores/cityScoringStore";
import { DEFAULT_SUB_WEIGHTS } from "@/lib/sowMetricRegistry";
import { countLiveTiers } from "@/lib/cityScoringPageHelpers";
import type { TierCounts } from "@/components/city-scoring/TierCountsBar";

type CategoryKey = "demand" | "competitiveLandscape" | "franchiseeSupply";

export interface CityRankingFilters {
  searchTerm: string;
  stateFilter: string;
  tierFilter: string;
  nonRegOnly: boolean;
  minScore: number;
  minPop: string;
  cityFilter: string;
  watchlistOnly: boolean;
  watchlistCityIds: Set<string>;
}

export interface UseCityRankingArgs {
  baseRankedMarkets: RankedMarket[];
  appliedWeights: Record<string, number>;
  appliedSubWeights: Record<string, Record<string, number>>;
  weights: Record<string, number>;
  filters: CityRankingFilters;
}

export function useCityRanking({
  baseRankedMarkets,
  appliedWeights,
  appliedSubWeights,
  weights,
  filters,
}: UseCityRankingArgs) {
  const {
    searchTerm, stateFilter, tierFilter, nonRegOnly, minScore, minPop,
    cityFilter, watchlistOnly, watchlistCityIds,
  } = filters;

  const rerankedUniverse = useMemo(() => {
    beginDriftRender();
    const wHash = buildWeightsHash(appliedWeights, appliedSubWeights);

    const masterWeightsAreDefault = JSON.stringify(appliedWeights) === JSON.stringify(DEFAULT_WEIGHTS);
    const subWeightsAreDefault = JSON.stringify(appliedSubWeights) === JSON.stringify(DEFAULT_SUB_WEIGHTS);
    const reRanked = baseRankedMarkets.map((market) => {
      if (!market.hasLiveData || !market.categoryScores) return market;
      if (masterWeightsAreDefault && subWeightsAreDefault) return market;

      let cats: Record<CategoryKey, number | null>;

      if (subWeightsAreDefault) {
        cats = { ...market.categoryScores } as Record<CategoryKey, number | null>;
      } else {
        const seededSignalValues = Object.fromEntries(
          buildSeededFallbackSignalsFromScored(market.scoredRow).map((signal) => [
            signal.signal_key,
            parseSignalValue(signal.value),
          ]),
        );
        cats = {} as Record<CategoryKey, number | null>;
        (Object.keys(METRICS_BY_CATEGORY) as CategoryKey[]).forEach((key) => {
          cats[key] = recomputeCategoryScore(
            METRICS_BY_CATEGORY[key] ?? [],
            seededSignalValues,
            appliedSubWeights[key] ?? {},
            market.categoryScores?.[key] ?? null,
          ).score;
        });
      }

      const { composite } = recomputeComposite(cats, appliedWeights);
      // Brett-approved 2026-05-27: write recomputed pillar scores back onto
      // the row so the ranked-table small Dem/TAM/Opp cells AND the
      // RowScorePopover use the SAME numbers the selected-market panel,
      // compare modal, and exports already read. Fixes Nashville mismatch
      // (table row showed stored 100/79/68 while center panel showed
      // recomputed 72/78/67). "One calibrated number everywhere."
      return { ...market, compositeScore: composite, categoryScores: cats };
    });

    const tiered = assignPercentileTiers(reRanked);
    return tiered.map((m: any) => ({
      ...m,
      view: assertNoCompositeDrift(buildMarketView(m), wHash),
    }));
  }, [baseRankedMarkets, appliedWeights, appliedSubWeights]);

  const filtered = useMemo(() => {
    const base = filterRankedMarkets(rerankedUniverse, {
      searchTerm, stateFilter, tierFilter, nonRegOnly, minScore, minPop,
    });
    const q = cityFilter.trim().toLowerCase();
    let out = q ? base.filter((m: any) => String(m.city ?? "").toLowerCase().includes(q)) : base;
    if (watchlistOnly) {
      out = out.filter((m: any) => m.cityId && watchlistCityIds.has(m.cityId));
    }
    return out.sort((a: any, b: any) => {
      if (a.hasLiveData !== b.hasLiveData) return a.hasLiveData ? -1 : 1;
      if (a.hasLiveData) return b.compositeScore - a.compositeScore;
      return a.city.localeCompare(b.city);
    });
  }, [rerankedUniverse, searchTerm, stateFilter, tierFilter, nonRegOnly, minScore, minPop, cityFilter, watchlistOnly, watchlistCityIds]);

  const weightsPending = useMemo(
    () => JSON.stringify(weights) !== JSON.stringify(appliedWeights),
    [weights, appliedWeights],
  );

  const committedTierCounts = useMemo<TierCounts>(
    () => countLiveTiers(rerankedUniverse),
    [rerankedUniverse],
  );

  const liveScoredTotal = useMemo(
    () => rerankedUniverse.filter((m: any) => m.hasLiveData).length,
    [rerankedUniverse],
  );

  const filteredLiveCount = useMemo(
    () => filtered.filter((m: any) => m.hasLiveData).length,
    [filtered],
  );

  const previewTierCounts = useMemo<TierCounts | null>(() => {
    if (!weightsPending) return null;
    const previewUniverse = baseRankedMarkets.map((m: any) => {
      if (!m.hasLiveData) return m;
      const cats = m.categoryScores as Record<CategoryKey, number | null> | undefined;
      if (cats) {
        const { composite } = recomputeComposite(cats, weights);
        return { ...m, compositeScore: composite };
      }
      return { ...m, compositeScore: m.compositeScore ?? 0 };
    });
    return countLiveTiers(assignPercentileTiers(previewUniverse));
  }, [baseRankedMarkets, weights, weightsPending]);

  const tierBarExtras = useMemo(() => {
    const live = rerankedUniverse.filter((m: any) => m.hasLiveData);
    const n = live.length;
    if (n === 0) {
      return {
        avgScore: null as number | null,
        avgScorePreview: null as number | null,
        qualifiedPct: null as number | null,
        qualifiedPctPreview: null as number | null,
        topMarkets: [] as Array<{ label: string; score: number }>,
      };
    }
    const sum = live.reduce((s: number, m: any) => s + Number(m.compositeScore ?? 0), 0);
    const avgScore = sum / n;
    const ab = (committedTierCounts.A ?? 0) + (committedTierCounts.B ?? 0);
    const qualifiedPct = (ab / n) * 100;

    let previewAvg: number | null = null;
    let previewQualPct: number | null = null;
    if (weightsPending) {
      let pSum = 0;
      live.forEach((m: any) => {
        const cats = m.categoryScores as Record<CategoryKey, number | null> | undefined;
        if (cats) {
          const { composite } = recomputeComposite(cats, weights);
          pSum += composite;
        } else {
          pSum += Number(m.compositeScore ?? 0);
        }
      });
      previewAvg = pSum / n;
      if (previewTierCounts) {
        previewQualPct = ((previewTierCounts.A + previewTierCounts.B) / n) * 100;
      }
    }

    const topMarkets = [...live]
      .sort((a: any, b: any) => buildMarketView(b).composite - buildMarketView(a).composite)
      .slice(0, 12)
      .map((m: any) => ({
        label: `${m.city}, ${m.state}`,
        score: buildMarketView(m).composite,
      }));

    return {
      avgScore,
      avgScorePreview: previewAvg,
      qualifiedPct,
      qualifiedPctPreview: previewQualPct,
      topMarkets,
    };
  }, [rerankedUniverse, committedTierCounts, previewTierCounts, weights, weightsPending]);

  const mapMarkets = useMemo(() => {
    const base = filterRankedMarkets(baseRankedMarkets, {
      searchTerm, stateFilter,
      tierFilter: "All",
      nonRegOnly,
      minScore: 0,
      minPop,
    });
    const q = cityFilter.trim().toLowerCase();
    let out = q ? base.filter((m: any) => String(m.city ?? "").toLowerCase().includes(q)) : base;
    if (watchlistOnly) {
      out = out.filter((m: any) => m.cityId && watchlistCityIds.has(m.cityId));
    }
    return out;
  }, [baseRankedMarkets, searchTerm, stateFilter, nonRegOnly, minPop, cityFilter, watchlistOnly, watchlistCityIds]);

  const percentileById = useMemo(() => {
    const live = filtered.filter((m: any) => m.hasLiveData);
    const sorted = [...live].sort(
      (a: any, b: any) => Number(b.compositeScore ?? 0) - Number(a.compositeScore ?? 0),
    );
    const total = sorted.length;
    const map = new Map<string | number, number>();
    sorted.forEach((m: any, idx) => {
      const pct = total <= 1 ? 100 : Math.round((1 - idx / (total - 1)) * 100);
      map.set(m.id, pct);
    });
    return map;
  }, [filtered]);

  return {
    rerankedUniverse,
    filtered,
    weightsPending,
    committedTierCounts,
    liveScoredTotal,
    filteredLiveCount,
    previewTierCounts,
    tierBarExtras,
    mapMarkets,
    percentileById,
  };
}
