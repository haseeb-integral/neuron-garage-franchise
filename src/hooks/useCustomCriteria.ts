// React Query hook for the team-shared custom_criteria table.
// Custom metrics participate in the per-category weighted average using a
// neutral normalized value (50) until a real data source is connected.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CategoryKey } from "@/stores/cityScoringStore";

export interface CustomCriterionRow {
  id: string;
  category: string;        // user-facing label, e.g. "Demand"
  name: string;
  weight: number;
  data_source: string | null;
  notes: string | null;
  created_at: string;
}

// Map the human "category" label stored on rows to our CategoryKey.
// 3-category shape after Sam+Brett 2026-05-21 final purge. Rows persisted
// under retired labels ("Pricing Power", "Ease of Operations", "Parent
// Mindset Indicators") are silently ignored by groupCustomByCategory().
export const CATEGORY_LABEL_TO_KEY: Record<string, CategoryKey> = {
  "Demand": "demand",
  "Competitive Opportunity": "competitiveLandscape",
  "Competitive Landscape": "competitiveLandscape", // legacy label kept for rows persisted before 2026-05-22 rename
  "Franchisee Supply": "franchiseeSupply",
  "Operator & Venue Supply": "franchiseeSupply",
};

const QUERY_KEY = ["custom_criteria"] as const;

export function useCustomCriteria() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<CustomCriterionRow[]> => {
      const { data, error } = await supabase
        .from("custom_criteria")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CustomCriterionRow[];
    },
  });
}

// Group custom criteria by CategoryKey for use inside the drawer / scoring helpers.
export function groupCustomByCategory(rows: CustomCriterionRow[] | undefined): Record<CategoryKey, CustomCriterionRow[]> {
  const out: Record<CategoryKey, CustomCriterionRow[]> = {
    demand: [], competitiveLandscape: [], franchiseeSupply: [],
  };
  (rows ?? []).forEach((r) => {
    const key = CATEGORY_LABEL_TO_KEY[r.category];
    if (key) out[key].push(r);
  });
  return out;
}

export function useAddCustomCriterion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      category: string;
      name: string;
      weight: number;
      data_source?: string | null;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("custom_criteria")
        .insert({
          category: input.category,
          name: input.name,
          weight: input.weight,
          data_source: input.data_source ?? null,
          notes: input.notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as CustomCriterionRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteCustomCriterion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("custom_criteria").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateCustomCriterionWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, weight }: { id: string; weight: number }) => {
      const { error } = await supabase.from("custom_criteria").update({ weight }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
