import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { sampleCities } from "@/data/cityData";

export type CategoryKey =
  | "demand"
  | "pricingPower"
  | "competitiveLandscape"
  | "franchiseeSupply"
  | "easeOfOperations"
  | "parentMindset";

export const DEFAULT_WEIGHTS: Record<CategoryKey, number> = {
  demand: 25,
  pricingPower: 20,
  competitiveLandscape: 20,
  franchiseeSupply: 15,
  easeOfOperations: 10,
  parentMindset: 10,
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
      minPop: "25000",
      minScore: 35,
      tierFilter: "All",
      nonRegOnly: false,
      weights: { ...DEFAULT_WEIGHTS },
      appliedWeights: { ...DEFAULT_WEIGHTS },
      customCriteria: [],
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
      version: 1,
      // Persist only UI state — exclude the setters
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
