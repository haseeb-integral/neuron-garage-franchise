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

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "";
  return (Math.round(n * 10) / 10).toString();
}

export function ExportAllValidatedButton() {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // 1. Get every city that has ever completed a pipeline run (incl. stale fallback).
      const { data: runs, error } = await supabase
        .from("mvs_pipeline_runs")
        .select("city, status, finished_at, fallback_data_date")
        .in("status", ["done", "done_stale"])
        .order("finished_at", { ascending: false });
      if (error) throw error;

      // Dedupe by city — keep newest finished_at.
      const latestByCity = new Map<
        string,
        { city: string; status: string; finished_at: string | null; fallback_data_date: string | null }
      >();
      for (const r of runs ?? []) {
        if (!r.city) continue;
        if (!latestByCity.has(r.city)) latestByCity.set(r.city, r as any);
      }
      const cities = Array.from(latestByCity.values());
      if (cities.length === 0) {
        toast.error("No validated markets yet", { description: "Run the pipeline on at least one city first." });
        return;
      }

      toast.info(`Exporting ${cities.length} markets…`, { description: "Recomputing scores live." });

      // 2. For each city, fetch live bundle and compute MVS. Run in parallel waves of 5.
      const rows: string[][] = [];
      const header = [
        "city", "state",
        "composite_mvs",
        "pricing_acceptance",
        "scaled_operator",
        "enrichment_diversity",
        "market_depth",
        "market_balance",
        "providers_count",
        "premium_providers_count",
        "last_run_status",
        "last_run_finished_at",
        "fallback_data_date",
      ];

      const WAVE = 5;
      for (let i = 0; i < cities.length; i += WAVE) {
        const wave = cities.slice(i, i + WAVE);
        const results = await Promise.all(
          wave.map(async (c) => {
            try {
              const bundle = await fetchLiveMvs(c.city);
              let mvs: ReturnType<typeof computeMvs> | null = null;
              if (bundle.acs) {
                mvs = computeMvs(bundle.providers, bundle.weeks, bundle.acs, {
                  watchlist: bundle.watchlist,
                  overlapOverrides: bundle.overrides,
                });
              }
              const [cityName, stateAbbr] = c.city.split(",").map((s) => s.trim());
              const premiumCount = bundle.providers.filter((p) => p.tier === "premium").length;
              return [
                cityName ?? c.city,
                stateAbbr ?? "",
                fmt(mvs?.mvs ?? null),
                fmt(mvs?.scores.pricingAcceptance ?? null),
                fmt(mvs?.scores.scaledOperator ?? null),
                fmt(mvs?.scores.enrichmentDiversity ?? null),
                fmt(mvs?.scores.marketDepth ?? null),
                fmt(mvs?.scores.marketBalance ?? null),
                String(bundle.providers.length),
                String(premiumCount),
                c.status,
                c.finished_at ?? "",
                c.fallback_data_date ?? "",
              ];
            } catch (e) {
              const [cityName, stateAbbr] = c.city.split(",").map((s) => s.trim());
              return [
                cityName ?? c.city, stateAbbr ?? "",
                "", "", "", "", "", "", "", "",
                c.status, c.finished_at ?? "", c.fallback_data_date ?? "",
              ];
            }
          }),
        );
        rows.push(...results);
      }

      const csv = [header, ...rows]
        .map((r) => r.map(csvEscape).join(","))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `validated-markets-${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${rows.length} markets`);
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
      title="Download a CSV of every city that has ever been scored, with live recomputed pillar + composite scores."
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold disabled:opacity-60"
      style={{ borderColor: BLUE, color: BLUE, backgroundColor: "#fff" }}
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
      Export all validated markets (CSV)
    </button>
  );
}
