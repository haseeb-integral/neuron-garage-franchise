import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SiteVerdict = "strong" | "high" | "medium" | "low" | "undecided";

const VALID_VERDICTS: SiteVerdict[] = ["strong", "high", "medium", "low", "undecided"];

function normalizeVerdict(v: string): SiteVerdict {
  if (VALID_VERDICTS.includes(v as SiteVerdict)) return v as SiteVerdict;
  // Map old values from before the confidence-band rename
  if (v === "recommend") return "strong";
  if (v === "worth_a_look") return "medium";
  if (v === "dont_recommend" || v === "drop") return "low";
  if (v === "pursue") return "strong";
  if (v === "hold") return "medium";
  return "undecided";
}

export interface SiteDecisionRow {
  id: string;
  user_id: string;
  address: string;
  school_name: string;
  verdict: SiteVerdict;
  is_winner: boolean;
  notes: string;
  decided_at: string | null;
  updated_at: string;
}

export function useSiteDecisions() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ["site_analysis_decisions", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_analysis_decisions")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as SiteDecisionRow[];
      // Normalize old verdict values that may still exist in the DB
      rows.forEach((r) => {
        r.verdict = normalizeVerdict(r.verdict);
      });
      return rows;
    },
  });

  const byAddress = new Map<string, SiteDecisionRow>();
  (query.data ?? []).forEach((r) => byAddress.set(r.address, r));

  const upsert = useMutation({
    mutationFn: async (input: {
      address: string;
      school_name: string;
      verdict?: SiteVerdict;
      is_winner?: boolean;
      notes?: string;
    }) => {
      if (!userId) throw new Error("Not signed in");
      const existing = byAddress.get(input.address);
      const payload = {
        user_id: userId,
        address: input.address,
        school_name: input.school_name,
        verdict: input.verdict ?? existing?.verdict ?? "undecided",
        is_winner: input.is_winner ?? existing?.is_winner ?? false,
        notes: input.notes ?? existing?.notes ?? "",
        decided_at:
          (input.verdict ?? existing?.verdict) && (input.verdict ?? existing?.verdict) !== "undecided"
            ? new Date().toISOString()
            : null,
      };
      const { error } = await supabase
        .from("site_analysis_decisions")
        .upsert(payload, { onConflict: "user_id,address" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site_analysis_decisions", userId] }),
  });

  const setVerdict = useCallback(
    (address: string, school_name: string, verdict: SiteVerdict) =>
      upsert.mutate({ address, school_name, verdict }),
    [upsert],
  );

  const setWinner = useCallback(
    (address: string, school_name: string, is_winner: boolean) =>
      upsert.mutate({ address, school_name, is_winner }),
    [upsert],
  );

  const setNotes = useCallback(
    (address: string, school_name: string, notes: string) =>
      upsert.mutate({ address, school_name, notes }),
    [upsert],
  );

  return {
    decisions: query.data ?? [],
    byAddress,
    isLoading: query.isLoading,
    isAuthed: !!userId,
    setVerdict,
    setWinner,
    setNotes,
  };
}
