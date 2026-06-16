import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SchoolType, GradeBand } from "@/lib/sasMath";

export interface SiteScoreInput {
  schoolName: string;
  address: string;
  schoolType: SchoolType;
  gradeBand: GradeBand;
  enrollment?: number | null;
}

export interface SiteScoreSignals {
  acs10?: {
    medianHhi?: number;
    pctAbove150k?: number;
    pctDualIncome?: number;
    children5to12?: number;
    familiesWithKids?: number;
    totalPop?: number;
  };
  acs15?: {
    medianHhi?: number;
    pctAbove150k?: number;
    children5to12?: number;
    totalPop?: number;
  };
  ecosystem?: {
    elementaryCount?: number;
    privateCount?: number;
    nearbyStudentPop?: number;
  };
}

export interface SiteScoreResult {
  sas: number;
  pillars: {
    schoolProfile: number;
    affluence: number;
    familyDensity: number;
    ecosystem: number;
    accessibility: number;
  };
  place?: string;
  signals?: SiteScoreSignals;
}


export type SiteScoreStatus = "idle" | "loading" | "ready" | "error";

export interface UseSiteScore {
  status: SiteScoreStatus;
  result: SiteScoreResult | null;
  error: string | null;
  run: (input: SiteScoreInput) => Promise<SiteScoreResult | null>;
  reset: () => void;
}

/**
 * Shared hook that calls the `compute-sas` edge function. Single source of
 * truth for any UI surface that needs a live SAS score so every card,
 * banner, table, and export reads the same numbers.
 */
export function useSiteScore(): UseSiteScore {
  const [status, setStatus] = useState<SiteScoreStatus>("idle");
  const [result, setResult] = useState<SiteScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (input: SiteScoreInput) => {
    if (!input.address.trim() || !input.schoolName.trim()) {
      setError("School name and address are required.");
      setStatus("error");
      return null;
    }
    setStatus("loading");
    setError(null);
    setResult(null);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke("compute-sas", {
        body: {
          address: input.address.trim(),
          school_name: input.schoolName.trim(),
          school_type: input.schoolType,
          enrollment: input.enrollment ?? null,
          grade_band: input.gradeBand,
        },
      });
      if (invokeErr) throw invokeErr;
      if (data?.status === "failed") throw new Error(data.error ?? "Engine failed");
      setResult(data as SiteScoreResult);
      setStatus("ready");
      return data as SiteScoreResult;
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  return { status, result, error, run, reset };
}
