import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SourceFilter } from "@/lib/teacherSourceLabels";

interface TeacherProspectsState {
  search: string;
  /** Empty array = "All cities". Length ≥ 1 = active multi-select. */
  cityFilters: string[];
  sourceFilter: SourceFilter;
  hideInOutreach: boolean;
  page: number;
  pageSize: number;

  setSearch: (v: string) => void;
  setCityFilters: (v: string[]) => void;
  addCityFilter: (v: string) => void;
  removeCityFilter: (v: string) => void;
  clearCityFilters: () => void;
  setSourceFilter: (v: SourceFilter) => void;
  setHideInOutreach: (v: boolean) => void;
  setPage: (n: number) => void;
  setPageSize: (n: number) => void;
}

export const useTeacherProspectsStore = create<TeacherProspectsState>()(
  persist(
    (set) => ({
      search: "",
      cityFilters: [],
      sourceFilter: "all",
      hideInOutreach: false,
      page: 1,
      pageSize: 25,
      setSearch: (v) => set({ search: v, page: 1 }),
      setCityFilters: (v) => set({ cityFilters: Array.from(new Set(v.filter(Boolean))), page: 1 }),
      addCityFilter: (v) =>
        set((s) => (s.cityFilters.includes(v) ? s : { cityFilters: [...s.cityFilters, v], page: 1 })),
      removeCityFilter: (v) =>
        set((s) => ({ cityFilters: s.cityFilters.filter((c) => c !== v), page: 1 })),
      clearCityFilters: () => set({ cityFilters: [], page: 1 }),
      setSourceFilter: (v) => set({ sourceFilter: v, page: 1 }),
      setHideInOutreach: (v) => set({ hideInOutreach: v, page: 1 }),
      setPage: (n) => set({ page: n }),
      setPageSize: (n) => set({ pageSize: n, page: 1 }),
    }),
    {
      name: "ng:teacher-prospects-v4",
      storage: createJSONStorage(() => localStorage),
      version: 4,
      migrate: (persisted: unknown, version) => {
        // v3 → v4: cityFilter:string → cityFilters:string[]
        if (version < 4 && persisted && typeof persisted === "object") {
          const p = persisted as Record<string, unknown>;
          const legacy = typeof p.cityFilter === "string" ? (p.cityFilter as string) : "";
          const cityFilters = legacy && legacy !== "All" ? [legacy] : [];
          return { ...p, cityFilters } as unknown as TeacherProspectsState;
        }
        return persisted as TeacherProspectsState;
      },
      partialize: (s) => ({
        search: s.search,
        // cityFilters intentionally NOT persisted — Teacher Search should start with no city scope.
        sourceFilter: s.sourceFilter,
        hideInOutreach: s.hideInOutreach,
        pageSize: s.pageSize,
      }),
    },
  ),
);
