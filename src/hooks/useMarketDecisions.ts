import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type MarketVerdict = "pursue" | "hold" | "drop" | "undecided";

export interface MarketDecisionRow {
  id: string;
  user_id: string;
  city_id: string;
  city_label: string;
  verdict: MarketVerdict;
  notes: string;
  decided_at: string | null;
  updated_at: string;
}

export function useMarketDecisions() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ["market_validation_decisions", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_validation_decisions")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MarketDecisionRow[];
    },
  });

  const byCity = new Map<string, MarketDecisionRow>();
  (query.data ?? []).forEach((r) => byCity.set(r.city_id, r));

  const upsert = useMutation({
    mutationFn: async (input: {
      city_id: string;
      city_label: string;
      verdict?: MarketVerdict;
      notes?: string;
    }) => {
      if (!userId) throw new Error("Not signed in");
      const payload = {
        user_id: userId,
        city_id: input.city_id,
        city_label: input.city_label,
        verdict: input.verdict ?? "undecided",
        notes: input.notes ?? "",
        decided_at: input.verdict && input.verdict !== "undecided" ? new Date().toISOString() : null,
      };
      const { error } = await supabase
        .from("market_validation_decisions")
        .upsert(payload, { onConflict: "user_id,city_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["market_validation_decisions", userId] }),
  });

  const setVerdict = useCallback(
    (city_id: string, city_label: string, verdict: MarketVerdict, notes?: string) => {
      const existing = byCity.get(city_id);
      upsert.mutate({ city_id, city_label, verdict, notes: notes ?? existing?.notes ?? "" });
    },
    [upsert, byCity],
  );

  const setNotes = useCallback(
    (city_id: string, city_label: string, notes: string) => {
      const existing = byCity.get(city_id);
      upsert.mutate({ city_id, city_label, verdict: existing?.verdict ?? "undecided", notes });
    },
    [upsert, byCity],
  );

  return {
    decisions: query.data ?? [],
    byCity,
    isLoading: query.isLoading,
    isAuthed: !!userId,
    setVerdict,
    setNotes,
  };
}
