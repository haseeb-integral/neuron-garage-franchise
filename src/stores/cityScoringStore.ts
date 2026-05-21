import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { sampleCities } from "@/data/cityData";
import { DEFAULT_SUB_WEIGHTS } from "@/lib/sowMetricRegistry";

export type CategoryKey =
  | "demand"
  | "pricingPower"
  | "competitiveLandscape"
  | "franchiseeSupply"
  | "easeOfOperations"
  | "parentMindset";

// Per Sam+Brett May 21, 2026: 6→3 category reshape. Retired categories
// (pricingPower, easeOfOperations, parentMindset) default to weight 0 and
// are hidden in the UI via VISIBLE_CATEGORIES (CityScoring.tsx). Kept in
// the type for store stability — full removal in a follow-up refactor.
export const DEFAULT_WEIGHTS: Record<CategoryKey, number> = {
  demand: 40,
  pricingPower: 0,
  competitiveLandscape: 30,
  franchiseeSupply: 30,
  easeOfOperations: 0,
  parentMindset: 0,
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
      minPop: "0",
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
      version: 7,
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
          // 6→3 category reshape (Sam+Brett May 21, 2026). Reset master
          // weights to the new 40/30/30 default; zero out retired keys.
          persisted.weights = { ...DEFAULT_WEIGHTS };
          persisted.appliedWeights = { ...DEFAULT_WEIGHTS };
        }
        if (version < 6) {
          // Reseed sub-weights so franchiseeSupply (TAM Teachers) gets its
          // 5-metric default (was {} → caused "server fallback" wording).
          persisted.subWeights = cloneSubWeights(DEFAULT_SUB_WEIGHTS);
          persisted.appliedSubWeights = cloneSubWeights(DEFAULT_SUB_WEIGHTS);
        }
        if (version < 7) {
          // CSI 3-metric lock (Brett+Haseeb 2026-05-21). The old 7-metric
          // competitive_landscape sub-weights (summer_camps_per_10k_children,
          // stem_robotics_maker_camp_count, etc.) are gone — reseed so the
          // new csi_national_brand_supply / csi_local_camp_estimate /
          // csi_demand_adjusted_market defaults take effect.
          persisted.subWeights = cloneSubWeights(DEFAULT_SUB_WEIGHTS);
          persisted.appliedSubWeights = cloneSubWeights(DEFAULT_SUB_WEIGHTS);
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
        selectedForCompare: s.selectedForCompare,
        compareMode: s.compareMode,
        viewMode: s.viewMode,
        page: s.page,
      }),
    },
  ),
);
