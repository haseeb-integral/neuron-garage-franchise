// Hook to hydrate / persist the per-user scoring_config row
// (selected preset name + master weights). One row per authenticated user.

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CategoryKey } from "@/stores/cityScoringStore";
import type { PresetName } from "@/lib/scoringPresets";

const QUERY_KEY = ["scoring_config"] as const;

export interface ScoringConfigRow {
  id: string;
  preset_name: PresetName;
  master_weights: Record<CategoryKey, number>;
}

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export function useScoringConfig() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<ScoringConfigRow | null> => {
      const userId = await getCurrentUserId();
      if (!userId) return null;
      const { data, error } = await supabase
        .from("scoring_config")
        .select("id, preset_name, master_weights")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return (data as ScoringConfigRow | null) ?? null;
    },
  });
}

export function useSaveScoringConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { preset_name: PresetName; master_weights: Record<CategoryKey, number> }) => {
      const userId = await getCurrentUserId();
      if (!userId) return; // not signed in — skip
      const existing = await supabase
        .from("scoring_config")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (existing.data?.id) {
        const { error } = await supabase
          .from("scoring_config")
          .update({ preset_name: input.preset_name, master_weights: input.master_weights as any })
          .eq("id", existing.data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("scoring_config")
          .insert({
            user_id: userId,
            preset_name: input.preset_name,
            master_weights: input.master_weights as any,
            singleton: false,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

// Debounced upsert — pass current preset/weights, fires after `delay` ms of no changes.
export function useDebouncedSaveScoringConfig(
  preset: PresetName,
  weights: Record<CategoryKey, number>,
  enabled: boolean,
  delay = 600,
) {
  const save = useSaveScoringConfig();
  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => {
      save.mutate({ preset_name: preset, master_weights: weights });
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, JSON.stringify(weights), enabled, delay]);
}
