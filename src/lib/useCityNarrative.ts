import { useEffect, useState, useCallback, useMemo } from "react";
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

export interface CityNarrativeContext {
  total_score: number;
  tier: string;
  pillars: {
    demand: number;
    tam_teachers: number;
    competitive_opportunity: number;
  };
  signals: Array<{
    key: string;
    label: string;
    source: string;
    value: string;
    benchmark: string | null;
  }>;
}

export function useCityNarrative({
  cityId,
  weightsHash,
  context,
}: {
  cityId: string | null | undefined;
  weightsHash?: string;
  context?: CityNarrativeContext | null;
}) {
  const [data, setData] = useState<CityNarrative | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const serializedContext = useMemo(
    () => (context ? JSON.stringify(context) : null),
    [context],
  );

  const fetchNarrative = useCallback(
    async (opts?: { force?: boolean; model?: "default" | "pro" }) => {
      if (!cityId) return;
      setLoading(true);
      setError(null);
      try {
        const { data: resp, error: fnErr } = await supabase.functions.invoke(
          "city-analyst",
          {
            body: {
              cityId,
              weightsHash,
              force: opts?.force,
              model: opts?.model,
              context: serializedContext ? JSON.parse(serializedContext) : undefined,
            },
          },
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
    [cityId, serializedContext, weightsHash],
  );

  useEffect(() => {
    setData(null);
    if (cityId) fetchNarrative();
  }, [cityId, fetchNarrative, weightsHash, serializedContext]);

  return { data, loading, error, regenerate: fetchNarrative };
}
