import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { sampleCities } from "@/data/cityData";
import { DEFAULT_SUB_WEIGHTS } from "@/lib/sowMetricRegistry";

export type CategoryKey =
  | "demand"
  | "competitiveLandscape"
  | "franchiseeSupply";

// Per Sam+Brett May 21, 2026: 6→3 category reshape FINAL purge (v9).
// Retired categories (pricingPower, easeOfOperations, parentMindset)
// have been fully removed from the type. The persist migrate() below
// strips any leftover retired keys from localStorage for users who had
// the older 6-key store.
export const RETIRED_CATEGORY_KEYS = [
  "pricingPower",
  "easeOfOperations",
  "parentMindset",
] as const;

// Tier 1 rework Phase 2 (Sam+Brett 2026-07-07): composite = Demand + TAM only.
// Demand 40 : franchiseeSupply 30 → rescale to sum to 100 → 57 / 43.
// competitiveLandscape kept in the type for now (Phase 3 removes the UI),
// but its weight is 0 and `recomputeComposite` force-drops it either way.
export const DEFAULT_WEIGHTS: Record<CategoryKey, number> = {
  demand: 57,
  competitiveLandscape: 0,
  franchiseeSupply: 43,
};


export type SubWeights = Record<CategoryKey, Record<string, number>>;

const cloneSubWeights = (src: SubWeights): SubWeights => {
  const out = {} as SubWeights;
  (Object.keys(src) as CategoryKey[]).forEach((k) => {
    out[k] = { ...src[k] };
  });
  return out;
};

export interface CustomCriterion {
  name: string;
  category: string;
  weight: number;
  source: string;
  notes: string;
}

interface MarketKey {
  city: string;
  state: string;
}

interface CityScoringState {
  // Search / model
  searchTerm: string;
  scoringModel: string;

  // Filters
  stateFilter: string;
  minPop: string;
  minScore: number;
  tierFilter: string;
  nonRegOnly: boolean;

  // Weights
  weights: Record<CategoryKey, number>;
  appliedWeights: Record<CategoryKey, number>;
  customCriteria: CustomCriterion[];

  // Sub-metric weights (display + persist only; do NOT affect composite yet)
  subWeights: SubWeights;
  appliedSubWeights: SubWeights;

  // Selection
  selectedId: number;
  selectedMarketKey: MarketKey;
  selectedForCompare: number[];
  compareMode: boolean;

  // View
  viewMode: "table" | "map";
  page: number;

  // Setters
  setSearchTerm: (v: string) => void;
  setScoringModel: (v: string) => void;
  setStateFilter: (v: string) => void;
  setMinPop: (v: string) => void;
  setMinScore: (v: number) => void;
  setTierFilter: (v: string) => void;
  setNonRegOnly: (v: boolean) => void;
  setWeights: (v: Record<CategoryKey, number> | ((prev: Record<CategoryKey, number>) => Record<CategoryKey, number>)) => void;
  setAppliedWeights: (v: Record<CategoryKey, number>) => void;
  setCustomCriteria: (v: CustomCriterion[] | ((prev: CustomCriterion[]) => CustomCriterion[])) => void;
  setSubWeight: (category: CategoryKey, metricKey: string, value: number) => void;
  setAppliedSubWeights: (v: SubWeights) => void;
  resetSubWeights: () => void;
  setSelectedId: (id: number) => void;
  setSelectedMarketKey: (k: MarketKey) => void;
  setSelectedForCompare: (v: number[] | ((prev: number[]) => number[])) => void;
  setCompareMode: (v: boolean) => void;
  setViewMode: (v: "table" | "map") => void;
  setPage: (v: number | ((prev: number) => number)) => void;
}

const firstCity = sampleCities[0];

export const useCityScoringStore = create<CityScoringState>()(
  persist(
    (set) => ({
      searchTerm: "",
      scoringModel: "Affluent Suburbs Model",
      stateFilter: "All",
      minPop: "34000",
      minScore: 0,
      tierFilter: "All",
      nonRegOnly: false,
      weights: { ...DEFAULT_WEIGHTS },
      appliedWeights: { ...DEFAULT_WEIGHTS },
      customCriteria: [],
      subWeights: cloneSubWeights(DEFAULT_SUB_WEIGHTS),
      appliedSubWeights: cloneSubWeights(DEFAULT_SUB_WEIGHTS),
      selectedId: firstCity?.id ?? 1,
      selectedMarketKey: { city: firstCity?.city ?? "", state: firstCity?.state ?? "" },
      selectedForCompare: [],
      compareMode: false,
      viewMode: "table",
      page: 1,

      setSearchTerm: (v) => set({ searchTerm: v }),
      setScoringModel: (v) => set({ scoringModel: v }),
      setStateFilter: (v) => set({ stateFilter: v }),
      setMinPop: (v) => set({ minPop: v }),
      setMinScore: (v) => set({ minScore: v }),
      setTierFilter: (v) => set({ tierFilter: v }),
      setNonRegOnly: (v) => set({ nonRegOnly: v }),
      setWeights: (v) => set((s) => ({ weights: typeof v === "function" ? v(s.weights) : v })),
      setAppliedWeights: (v) => set({ appliedWeights: v }),
      setCustomCriteria: (v) => set((s) => ({ customCriteria: typeof v === "function" ? v(s.customCriteria) : v })),
      setSubWeight: (category, metricKey, value) =>
        set((s) => {
          // No upper bound: sub-weights express relative importance and are
          // auto-normalized to 100% within each category on Apply.
          const clamped = Math.max(0, Math.round(value || 0));
          return {
            subWeights: {
              ...s.subWeights,
              [category]: { ...s.subWeights[category], [metricKey]: clamped },
            },
          };
        }),
      setAppliedSubWeights: (v) => set({ appliedSubWeights: cloneSubWeights(v) }),
      resetSubWeights: () =>
        set({
          subWeights: cloneSubWeights(DEFAULT_SUB_WEIGHTS),
          appliedSubWeights: cloneSubWeights(DEFAULT_SUB_WEIGHTS),
        }),
      setSelectedId: (id) => set({ selectedId: id }),
      setSelectedMarketKey: (k) => set({ selectedMarketKey: k }),
      setSelectedForCompare: (v) => set((s) => ({ selectedForCompare: typeof v === "function" ? v(s.selectedForCompare) : v })),
      setCompareMode: (v) => set({ compareMode: v }),
      setViewMode: (v) => set({ viewMode: v }),
      setPage: (v) => set((s) => ({ page: typeof v === "function" ? v(s.page) : v })),
    }),
    {
      name: "ng:city-scoring-v1",
      storage: createJSONStorage(() => localStorage),
      version: 12,
      migrate: (persisted: any, version) => {
        if (!persisted) return persisted;
        if (version < 2) {
          persisted.subWeights = cloneSubWeights(DEFAULT_SUB_WEIGHTS);
          persisted.appliedSubWeights = cloneSubWeights(DEFAULT_SUB_WEIGHTS);
        }
        if (version < 4) {
          persisted.minPop = "0";
          persisted.minScore = 0;
          persisted.tierFilter = "All";
          persisted.nonRegOnly = false;
          persisted.page = 1;
        }
        if (version < 5) {
          persisted.weights = { ...DEFAULT_WEIGHTS };
          persisted.appliedWeights = { ...DEFAULT_WEIGHTS };
        }
        if (version < 6 || version < 7 || version < 8) {
          persisted.subWeights = cloneSubWeights(DEFAULT_SUB_WEIGHTS);
          persisted.appliedSubWeights = cloneSubWeights(DEFAULT_SUB_WEIGHTS);
        }
        if (version < 9) {
          // v9 (Sam+Brett May 21, 2026 — final purge): strip the 3 retired
          // category keys from every persisted weight bag so the rehydrated
          // store matches the new 3-key CategoryKey union.
          const strip = (obj: any) => {
            if (!obj || typeof obj !== "object") return obj;
            RETIRED_CATEGORY_KEYS.forEach((k) => { delete obj[k]; });
            return obj;
          };
          strip(persisted.weights);
          strip(persisted.appliedWeights);
          strip(persisted.subWeights);
          strip(persisted.appliedSubWeights);
        }
        if (version < 10) {
          // v10 (May 26, 2026): selectedForCompare is no longer persisted.
          // Drop any leftover ids so the Compare modal can never open with
          // stale checked rows from a prior session.
          delete persisted.selectedForCompare;
        }
        if (version < 11) {
          // v11 (Jul 7, 2026): default minPop raised from 0 → 34000 so the
          // City Search table + exports match the Manus 817-city universe.
          // Force-reset any persisted value so returning users see 817 too.
          persisted.minPop = "34000";
        }
        if (version < 12) {
          // v12 (Jul 8, 2026, Phase 3): Affluent Families with Children joined
          // the Demand pillar. Reset ONLY Demand sub-weights to the new 5-key
          // defaults (30/30/25/10/5); leave Competitive + TAM untouched.
          const nextDemand = { ...DEFAULT_SUB_WEIGHTS.demand };
          if (persisted.subWeights && typeof persisted.subWeights === "object") {
            persisted.subWeights.demand = nextDemand;
          }
          if (persisted.appliedSubWeights && typeof persisted.appliedSubWeights === "object") {
            persisted.appliedSubWeights.demand = { ...nextDemand };
          }
        }

        return persisted;
      },
      partialize: (s) => ({
        searchTerm: s.searchTerm,
        scoringModel: s.scoringModel,
        stateFilter: s.stateFilter,
        minPop: s.minPop,
        minScore: s.minScore,
        tierFilter: s.tierFilter,
        nonRegOnly: s.nonRegOnly,
        weights: s.weights,
        appliedWeights: s.appliedWeights,
        customCriteria: s.customCriteria,
        subWeights: s.subWeights,
        appliedSubWeights: s.appliedSubWeights,
        selectedId: s.selectedId,
        selectedMarketKey: s.selectedMarketKey,
        // selectedForCompare intentionally NOT persisted — checked rows from a
        // prior session were leaking into the Compare modal (May 26 bug: user
        // selected 2, modal opened with 4). Compare is an ephemeral action.
        compareMode: s.compareMode,
        viewMode: s.viewMode,
        page: s.page,
      }),
    },
  ),
);
