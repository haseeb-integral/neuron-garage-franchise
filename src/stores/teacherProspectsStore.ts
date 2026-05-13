import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface TeacherProspectsState {
  search: string;
  cityFilter: string;
  tagFilter: string;
  gradeFilter: string;
  enrichmentFilter: string;
  campOnly: boolean;

  setSearch: (v: string) => void;
  setCityFilter: (v: string) => void;
  setTagFilter: (v: string) => void;
  setGradeFilter: (v: string) => void;
  setEnrichmentFilter: (v: string) => void;
  setCampOnly: (v: boolean) => void;
}

export const useTeacherProspectsStore = create<TeacherProspectsState>()(
  persist(
    (set) => ({
      search: "",
      cityFilter: "All",
      tagFilter: "All",
      gradeFilter: "All",
      enrichmentFilter: "All",
      campOnly: false,
      setSearch: (v) => set({ search: v }),
      setCityFilter: (v) => set({ cityFilter: v }),
      setTagFilter: (v) => set({ tagFilter: v }),
      setGradeFilter: (v) => set({ gradeFilter: v }),
      setEnrichmentFilter: (v) => set({ enrichmentFilter: v }),
      setCampOnly: (v) => set({ campOnly: v }),
    }),
    {
      name: "ng:teacher-prospects-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (s) => ({
        search: s.search,
        cityFilter: s.cityFilter,
        tagFilter: s.tagFilter,
        gradeFilter: s.gradeFilter,
        enrichmentFilter: s.enrichmentFilter,
        campOnly: s.campOnly,
      }),
    },
  ),
);
