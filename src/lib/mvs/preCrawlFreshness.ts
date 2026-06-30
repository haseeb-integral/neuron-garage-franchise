// Shared freshness pre-check for MVS pipeline Run buttons.
//
// Rule: avoid re-crawling cities that already have recent saved data.
//   ≤ 90 days old    → skip crawl, use saved data.
//   91–120 days old  → prompt the user.
//   > 120 days old   → run fresh crawl.
//
// Freshness date must come from the REAL saved-data date:
//   - `done`       → finished_at (or created_at fallback)
//   - `done_stale` → fallback_data_date (the original saved-data date, NOT the
//                     finished_at of the fallback run, which would always be "today")

import { supabase } from "@/integrations/supabase/client";

export const FRESH_SKIP_DAYS = 90;
export const FRESH_PROMPT_DAYS = 120;

export function ageDays(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

/**
 * Return the effective saved-data date for the most recent successful run of
 * a city, or null if no successful run exists.
 */
export async function findLastGoodRun(city: string): Promise<string | null> {
  const { data } = await supabase
    .from("mvs_pipeline_runs")
    .select("finished_at, created_at, status, fallback_data_date")
    .eq("city", city)
    .in("status", ["done", "done_stale"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const row = data as {
    finished_at: string | null;
    created_at: string;
    status: string;
    fallback_data_date: string | null;
  };
  if (row.status === "done_stale") {
    return row.fallback_data_date ?? null;
  }
  return row.finished_at ?? row.created_at;
}

export type FreshnessDecision =
  | { kind: "skip"; dateIso: string; age: number }
  | { kind: "prompt"; dateIso: string; age: number }
  | { kind: "run-fresh"; dateIso: string | null; age: number | null };

export async function decideFreshness(city: string): Promise<FreshnessDecision> {
  const iso = await findLastGoodRun(city);
  const age = ageDays(iso);
  if (iso == null || age == null) return { kind: "run-fresh", dateIso: null, age: null };
  if (age <= FRESH_SKIP_DAYS) return { kind: "skip", dateIso: iso, age };
  if (age <= FRESH_PROMPT_DAYS) return { kind: "prompt", dateIso: iso, age };
  return { kind: "run-fresh", dateIso: iso, age };
}
