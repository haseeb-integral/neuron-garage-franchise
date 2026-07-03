import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  computeMvs,
  DEFAULT_WEIGHTS,
  type MvsAcsInput,
  type MvsProviderInput,
  type MvsResult,
  type MvsWeekInput,
} from "@/lib/mvs/computeMvs";

export type LiveMvsCityFlag = {
  city: string;
  mvs_data_source: "sample" | "live";
  low_confidence_badge: boolean;
};

export type LiveMvsBundle = {
  result: MvsResult | null;
  providers: MvsProviderInput[];
  weeks: MvsWeekInput[];
  acs: MvsAcsInput | null;
  flag: LiveMvsCityFlag | null;
  watchlist: { name: string; default_overlap: "direct" | "adjacent" | "distant" }[];
  overrides: { operator_name: string; overlap: "direct" | "adjacent" | "distant" }[];

  lastRefreshed: string | null;
  qaOpenCount: number;
  qaReasons: { reason: string; count: number }[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  /** Wall-clock ms when this cache entry was last populated (from React Query). */
  cachedAt: number | null;
};

type RawBundle = {
  providers: MvsProviderInput[];
  weeks: MvsWeekInput[];
  acs: MvsAcsInput | null;
  flag: LiveMvsCityFlag | null;
  watchlist: { name: string; default_overlap: "direct" | "adjacent" | "distant" }[];
  overrides: { operator_name: string; overlap: "direct" | "adjacent" | "distant" }[];
  lastRefreshed: string | null;
  qaOpenCount: number;
  qaReasons: { reason: string; count: number }[];
};

const EMPTY_BUNDLE: RawBundle = {
  providers: [],
  weeks: [],
  acs: null,
  flag: null,
  watchlist: [],
  overrides: [],
  lastRefreshed: null,
  qaOpenCount: 0,
  qaReasons: [],
};


export const MVS_QUERY_KEY = "mvs-live" as const;

/** Invalidate every cached MVS city — call after pipeline run / override save / QA resolve. */
export function invalidateAllMvs(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [MVS_QUERY_KEY] });
}

export async function fetchLiveMvs(cityKey: string): Promise<RawBundle> {
  const { data: flagRow } = await supabase
    .from("mvs_city_flags")
    .select("city, mvs_data_source, low_confidence_badge")
    .eq("city", cityKey)
    .maybeSingle();

  const { data: provRows, error: provErr } = await supabase
    .from("mvs_providers")
    .select("id, name, tier, price_min, price_max, category_classified, url, website_url, source_listing_url, sources, updated_at, price_derived_from_brand, price_needs_review")
    .eq("city", cityKey);
  if (provErr) throw provErr;

  const providerIds = (provRows ?? []).map((p) => p.id);
  let weekRows: any[] = [];
  if (providerIds.length > 0) {
    const { data: wRows, error: wErr } = await supabase
      .from("mvs_weeks")
      .select("provider_id, status, confidence, source_url")
      .in("provider_id", providerIds);
    if (wErr) throw wErr;
    weekRows = wRows ?? [];
  }

  const { data: acsRows } = await supabase
    .from("site_analysis_acs_cache")
    .select("children_5_12, families_with_kids_5_12, pct_dual_income, pct_hh_above_150k")
    .order("created_at", { ascending: false })
    .limit(50);

  const [cityName, stateAbbr] = cityKey.split(",").map((s) => s.trim());

  const { data: cityRow } = await supabase
    .from("us_cities_scored")
    .select("children_5_12, dual_working_families_pct")
    .ilike("city_name", cityName ?? cityKey)
    .eq("state_abbr", stateAbbr ?? "")
    .maybeSingle();

  const children5to12 = cityRow?.children_5_12 ?? null;

  let affluentCount: number | null = null;
  if (acsRows && acsRows.length > 0) {
    const best = (acsRows as any[]).sort(
      (a, b) => (b.children_5_12 ?? 0) - (a.children_5_12 ?? 0),
    )[0];
    const fams = best.families_with_kids_5_12 ?? 0;
    const dualPct = (best.pct_dual_income ?? 0) / 100;
    const above150 = (best.pct_hh_above_150k ?? 0) / 100;
    if (fams > 0 && dualPct > 0 && above150 > 0) {
      affluentCount = Math.round(fams * dualPct * above150);
    }
  }
  if (
    affluentCount == null &&
    children5to12 != null &&
    cityRow?.dual_working_families_pct != null
  ) {
    affluentCount = Math.round(
      children5to12 * (cityRow.dual_working_families_pct / 100),
    );
  }

  let acsInput: MvsAcsInput | null = null;
  if (children5to12 != null && Number.isFinite(children5to12)) {
    acsInput = {
      children_5_12_count: children5to12,
      affluent_dual_income_family_count: affluentCount ?? 0,
    };
  }

  const { data: wlRows } = await supabase
    .from("mvs_operator_watchlist")
    .select("name, overlap");
  const { data: ovRows } = await supabase
    .from("mvs_city_overlap_overrides")
    .select("operator_name, overlap_override")
    .eq("city", cityKey);

  const providers: MvsProviderInput[] = (provRows ?? []).map((p) => {
    const rawSources = (p as any).sources;
    let sources: string[] | null = null;
    if (Array.isArray(rawSources)) {
      sources = rawSources.map((s) => String(s)).filter(Boolean);
    } else if (rawSources && typeof rawSources === "object") {
      sources = Object.keys(rawSources);
    }
    return {
      id: p.id,
      name: p.name,
      tier: p.tier as MvsProviderInput["tier"],
      price_min: p.price_min,
      price_max: p.price_max,
      category_classified: p.category_classified,
      url: (p as any).url ?? null,
      website_url: (p as any).website_url ?? null,
      source_listing_url: (p as any).source_listing_url ?? null,
      sources,
    };
  });


  const weeks: MvsWeekInput[] = weekRows.map((w) => ({
    provider_id: w.provider_id,
    status: w.status as MvsWeekInput["status"],
    confidence: w.confidence,
    source_url: w.source_url ?? null,
  }));

  const maxUpdated = (provRows ?? []).reduce<string | null>((acc, p: any) => {
    const u = p.updated_at as string | null | undefined;
    if (!u) return acc;
    if (!acc || u > acc) return u;
    return acc;
  }, null);

  let qaOpenCount = 0;
  let qaReasons: { reason: string; count: number }[] = [];
  if (providerIds.length > 0) {
    const { data: qaRows } = await supabase
      .from("mvs_qa_queue")
      .select("reason")
      .is("resolved_at", null)
      .in("entity_id", providerIds);
    const rows = qaRows ?? [];
    qaOpenCount = rows.length;
    const counts = new Map<string, number>();
    for (const r of rows) {
      const reason = (r.reason ?? "unspecified").toString();
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
    }
    qaReasons = Array.from(counts.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);
  }

  return {
    providers,
    weeks,
    acs: acsInput,
    flag: flagRow
      ? {
          city: flagRow.city,
          mvs_data_source: (flagRow.mvs_data_source ?? "sample") as "sample" | "live",
          low_confidence_badge: !!flagRow.low_confidence_badge,
        }
      : null,
    watchlist: (wlRows ?? []).map((w) => ({
      name: w.name,
      default_overlap: w.overlap as "direct" | "adjacent" | "distant",
    })),
    overrides: (ovRows ?? []).map((o) => ({
      operator_name: o.operator_name,
      overlap: o.overlap_override as "direct" | "adjacent" | "distant",
    })),
    lastRefreshed: maxUpdated,
    qaOpenCount,
    qaReasons,
  };
}


/**
 * Loads live pipeline data for a city (providers + weeks + ACS + watchlist
 * + overrides), runs `computeMvs` with optional weight overrides, and returns
 * a single bundle. Brett's rule — one shared helper, one calibrated number.
 *
 * Cached via React Query: scores from the last visit appear instantly, and a
 * background refetch only happens when the cache is older than 10 minutes or
 * when callers explicitly invalidate (pipeline run, override save, QA resolve).
 */
export function useLiveMvs(
  cityKey: string,
  options?: { weights?: Partial<typeof DEFAULT_WEIGHTS> },
): LiveMvsBundle {
  const queryClient = useQueryClient();
  const weightsKey = JSON.stringify(options?.weights ?? {});

  const query = useQuery<RawBundle>({
    queryKey: [MVS_QUERY_KEY, cityKey],
    queryFn: () => fetchLiveMvs(cityKey),
    staleTime: 10 * 60 * 1000, // 10 min
    gcTime: 30 * 60 * 1000, // 30 min
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const raw = query.data ?? EMPTY_BUNDLE;

  const result = useMemo(() => {
    if (!raw.acs) return null;
    return computeMvs(raw.providers, raw.weeks, raw.acs, {
      watchlist: raw.watchlist,
      overlapOverrides: raw.overrides,
      weights: options?.weights,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, weightsKey]);

  return {
    result,
    providers: raw.providers,
    weeks: raw.weeks,
    acs: raw.acs,
    flag: raw.flag,
    watchlist: raw.watchlist,
    overrides: raw.overrides,

    lastRefreshed: raw.lastRefreshed,
    qaOpenCount: raw.qaOpenCount,
    qaReasons: raw.qaReasons,

    // Only show loading on a true cold load (no cached data yet). When data is
    // present we treat background refetches as silent — no flicker.
    loading: query.isLoading && !query.data,
    error: query.error ? (query.error as Error).message : null,
    refresh: () =>
      queryClient.invalidateQueries({ queryKey: [MVS_QUERY_KEY, cityKey] }),
    cachedAt: query.dataUpdatedAt || null,
  };
}
