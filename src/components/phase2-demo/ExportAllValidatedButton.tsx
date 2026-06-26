import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchLiveMvs } from "@/lib/mvs/useLiveMvs";
import { computeMvs } from "@/lib/mvs/computeMvs";

const BLUE = "#174be8";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function fmt(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "";
  const m = Math.pow(10, digits);
  return (Math.round((n as number) * m) / m).toString();
}

function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  return [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
}

function download(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ExportAllValidatedButton() {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // 1. All cities that have ever completed a pipeline run.
      const { data: runs, error } = await supabase
        .from("mvs_pipeline_runs")
        .select("city, status, finished_at, fallback_data_date, started_at, firecrawl_calls")
        .in("status", ["done", "done_stale"])
        .order("finished_at", { ascending: false });
      if (error) throw error;

      const latestByCity = new Map<string, any>();
      for (const r of runs ?? []) {
        if (!r.city) continue;
        if (!latestByCity.has(r.city)) latestByCity.set(r.city, r);
      }
      const cities = Array.from(latestByCity.values());
      if (cities.length === 0) {
        toast.error("No validated markets yet", { description: "Run the pipeline on at least one city first." });
        return;
      }

      toast.info(`Exporting ${cities.length} markets…`, { description: "Recomputing scores live." });

      const summaryRows: (string | number | null | undefined)[][] = [];
      const providerRows: (string | number | null | undefined)[][] = [];

      const WAVE = 5;
      for (let i = 0; i < cities.length; i += WAVE) {
        const wave = cities.slice(i, i + WAVE);
        await Promise.all(
          wave.map(async (c) => {
            const [cityName, stateAbbr] = String(c.city).split(",").map((s) => s.trim());
            try {
              const bundle = await fetchLiveMvs(c.city);
              const mvs = bundle.acs
                ? computeMvs(bundle.providers, bundle.weeks, bundle.acs, {
                    watchlist: bundle.watchlist,
                    overlapOverrides: bundle.overrides,
                  })
                : null;

              const tierCount = (t: string) => bundle.providers.filter((p) => p.tier === t).length;
              const premiumCount = tierCount("premium");
              const midCount = tierCount("mid");
              const budgetCount = tierCount("budget");
              const communityCount = tierCount("community");

              // Source aggregation across providers
              const srcCounts = new Map<string, number>();
              for (const p of bundle.providers) {
                for (const s of p.sources ?? []) {
                  srcCounts.set(s, (srcCounts.get(s) ?? 0) + 1);
                }
              }
              const sourcesFound = Array.from(srcCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([s, n]) => `${s}:${n}`)
                .join(" | ");

              // Categories found across providers
              const catCounts = new Map<string, number>();
              for (const p of bundle.providers) {
                const cat = p.category_classified ?? "uncategorized";
                catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
              }
              const categoriesFound = Array.from(catCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([k, n]) => `${k}:${n}`)
                .join(" | ");

              const qaReasons = bundle.qaReasons.map((q) => `${q.reason}:${q.count}`).join(" | ");

              const pa = mvs?.inputs.pricingAcceptance;
              const so = mvs?.inputs.scaledOperator;
              const ed = mvs?.inputs.enrichmentDiversity;
              const md = mvs?.inputs.marketDepth;
              const mb = mvs?.inputs.marketBalance;

              summaryRows.push([
                cityName ?? c.city,
                stateAbbr ?? "",
                fmt(mvs?.mvs ?? null),
                fmt(mvs?.scores.pricingAcceptance ?? null),
                fmt(mvs?.scores.scaledOperator ?? null),
                fmt(mvs?.scores.enrichmentDiversity ?? null),
                fmt(mvs?.scores.marketDepth ?? null),
                fmt(mvs?.scores.marketBalance ?? null),
                bundle.providers.length,
                premiumCount,
                midCount,
                budgetCount,
                communityCount,
                // Pricing evidence
                fmt(pa?.medianPrice ?? null, 0),
                fmt(pa?.p75Price ?? null, 0),
                fmt(pa?.pctAtLeast500 ?? null, 1),
                // Scaled operator evidence
                fmt(so?.operatorValidation ?? null, 0),
                fmt(so?.directCompetitorLoad ?? null, 2),
                fmt(so?.children5to12 ?? null, 0),
                // Diversity evidence
                fmt(ed?.categoryCount ?? null, 0),
                fmt(ed?.diversityRatio ?? null, 2),
                fmt(ed?.premiumProviderCount ?? null, 0),
                // Depth
                fmt(md?.premiumProviderCount ?? null, 0),
                // Balance
                fmt(mb?.coverageRatio ?? null, 2),
                fmt(mb?.affluentDualIncomeFamilyCount ?? null, 0),
                categoriesFound,
                sourcesFound,
                bundle.qaOpenCount,
                qaReasons,
                bundle.lastRefreshed ?? "",
                c.status,
                c.started_at ?? "",
                c.finished_at ?? "",
                c.firecrawl_calls ?? "",
                c.fallback_data_date ?? "",
              ]);

              // Per-provider rows
              for (const p of bundle.providers) {
                const provWeeks = bundle.weeks.filter((w) => w.provider_id === p.id);
                const readable = provWeeks.find(
                  (w) => w.status !== "unknown",
                );
                providerRows.push([
                  cityName ?? c.city,
                  stateAbbr ?? "",
                  p.name,
                  p.tier ?? "",
                  p.category_classified ?? "",
                  fmt(p.price_min ?? null, 0),
                  fmt(p.price_max ?? null, 0),
                  p.website_url ?? p.url ?? "",
                  p.source_listing_url ?? "",
                  (p.sources ?? []).join(" | "),
                  provWeeks.length,
                  readable ? readable.status : "",
                  readable?.source_url ?? "",
                ]);
              }
            } catch (e) {
              summaryRows.push([
                cityName ?? c.city, stateAbbr ?? "",
                "", "", "", "", "", "",
                "", "", "", "", "",
                "", "", "",
                "", "", "",
                "", "", "",
                "",
                "", "",
                "", "",
                "", "",
                "",
                c.status, c.started_at ?? "", c.finished_at ?? "",
                c.firecrawl_calls ?? "",
                c.fallback_data_date ?? "",
              ]);
            }
          }),
        );
      }

      const summaryHeader = [
        "city", "state",
        "composite_mvs",
        "pricing_acceptance", "scaled_operator", "enrichment_diversity", "market_depth", "market_balance",
        "providers_total", "premium_count", "mid_count", "budget_count", "community_count",
        "median_price_weekly", "p75_price_weekly", "pct_at_least_500",
        "operator_validation_count", "direct_competitor_load_per_1k", "children_5_12",
        "category_count", "diversity_ratio", "diversity_premium_count",
        "depth_premium_count",
        "coverage_ratio", "affluent_dual_income_family_count",
        "categories_found",
        "sources_found",
        "qa_open_count", "qa_reasons",
        "providers_last_updated",
        "run_status", "run_started_at", "run_finished_at", "firecrawl_calls", "fallback_data_date",
      ];
      const providerHeader = [
        "city", "state",
        "provider_name", "tier", "category",
        "price_min_weekly", "price_max_weekly",
        "website_url", "source_listing_url", "discovered_via_sources",
        "weeks_extracted", "sample_week_status", "sample_week_source_url",
      ];

      const stamp = new Date().toISOString().slice(0, 10);
      download(`validated-markets-${stamp}.csv`, toCsv(summaryHeader, summaryRows));
      download(`validated-markets-providers-${stamp}.csv`, toCsv(providerHeader, providerRows));

      toast.success(`Exported ${summaryRows.length} markets`, {
        description: `${providerRows.length} provider rows in the second CSV.`,
      });
    } catch (e) {
      toast.error("Export failed", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      title="Downloads two CSVs: (1) per-market summary with all pillar evidence, sources found, categories, and QA notes; (2) per-provider detail rows."
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold disabled:opacity-60"
      style={{ borderColor: BLUE, color: BLUE, backgroundColor: "#fff" }}
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
      Export all validated markets (CSV)
    </button>
  );
}
