// City scoring console — manager-only page that runs the live MVS pipeline
// across the same shortlisted cities shown on Market Validation. One row per city, sequential runs, live
// composite recomputed via useLiveMvs.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  Play,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLiveMvs } from "@/lib/mvs/useLiveMvs";
import { useAuth } from "@/contexts/AuthContext";
import { SHORTLIST_SEED } from "@/lib/mvs/shortlistSeed";
import { useShortlistAdditions } from "@/lib/mvs/useShortlistAdditions";
import { AddCityDialog } from "@/components/phase2-demo/AddCityDialog";
import {
  decideFreshness,
  formatShortDate,
  ageDays,
} from "@/lib/mvs/preCrawlFreshness";
import { invalidateAllMvs } from "@/lib/mvs/useLiveMvs";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const BASE_SHORTLIST: { city: string; state: string }[] = SHORTLIST_SEED.map((row) => ({
  city: `${row.city}, ${row.state}`,
  state: row.state,
}));

type RunStatus = "queued" | "running" | "done" | "failed";

interface RunRow {
  id: string;
  status: RunStatus;
  started_at: string | null;
  finished_at: string | null;
  firecrawl_calls: number;
  error: string | null;
  created_at: string;
  source_counts: Record<string, unknown> | null;
}


interface FlagRow {
  city: string;
  mvs_data_source: "sample" | "live";
  low_confidence_badge: boolean;
}



// ---------------------------------------------------------------------------
// Per-row hook — composite via shared computeMvs helper (Brett's rule).
// ---------------------------------------------------------------------------

function CityRow({
  city,
  state: _state,
  latestRun,
  flag,
  anyRunning,
  invokingCity,
  onRun,
  onForceFresh,
  onComposite,
}: {
  city: string;
  state: string;
  latestRun: RunRow | null;
  flag: FlagRow | null;
  anyRunning: boolean;
  invokingCity: string | null;
  onRun: () => void;
  onForceFresh: () => void;
  onComposite: (city: string, mvs: number | null) => void;
}) {
  const live = useLiveMvs(city);
  const composite = live.result?.mvs ?? null;

  useEffect(() => {
    onComposite(city, composite);
  }, [city, composite, onComposite]);

  const status = latestRun?.status ?? null;
  const inFlight = status === "queued" || status === "running";
  const isInvoking = invokingCity === city;
  const canRun = !anyRunning && !invokingCity;

  const statusPill = (() => {
    if (!status) return <span className="text-[11px] text-[#8a96aa]">never run</span>;
    const map: Record<RunStatus, { text: string; cls: string; icon: typeof CheckCircle2 | null }> = {
      queued: { text: "queued", cls: "bg-amber-50 text-amber-800 border-amber-200", icon: Loader2 },
      running: { text: "running", cls: "bg-blue-50 text-blue-800 border-blue-200", icon: Loader2 },
      done: { text: "done", cls: "bg-emerald-50 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
      failed: { text: "failed", cls: "bg-red-50 text-red-800 border-red-200", icon: AlertTriangle },
    };
    const s = map[status];
    const Icon = s.icon;
    const pill = (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.cls} ${status === "failed" ? "cursor-help" : ""}`}
      >
        {Icon && <Icon className={`h-3 w-3 ${status === "running" || status === "queued" ? "animate-spin" : ""}`} />}
        {s.text}
      </span>
    );
    // For failed runs, surface the real reason from the DB on hover so the user
    // doesn't have to dig through logs to find out why it died.
    if (status === "failed" && latestRun?.error) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{pill}</TooltipTrigger>
          <TooltipContent className="max-w-sm text-[12px] leading-relaxed">
            <div className="font-semibold mb-1">Why this run failed</div>
            <div className="text-[11px]">{latestRun.error}</div>
          </TooltipContent>
        </Tooltip>
      );
    }
    return pill;
  })();

  // Stale-data warning: when the most recent run failed but we still have an
  // older composite on screen, tell the user clearly that the number is not
  // fresh. Brett's rule: never mix fresh + stale silently.
  const showStaleWarning = status === "failed" && composite != null;
  const failedDate = latestRun?.finished_at ?? latestRun?.started_at ?? null;

  // Discover sources we always try. If the latest run finished without filling
  // source_counts (older runs from before this column existed), the chip is hidden.
  const DISCOVER_SOURCES = ["sawyer", "activityhero", "googlemaps", "yelp", "googlesearch"] as const;
  const sourceCounts = latestRun?.source_counts ?? null;
  const discoverCounts = sourceCounts && typeof sourceCounts === "object" && (sourceCounts as any).discover
    ? ((sourceCounts as any).discover as Record<string, number>)
    : null;
  const sourcesHit = discoverCounts
    ? DISCOVER_SOURCES.filter((s) => Number(discoverCounts[s] ?? 0) > 0).length
    : null;

  return (
    <tr className="border-b border-[#e5eaf2] last:border-b-0">
      <td className="px-3 py-2.5 text-[13px] font-semibold text-[#07142f]">
        <div className="flex flex-wrap items-center gap-1.5">
          <span>{city}</span>
          {sourcesHit != null && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={`inline-flex cursor-help items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${
                    sourcesHit === DISCOVER_SOURCES.length
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : sourcesHit >= 3
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-red-200 bg-red-50 text-red-800"
                  }`}
                >
                  {sourcesHit}/{DISCOVER_SOURCES.length} sources
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-[12px] leading-relaxed">
                <div className="font-semibold mb-1">Discover source results</div>
                <ul className="space-y-0.5 text-[11px]">
                  {DISCOVER_SOURCES.map((s) => {
                    const n = Number(discoverCounts?.[s] ?? 0);
                    return (
                      <li key={s} className="flex items-center justify-between gap-3">
                        <span className="capitalize">{s}</span>
                        <span className={n > 0 ? "text-emerald-700" : "text-red-700"}>
                          {n > 0 ? `${n} providers` : "empty"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {(sourceCounts as any)?.classify && (
                  <div className="mt-2 border-t pt-1.5 text-[11px]">
                    <span className="font-semibold">Classify:</span>{" "}
                    {(sourceCounts as any).classify.batches_attempted ?? "?"} of{" "}
                    {(sourceCounts as any).classify.batches_total ?? "?"} batches done
                    {(sourceCounts as any).classify.aborted_at_batch != null && (
                      <span className="text-red-700"> (aborted)</span>
                    )}
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          )}
          {/* `low_confidence_badge` was driven by no_reg_page_pct, a now-retired
              signal (Market Absorption was removed). Suppressed to avoid a
              false warning. */}
          {false && flag?.low_confidence_badge && (
            <span
              className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800"
            >
              low confidence
            </span>
          )}

        </div>
      </td>

      <td className="px-3 py-2.5 text-[11px] text-[#526078]">
        {latestRun?.finished_at
          ? new Date(latestRun.finished_at).toLocaleString()
          : latestRun?.started_at
            ? new Date(latestRun.started_at).toLocaleString()
            : "—"}
      </td>
      <td className="px-3 py-2.5">{statusPill}</td>
      <td className="px-3 py-2.5 text-right font-mono text-[13px] text-[#07142f]">
        {composite != null ? composite.toFixed(1) : <span className="text-[#8a96aa]">—</span>}
        {showStaleWarning && (
          <div
            className="mt-1 inline-flex max-w-[220px] items-start gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-left text-[10px] font-medium text-amber-900"
            title="The most recent pipeline run for this city failed, so the score above is from an earlier successful run."
          >
            <AlertTriangle className="mt-0.5 h-2.5 w-2.5 shrink-0" />
            <span>
              Score may be stale — last run failed
              {failedDate ? ` on ${new Date(failedDate).toLocaleDateString()}` : ""}. Click Run to refresh.
            </span>
          </div>
        )}
      </td>

      <td className="px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={onRun}
            disabled={!canRun || inFlight || isInvoking}
            title={(anyRunning || invokingCity) && !inFlight && !isInvoking ? "Another city is running" : "Run pipeline"}
            className="inline-flex items-center gap-1 rounded-md bg-[#174be8] px-2 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#0f37b5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {inFlight || isInvoking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            Run
          </button>
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MarketValidationRollout() {
  const { user } = useAuth();
  const [isManager, setIsManager] = useState<boolean | null>(null);
  const [latestRuns, setLatestRuns] = useState<Record<string, RunRow | null>>({});
  const [flags, setFlags] = useState<Record<string, FlagRow>>({});
  const [composites, setComposites] = useState<Record<string, number | null>>({});

  const [invokingCity, setInvokingCity] = useState<string | null>(null);

  const { rows: additions, addCity } = useShortlistAdditions();
  const SHORTLISTED_CITIES = useMemo<{ city: string; state: string }[]>(
    () => [
      ...BASE_SHORTLIST,
      ...additions.map((a) => ({ city: `${a.city}, ${a.state}`, state: a.state })),
    ],
    [additions],
  );

  // Role gate.
  useEffect(() => {
    if (!user) {
      setIsManager(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["manager", "admin"]);
      setIsManager(!!data && data.length > 0);
    })();
  }, [user]);

  const fetchAll = useCallback(async () => {
    const cities = SHORTLISTED_CITIES.map((c) => c.city);

    // Latest run per city: pull last ~50 runs across these cities, then group.
    const { data: runRows } = await supabase
      .from("mvs_pipeline_runs")
      .select("id, city, status, started_at, finished_at, firecrawl_calls, error, created_at, source_counts")
      .in("city", cities)
      .order("created_at", { ascending: false })
      .limit(200);
    const latest: Record<string, RunRow | null> = {};
    for (const c of cities) latest[c] = null;
    const STALE_MS = 8 * 60 * 1000;
    const now = Date.now();
    for (const r of runRows ?? []) {
      // Skip phantom/stub rows that never actually started — they distort "Last run".
      if (!(r as any).started_at) continue;
      if (!latest[(r as any).city]) {
        let status = (r as any).status as RunStatus;
        // Display-side stale clear: a running row older than 8 min is presumed dead.
        // (Real runs on big cities like Boston take 4–6 min, so 3 min was too tight
        // and caused false "failed" badges before the pipeline actually finished.)
        if ((status === "running" || status === "queued") &&
            now - new Date((r as any).started_at).getTime() > STALE_MS) {
          status = "failed";
        }
        latest[(r as any).city] = {
          id: (r as any).id,
          status,
          started_at: (r as any).started_at,
          finished_at: (r as any).finished_at,
          firecrawl_calls: (r as any).firecrawl_calls ?? 0,
          error: (r as any).error ?? (status === "failed" && !(r as any).error ? "Run appears stuck (>8 min). Try again." : null),
          created_at: (r as any).created_at,
          source_counts: ((r as any).source_counts ?? null) as Record<string, unknown> | null,
        };
      }
    }


    setLatestRuns(latest);

    const { data: flagRows } = await supabase
      .from("mvs_city_flags")
      .select("city, mvs_data_source, low_confidence_badge")
      .in("city", cities);
    const next: Record<string, FlagRow> = {};
    for (const f of flagRows ?? []) {
      next[(f as any).city] = {
        city: (f as any).city,
        mvs_data_source: ((f as any).mvs_data_source ?? "sample") as "sample" | "live",
        low_confidence_badge: !!(f as any).low_confidence_badge,
      };
    }
    setFlags(next);
  }, [SHORTLISTED_CITIES]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const anyRunning = useMemo(
    () => Object.values(latestRuns).some((r) => r?.status === "queued" || r?.status === "running"),
    [latestRuns],
  );

  // Poll while any city is in-flight or while we just kicked one off.
  useEffect(() => {
    if (!anyRunning && !invokingCity) return;
    const t = setInterval(fetchAll, 5000);
    return () => clearInterval(t);
  }, [anyRunning, invokingCity, fetchAll]);

  const handleRun = useCallback(async (city: string, state: string) => {
    if (anyRunning || invokingCity) {
      toast.error("Wait for the in-flight run to finish — runs are sequential by design.");
      return;
    }
    setInvokingCity(city);
    try {
      const { data, error } = await supabase.functions.invoke("mvs-run-pipeline", { body: { city } });

      // supabase-js sets `error` on any non-2xx. The real reason is inside
      // error.context (a Response), which we read explicitly so the user
      // doesn't just see "non-2xx status code".
      if (error) {
        let detail = error.message ?? "";
        try {
          const ctx = (error as { context?: Response }).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            detail = body?.error ?? body?.message ?? detail;
          }
        } catch { /* keep error.message */ }
        toast.error(`Couldn't start pipeline for ${city}: ${detail}`);
      } else if (data?.already_running) {
        toast.info(data?.message ?? `${city} is already running — refreshing status.`);
      } else if (data?.ok && data?.run_id) {
        // 202 — pipeline started in the background. The poll loop will
        // pick up status changes; promote to live when it finishes.
        toast.success(`Pipeline started for ${city} — running in background (~1–2 min).`);
      } else if (data?.error) {
        toast.error(`Pipeline error: ${data.error}`);
      }
      await fetchAll();
    } catch (e) {
      toast.error(`Failed to start pipeline: ${(e as Error).message}`);
    } finally {
      setInvokingCity(null);
    }
  }, [anyRunning, invokingCity, fetchAll]);

  // When a previously-running row finishes, auto-promote the city to live
  // so the Market Validation page picks up the new composite.
  useEffect(() => {
    (async () => {
      for (const [city, run] of Object.entries(latestRuns)) {
        if (run?.status !== "done") continue;
        const flag = flags[city];
        if (flag?.mvs_data_source === "live") continue;
        const state = SHORTLISTED_CITIES.find((c) => c.city === city)?.state;
        if (!state) continue;
        await supabase
          .from("mvs_city_flags")
          .upsert({ city, state, mvs_data_source: "live" }, { onConflict: "city,state" });
      }
    })();
  }, [latestRuns, flags, SHORTLISTED_CITIES]);





  const reportComposite = useCallback((city: string, mvs: number | null) => {
    setComposites((prev) => (prev[city] === mvs ? prev : { ...prev, [city]: mvs }));
  }, []);




  if (isManager === null) {
    return (
      <div className="flex h-full items-center justify-center p-12 text-sm text-[#526078]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking access…
      </div>
    );
  }
  if (!isManager) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center">
        <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-[#8a96aa]" />
        <h1 className="text-lg font-semibold text-[#07142f]">Manager access required</h1>
        <p className="mt-1 text-sm text-[#526078]">
          The City Scoring Console is restricted to manager/admin users.
        </p>
      </div>
    );
  }

  const doneCount = SHORTLISTED_CITIES.filter((c) => latestRuns[c.city]?.status === "done").length;
  const totalCount = SHORTLISTED_CITIES.length;
  const allDone = doneCount === totalCount;

  return (
    <div className="mx-auto max-w-[1200px] p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/market-validation"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#526078] hover:text-[#174be8]"
          >
            <ChevronLeft className="h-3 w-3" />
            Market Validation
          </Link>
          <h1 className="mt-1 text-[22px] font-bold tracking-tight text-[#07142f]">
            City Scoring Console
          </h1>
          <p className="mt-0.5 text-[12px] text-[#526078]">
            Run the live data pipeline that produces each city's Market Validation composite score.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AddCityDialog onAdd={addCity} />
          <button
            type="button"
            onClick={fetchAll}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#cfd8e6] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[#526078] hover:bg-[#f7faff]"
          >
            <RotateCcw className="h-3 w-3" /> Refresh
          </button>
        </div>
      </div>

      {/* How this page works */}
      <div className="mb-5 rounded-lg border border-[#dbe6ff] bg-[#f5f8ff] p-4 text-[12px] text-[#07142f]">
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#174be8]">
          Why this page exists
        </div>
        <p className="mb-2">
          The Market Validation page shows finished scores so you can review and decide. <strong>This page is
          where those scores get produced.</strong> It's separated because pipeline runs cost money per call
          and take 1–2 minutes — keeping the trigger here prevents accidental re-runs while browsing the
          shortlist.
        </p>
        <ol className="ml-4 list-decimal space-y-1">
          <li><strong>Click Run</strong> on each city. The pipeline pulls live camp providers and pricing data. Runs are sequential to keep cost and load predictable.</li>
          <li><strong>The composite score appears</strong> in the table — a 0–100 blend of pricing acceptance, scaled-operator presence, enrichment diversity, market depth, and market balance.</li>
          <li><strong>Return to Market Validation</strong> (link top-left) to see the full deep-dive, sub-scores, and capture Pursue / Hold / Drop decisions.</li>
        </ol>
      </div>



      {/* Progress strip */}
      <div
        className={`mb-5 flex items-center gap-2 rounded-lg border p-3 text-[12px] ${
          allDone
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-[#cfd8e6] bg-white text-[#526078]"
        }`}
      >
        {allDone ? (
          <CheckCircle2 className="h-4 w-4 shrink-0" />
        ) : (
          <Loader2 className={`h-4 w-4 shrink-0 ${anyRunning ? "animate-spin" : ""}`} />
        )}
        <span>
          <strong>{doneCount}</strong> of <strong>{totalCount}</strong> cities scored
          {allDone ? " — every shortlisted city has a live composite." : " — run the remaining cities to complete the shortlist."}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-[#e5eaf2] bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-[#f7faff] text-left text-[11px] uppercase tracking-wide text-[#526078]">
            <tr>
              <th className="px-3 py-2 font-semibold">City</th>
              <th className="px-3 py-2 font-semibold">Last run</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 text-right font-semibold">Composite</th>
              <th className="px-3 py-2 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {SHORTLISTED_CITIES.map((c) => (
              <CityRow
                key={c.city}
                city={c.city}
                state={c.state}
                latestRun={latestRuns[c.city] ?? null}
                flag={flags[c.city] ?? null}
                anyRunning={anyRunning}
                invokingCity={invokingCity}
                onRun={() => handleRun(c.city, c.state)}
                onComposite={reportComposite}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-[11px] text-[#8a96aa]">
        Runs are sequential — one city at a time keeps data-provider costs predictable and isolates failures.
      </div>
    </div>
  );
}

