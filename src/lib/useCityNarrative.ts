import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CityNarrative {
  executive_summary: string;
  report_snapshot: string;
  report_demand: string;
  report_supply: string;
  report_next_move: string;
  cached?: boolean;
  model_id?: string;
}

export function useCityNarrative(cityId: string | null | undefined) {
  const [data, setData] = useState<CityNarrative | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNarrative = useCallback(
    async (opts?: { force?: boolean; model?: "default" | "pro" }) => {
      if (!cityId) return;
      setLoading(true);
      setError(null);
      try {
        const { data: resp, error: fnErr } = await supabase.functions.invoke(
          "city-analyst",
          { body: { cityId, force: opts?.force, model: opts?.model } },
        );
        if (fnErr) throw fnErr;
        if ((resp as any)?.error) throw new Error((resp as any).error);
        setData(resp as CityNarrative);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load narrative");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [cityId],
  );

  useEffect(() => {
    setData(null);
    if (cityId) fetchNarrative();
  }, [cityId, fetchNarrative]);

  return { data, loading, error, regenerate: fetchNarrative };
}
