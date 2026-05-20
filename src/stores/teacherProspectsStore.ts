import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SourceFilter } from "@/lib/teacherSourceLabels";

interface TeacherProspectsState {
  search: string;
  cityFilter: string;
  sourceFilter: SourceFilter;
  hideInOutreach: boolean;
  page: number;
  pageSize: number;

  setSearch: (v: string) => void;
  setCityFilter: (v: string) => void;
  setSourceFilter: (v: SourceFilter) => void;
  setHideInOutreach: (v: boolean) => void;
  setPage: (n: number) => void;
  setPageSize: (n: number) => void;
}

export const useTeacherProspectsStore = create<TeacherProspectsState>()(
  persist(
    (set) => ({
      search: "",
      cityFilter: "All",
      sourceFilter: "all",
      hideInOutreach: false,
      page: 1,
      pageSize: 25,
      setSearch: (v) => set({ search: v, page: 1 }),
      setCityFilter: (v) => set({ cityFilter: v, page: 1 }),
      setSourceFilter: (v) => set({ sourceFilter: v, page: 1 }),
      setHideInOutreach: (v) => set({ hideInOutreach: v, page: 1 }),
      setPage: (n) => set({ page: n }),
      setPageSize: (n) => set({ pageSize: n, page: 1 }),
    }),
    {
      name: "ng:teacher-prospects-v3",
      storage: createJSONStorage(() => localStorage),
      version: 3,
      partialize: (s) => ({
        search: s.search,
        cityFilter: s.cityFilter,
        sourceFilter: s.sourceFilter,
        hideInOutreach: s.hideInOutreach,
        pageSize: s.pageSize,
      }),
    },
  ),
);
