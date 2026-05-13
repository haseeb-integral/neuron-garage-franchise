import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { FitTag } from "@/constants/fitTags";

type OwnerFilter = string;
type TagFilter = "all" | FitTag;
type FitFilter = "all" | "90" | "75";

interface CandidatePipelineState {
  ownerFilter: OwnerFilter;
  tagFilter: TagFilter;
  fitFilter: FitFilter;
  compact: boolean;

  setOwnerFilter: (v: OwnerFilter) => void;
  setTagFilter: (v: TagFilter) => void;
  setFitFilter: (v: FitFilter) => void;
  setCompact: (v: boolean) => void;
}

export const useCandidatePipelineStore = create<CandidatePipelineState>()(
  persist(
    (set) => ({
      ownerFilter: "all",
      tagFilter: "all",
      fitFilter: "all",
      compact: false,
      setOwnerFilter: (v) => set({ ownerFilter: v }),
      setTagFilter: (v) => set({ tagFilter: v }),
      setFitFilter: (v) => set({ fitFilter: v }),
      setCompact: (v) => set({ compact: v }),
    }),
    {
      name: "ng:candidate-pipeline-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (s) => ({
        ownerFilter: s.ownerFilter,
        tagFilter: s.tagFilter,
        fitFilter: s.fitFilter,
        compact: s.compact,
      }),
    },
  ),
);
