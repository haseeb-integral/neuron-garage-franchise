import { useEffect, useMemo, useState } from "react";
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
  loading: boolean;
  error: string | null;
  refresh: () => void;
};


/**
 * Loads live pipeline data for a city (providers + weeks + ACS + watchlist
 * + overrides), runs `computeMvs` with optional weight overrides, and returns
 * a single bundle. Brett's rule — one shared helper, one calibrated number.
 */
export function useLiveMvs(
  cityKey: string,
  options?: { weights?: Partial<typeof DEFAULT_WEIGHTS> },
): LiveMvsBundle {
  const [providers, setProviders] = useState<MvsProviderInput[]>([]);
  const [weeks, setWeeks] = useState<MvsWeekInput[]>([]);
  const [acs, setAcs] = useState<MvsAcsInput | null>(null);
  const [watchlist, setWatchlist] = useState<
    { name: string; default_overlap: "direct" | "adjacent" | "distant" }[]
  >([]);
  const [overrides, setOverrides] = useState<
    { operator_name: string; overlap: "direct" | "adjacent" | "distant" }[]
  >([]);
  const [flag, setFlag] = useState<LiveMvsCityFlag | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);


  // weightsKey = stable signature for memo
  const weightsKey = JSON.stringify(options?.weights ?? {});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const { data: flagRow } = await supabase
          .from("mvs_city_flags")
          .select("city, mvs_data_source, low_confidence_badge")
          .eq("city", cityKey)
          .maybeSingle();

        const { data: provRows, error: provErr } = await supabase
          .from("mvs_providers")
          .select("id, name, tier, price_min, price_max, category_classified, url, website_url, source_listing_url")
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

        // ACS — fetch best-effort from cache, fall back to us_cities_scored
        const { data: acsRows } = await supabase
          .from("site_analysis_acs_cache")
          .select("children_5_12, families_with_kids_5_12, pct_dual_income, pct_hh_above_150k")
          .order("created_at", { ascending: false })
          .limit(50);

        // Parse city + state from cityKey: "Austin, TX" -> ["Austin","TX"]
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

        if (cancelled) return;

        setFlag(
          flagRow
            ? {
                city: flagRow.city,
                mvs_data_source: (flagRow.mvs_data_source ?? "sample") as
                  | "sample"
                  | "live",
                low_confidence_badge: !!flagRow.low_confidence_badge,
              }
            : null,
        );
        setProviders(
          (provRows ?? []).map((p) => ({
            id: p.id,
            name: p.name,
            tier: p.tier as MvsProviderInput["tier"],
            price_min: p.price_min,
            price_max: p.price_max,
            category_classified: p.category_classified,
            url: (p as any).url ?? null,
            website_url: (p as any).website_url ?? null,
            source_listing_url: (p as any).source_listing_url ?? null,
          })),
        );
        setWeeks(
          weekRows.map((w) => ({
            provider_id: w.provider_id,
            status: w.status as MvsWeekInput["status"],
            confidence: w.confidence,
            source_url: w.source_url ?? null,
          })),
        );
        setAcs(acsInput);
        setWatchlist(
          (wlRows ?? []).map((w) => ({
            name: w.name,
            default_overlap: w.overlap as "direct" | "adjacent" | "distant",
          })),
        );
        setOverrides(
          (ovRows ?? []).map((o) => ({
            operator_name: o.operator_name,
            overlap: o.overlap_override as "direct" | "adjacent" | "distant",
          })),
        );
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "Failed to load live MVS data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cityKey, refreshTick]);

  const result = useMemo(() => {
    if (!acs) return null;
    return computeMvs(providers, weeks, acs, {
      watchlist,
      overlapOverrides: overrides,
      weights: options?.weights,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providers, weeks, acs, watchlist, overrides, weightsKey]);

  return {
    result,
    providers,
    weeks,
    acs,
    flag,
    loading,
    error,
    refresh: () => setRefreshTick((t) => t + 1),
  };
}

