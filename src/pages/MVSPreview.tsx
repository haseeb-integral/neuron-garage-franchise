import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, BarChart3, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsManager } from "@/hooks/dbHealth/useIsManager";
import {
  computeMvs,
  type MvsProviderInput,
  type MvsWeekInput,
  type MvsAcsInput,
  DEFAULT_WEIGHTS,
} from "@/lib/mvs/computeMvs";

const NAVY = "#07142f";
const MUTED = "#526078";
const BORDER = "#eef2f7";
const SOFT = "#f7faff";
const BLUE = "#174be8";

const SCORE_LABELS: Record<string, string> = {
  pricingAcceptance: "Pricing Acceptance",
  marketAbsorption: "Market Absorption",
  scaledOperator: "Scaled Operator",
  enrichmentDiversity: "Enrichment Diversity",
  marketDepth: "Market Depth",
  marketBalance: "Market Balance",
};

function fmt(n: number | null): string {
  if (n == null) return "—";
  return n.toFixed(1);
}

export default function MVSPreview() {
  const { isManager, loading: roleLoading } = useIsManager();
  const navigate = useNavigate();

  const [providers, setProviders] = useState<MvsProviderInput[]>([]);
  const [weeks, setWeeks] = useState<MvsWeekInput[]>([]);
  const [acs, setAcs] = useState<MvsAcsInput | null>(null);
  const [watchlist, setWatchlist] = useState<{ name: string; default_overlap: "direct" | "adjacent" | "distant" }[]>([]);
  const [overrides, setOverrides] = useState<{ operator_name: string; overlap: "direct" | "adjacent" | "distant" }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Providers
        const { data: provRows, error: provErr } = await supabase
          .from("mvs_providers")
          .select("id, name, tier, price_min, price_max, category_classified")
          .ilike("city", "austin");
        if (provErr) throw provErr;

        // Weeks
        const providerIds = (provRows ?? []).map((p) => p.id);
        let weekRows: any[] = [];
        if (providerIds.length > 0) {
          const { data: wRows, error: wErr } = await supabase
            .from("mvs_weeks")
            .select("provider_id, status, confidence")
            .in("provider_id", providerIds);
          if (wErr) throw wErr;
          weekRows = wRows ?? [];
        }

        // ACS: children_5_12 from us_cities_scored; affluent count is not
        // directly available in v1.0 tables yet — we approximate from
        // families_with_kids_5_12 × pct_dual_income × pct_hh_above_150k
        // if site_analysis_acs_cache has a matching row, otherwise leave null.
        let acsInput: MvsAcsInput | null = null;

        // Try to find Austin ACS cache entry via polygon hash heuristic
        const { data: acsRows } = await supabase
          .from("site_analysis_acs_cache")
          .select("children_5_12, families_with_kids_5_12, pct_dual_income, pct_hh_above_150k")
          .order("created_at", { ascending: false })
          .limit(50);

        // Fallback: us_cities_scored has children_5_12 at least
        const { data: cityRow } = await supabase
          .from("us_cities_scored")
          .select("children_5_12")
          .ilike("city_name", "austin")
          .eq("state_abbr", "TX")
          .maybeSingle();

        const children5to12 = cityRow?.children_5_12 ?? null;

        // Best-effort affluent family count
        let affluentCount: number | null = null;
        if (acsRows && acsRows.length > 0) {
          // Pick a row that looks like Austin (largest children_5_12 in the set)
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

        if (children5to12 != null && Number.isFinite(children5to12)) {
          acsInput = {
            children_5_12_count: children5to12,
            affluent_dual_income_family_count: affluentCount ?? 0,
          };
        }

        // Watchlist + overrides
        const { data: wlRows } = await supabase
          .from("mvs_operator_watchlist")
          .select("name, overlap");
        const { data: ovRows } = await supabase
          .from("mvs_city_overlap_overrides")
          .select("operator_name, overlap_override")
          .ilike("city", "austin");

        if (!cancelled) {
          setProviders(
            (provRows ?? []).map((p) => ({
              id: p.id,
              name: p.name,
              tier: p.tier as MvsProviderInput["tier"],
              price_min: p.price_min,
              price_max: p.price_max,
              category_classified: p.category_classified,
              site_count: p.site_count ?? 1,
            })),
          );
          setWeeks(
            weekRows.map((w) => ({
              provider_id: w.provider_id,
              status: w.status as MvsWeekInput["status"],
              confidence: w.confidence,
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
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "Failed to load preview data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const result = useMemo(() => {
    if (!acs) return null;
    return computeMvs(providers, weeks, acs, {
      watchlist,
      overlapOverrides: overrides,
    });
  }, [providers, weeks, acs, watchlist, overrides]);

  // Role gate
  if (roleLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#174be8]" />
      </div>
    );
  }
  if (!isManager) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-[#a35200]" />
        <h2 className="text-lg font-bold text-[#07142f]">Manager access required</h2>
        <p className="mt-2 text-sm text-[#526078]">
          The MVS preview is only available to managers and admins.
        </p>
      </div>
    );
  }

  const demoMvs = 76; // Austin composite from cityData.ts (closest demo anchor)

  return (
    <div className="max-w-5xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#174be8] hover:underline"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      <div className="mb-6 flex items-center gap-3">
        <BarChart3 size={22} className="text-[#174be8]" />
        <div>
          <h1 className="text-xl font-bold text-[#07142f]">MVS Preview — Austin, TX</h1>
          <p className="text-[12px] text-[#526078]">
            Live pipeline data read-only preview. Normalization version: {result?.normalizationVersion ?? "1.0-fixed"}
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex h-48 items-center justify-center rounded-lg border border-[#eef2f7] bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-[#174be8]" />
          <span className="ml-2 text-sm text-[#526078]">Loading Austin pipeline data…</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && providers.length === 0 && (
        <div className="rounded-lg border border-[#eef2f7] bg-white p-6 text-center">
          <p className="text-sm font-medium text-[#07142f]">No Austin pipeline data yet</p>
          <p className="mt-1 text-[12px] text-[#526078]">
            Run the MVS pipeline for Austin to populate providers and weeks. Once data is available,
            this page will compute the live MVS and sub-scores automatically.
          </p>
        </div>
      )}

      {!loading && !error && providers.length > 0 && (
        <>
          {/* Hero MVS card */}
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-[#eef2f7] bg-white p-6">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#174be8]">
                Live MVS
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-[48px] font-black leading-none tabular-nums text-[#07142f]">
                  {fmt(result?.mvs)}
                </span>
                <span className="text-[12px] text-[#526078]">/ 100</span>
              </div>
              <div className="mt-3 text-[12px] text-[#526078]">
                Computed from {providers.length} providers, {weeks.length} weeks, v1.0 fixed ranges.
              </div>
            </div>

            <div className="rounded-xl border border-[#eef2f7] bg-white p-6">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#526078]">
                Demo Comparison (City Search)
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-[48px] font-black leading-none tabular-nums text-[#526078]">
                  {demoMvs}
                </span>
                <span className="text-[12px] text-[#526078]">/ 100</span>
              </div>
              <div className="mt-3 text-[12px] text-[#526078]">
                Static composite from Feature 1 city-data seed. Gap shown for sanity-check only.
              </div>
            </div>
          </div>

          {/* Sub-scores grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(DEFAULT_WEIGHTS).map(([key, weight]) => {
              const score = result?.scores[key as keyof typeof result.scores] ?? null;
              const input = result?.inputs[key as keyof typeof result.inputs] as any;
              return (
                <div
                  key={key}
                  className="rounded-lg border border-[#eef2f7] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[13px] font-bold text-[#07142f]">
                        {SCORE_LABELS[key]}
                      </div>
                      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#174be8]">
                        {Math.round(weight * 100)}% weight
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[22px] font-black leading-none tabular-nums text-[#07142f]">
                        {fmt(score)}
                      </div>
                      <div className="mt-0.5 text-[10px] text-[#526078]">/ 100</div>
                    </div>
                  </div>

                  {/* Raw inputs preview */}
                  {input && (
                    <div className="mt-3 space-y-1 border-t border-dashed border-[#eef2f7] pt-2">
                      {Object.entries(input).map(([k, v]) => {
                        if (v == null || k === "year2Signal") return null;
                        return (
                          <div key={k} className="flex items-center justify-between text-[11px]">
                            <span className="text-[#526078]">{k}</span>
                            <span className="font-medium tabular-nums text-[#07142f]">
                              {typeof v === "number" ? (Number.isInteger(v) ? v : v.toFixed(2)) : String(v)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
