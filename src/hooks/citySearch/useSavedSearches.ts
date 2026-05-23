// useSavedSearches — owns the per-user "Saved Searches" feature on /city-scoring.
//
// Responsibilities:
//   - Load the user's saved_searches rows from Supabase
//   - Save / load / delete a saved search (incl. the modal name+open state)
//   - Build a sensible default name from the current preset+weights
//
// The page only needs to:
//   - render the dropdown from `savedSearches` + `activeSavedSearchId`
//   - mount the Save dialog with `saveSearchOpen`/`saveSearchName`/`savingSearch`
//   - call `openSaveDialog()` from the toolbar
//   - call `clearActive()` whenever the user touches weights some other way
//
// Snapshot of the user's manually-tuned Custom weights still lives in the page
// (it's used by the preset switcher too) — pass its setter in via `onLoad`.

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCityScoringStore,
  type CategoryKey,
  type SubWeights,
} from "@/stores/cityScoringStore";
import { CATEGORIES } from "@/lib/cityScoringPageHelpers";
import { PRESET_NAMES } from "@/lib/scoringPresets";

export type SavedSearch = {
  id: string;
  name: string;
  master_weights: Record<CategoryKey, number> | null;
  sub_weights: Record<string, Record<string, number>> | null;
  created_at: string;
};

interface Options {
  /** Called after a successful load so the page can also snapshot custom weights. */
  onLoadedWeights?: (mw: Record<CategoryKey, number>) => void;
}

export function useSavedSearches({ onLoadedWeights }: Options = {}) {
  const { user } = useAuth();

  const weights = useCityScoringStore((s) => s.weights);
  const subWeights = useCityScoringStore((s) => s.subWeights);
  const scoringModel = useCityScoringStore((s) => s.scoringModel);
  const setScoringModel = useCityScoringStore((s) => s.setScoringModel);
  const setWeights = useCityScoringStore((s) => s.setWeights);
  const setAppliedWeights = useCityScoringStore((s) => s.setAppliedWeights);
  const setAppliedSubWeights = useCityScoringStore((s) => s.setAppliedSubWeights);

  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [saveSearchOpen, setSaveSearchOpen] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState("");
  const [savingSearch, setSavingSearch] = useState(false);
  const [activeSavedSearchId, setActiveSavedSearchId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("saved_searches")
      .select("id, name, master_weights, sub_weights, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("loadSavedSearches", error);
      return;
    }
    setSavedSearches((data ?? []) as unknown as SavedSearch[]);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const buildDefaultSearchName = useCallback((): string => {
    const dateStr = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" });
    if ((PRESET_NAMES as readonly string[]).includes(scoringModel) && scoringModel !== "Custom") {
      return `${scoringModel} – ${dateStr}`;
    }
    const top = (Object.entries(weights) as [CategoryKey, number][])
      .sort((a, b) => b[1] - a[1])[0];
    const label = CATEGORIES.find((c) => c.key === top?.[0])?.label ?? "Custom";
    return `${label}-heavy – ${dateStr}`;
  }, [scoringModel, weights]);

  const openSaveDialog = useCallback(() => {
    setSaveSearchName(buildDefaultSearchName());
    setSaveSearchOpen(true);
  }, [buildDefaultSearchName]);

  const handleSaveSearch = useCallback(async () => {
    const name = saveSearchName.trim();
    if (!name) { toast.error("Name required"); return; }
    if (!user) { toast.error("Sign in required"); return; }
    setSavingSearch(true);
    // Save the live draft AND apply it — saving doubles as Apply Weights so we
    // never persist stale appliedWeights.
    setAppliedWeights(weights);
    setAppliedSubWeights(subWeights);
    const { error } = await supabase.from("saved_searches").insert({
      user_id: user.id,
      name,
      master_weights: weights as never,
      sub_weights: subWeights as never,
    });
    setSavingSearch(false);
    if (error) {
      console.error("saveSearch", error);
      toast.error("Save failed");
      return;
    }
    toast.success(`Saved "${name}" — find it under the Saved dropdown`);
    setSaveSearchOpen(false);
    setSaveSearchName("");
    setActiveSavedSearchId(null);
    refresh();
  }, [saveSearchName, user, weights, subWeights, setAppliedWeights, setAppliedSubWeights, refresh]);

  const handleLoadSavedSearch = useCallback((s: SavedSearch) => {
    const mw = s.master_weights as Record<CategoryKey, number> | null;
    const sw = (s.sub_weights ?? {}) as unknown as SubWeights;
    if (mw) {
      setWeights(mw);
      setAppliedWeights(mw);
      onLoadedWeights?.({ ...mw });
    }
    // Update both draft and applied sub-weights so any open drawer reflects it
    useCityScoringStore.setState({ subWeights: sw, appliedSubWeights: sw });
    setScoringModel("Custom");
    setActiveSavedSearchId(s.id);
    toast.success(`Loaded "${s.name}"`);
  }, [setWeights, setAppliedWeights, setScoringModel, onLoadedWeights]);

  const handleDeleteSavedSearch = useCallback((s: SavedSearch) => {
    toast(`Delete "${s.name}"?`, {
      action: {
        label: "Delete",
        onClick: async () => {
          const { error } = await supabase.from("saved_searches").delete().eq("id", s.id);
          if (error) {
            console.error("deleteSavedSearch", error);
            toast.error("Delete failed");
            return;
          }
          toast.success(`Deleted "${s.name}"`);
          setActiveSavedSearchId((cur) => (cur === s.id ? null : cur));
          refresh();
        },
      },
      cancel: { label: "Cancel", onClick: () => {} },
    });
  }, [refresh]);

  const clearActive = useCallback(() => setActiveSavedSearchId(null), []);

  return {
    savedSearches,
    saveSearchOpen,
    setSaveSearchOpen,
    saveSearchName,
    setSaveSearchName,
    savingSearch,
    activeSavedSearchId,
    clearActive,
    openSaveDialog,
    handleSaveSearch,
    handleLoadSavedSearch,
    handleDeleteSavedSearch,
  };
}
