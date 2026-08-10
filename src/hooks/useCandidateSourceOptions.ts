import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SourceOptionRow {
  source_type: string;
  source_name: string | null;
  sort_order: number;
}

/** Level 1 types (in order) + the Level 2 names under each type. */
export function useCandidateSourceOptions() {
  const [rows, setRows] = useState<SourceOptionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("candidate_source_options")
        .select("source_type, source_name, sort_order")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      setRows((data as SourceOptionRow[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const types: string[] = [];
  for (const r of rows) if (!types.includes(r.source_type)) types.push(r.source_type);

  const namesFor = (type: string) =>
    rows.filter((r) => r.source_type === type && r.source_name).map((r) => r.source_name as string);

  return { types, namesFor, loading };
}
