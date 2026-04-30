import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const candidateCountKey = ["candidates", "count"] as const;

async function fetchCandidateCount(): Promise<number> {
  const { count, error } = await supabase
    .from("candidates")
    .select("id", { count: "exact", head: true })
    .neq("current_stage", "disqualified");
  if (error) throw error;
  return count ?? 0;
}

/**
 * Live count of active (non-disqualified) candidates.
 *
 * Refresh model (gold-standard SaaS pattern):
 *  1. React Query cache + invalidation — any mutation that calls
 *     `queryClient.invalidateQueries({ queryKey: ["candidates"] })` triggers a refetch.
 *  2. Supabase Realtime — subscribes to postgres_changes on `candidates` so
 *     edits from other tabs / users invalidate the cache within ~1s.
 *  3. Window-focus refetch (configured globally on the QueryClient) as a safety net.
 */
export function useCandidateCount() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: candidateCountKey,
    queryFn: fetchCandidateCount,
  });

  useEffect(() => {
    const channel = supabase
      .channel("candidates-count-stream")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "candidates" },
        () => {
          qc.invalidateQueries({ queryKey: ["candidates"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return { count: query.data ?? null, isLoading: query.isLoading };
}
