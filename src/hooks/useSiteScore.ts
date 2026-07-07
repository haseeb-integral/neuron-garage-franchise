import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SchoolType, GradeBand } from "@/lib/sasMath";
import type { SasProvenance } from "@/lib/sas/sources";

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
    pctAbove200k?: number;
    hhAbove200k?: number;
    pctDualIncome?: number;
    children5to12?: number;
    familiesWithKids?: number;
    totalPop?: number;
  };
  acs15?: {
    medianHhi?: number;
    pctAbove150k?: number;
    pctAbove200k?: number;
    hhAbove200k?: number;
    children5to12?: number;
    totalPop?: number;
  };
  ecosystem?: {
    elementaryCount?: number;
    privateCount?: number;
    nearbyStudentPop?: number;
  };
  accessibility?: {
    highwayDistanceMi?: number | null;
    roadDistanceMi?: number | null;
  };
  /**
   * Parking signal (engine v0.2). Counts on-street + lot POIs within ~200m
   * of the geocoded pin via Mapbox Tilequery. Informational only — not
   * weighted into the composite (client-locked weights per Sam brief v2.2).
   */
  parking?: {
    poiCount?: number;
    bucket?: "none" | "street_only" | "small_lot" | "large_lot";
    radiusMeters?: number;
    error?: string | null;
  };
  /**
   * Per-pillar source provenance. Emitted by compute-sas so the UI can show
   * a "Fresh / From cache / Backup source" chip plus verify-with-link
   * buttons against the upstream source for every number on the SAS card.
   */
  provenance?: SasProvenance;
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
  /** Geocoded pin centerpoint (added by compute-sas v0.4 for the real map). */
  geo?: { lat: number; lng: number };
  /** 10-min isochrone polygon (Mapbox driving). */
  iso10?: GeoJSON.Polygon;
  /** 15-min isochrone polygon (Mapbox driving). */
  iso15?: GeoJSON.Polygon;
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
