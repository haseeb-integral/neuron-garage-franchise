// City scoring console — manager-only page that runs the live MVS pipeline
// across the same shortlisted cities shown on Market Validation. One row per city, sequential runs, live
// composite recomputed via useLiveMvs.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Info,
  Loader2,
  Play,
  RotateCcw,
  ShieldCheck,
  Square,
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

type RunStatus = "queued" | "running" | "done" | "failed" | "done_stale" | "failed_no_data";

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

interface SkipInfo {
  dateIso: string | null;
  age: number | null;
  at: number; // epoch ms when the skip happened
}

function CityRow({
  city,
  state: _state,
  latestRun,
  flag,
  anyRunning,
  invokingCity,
  skipInfo,
  onRun,
  onForceFresh,
  onStop,
  onComposite,
}: {
  city: string;
  state: string;
  latestRun: RunRow | null;
  flag: FlagRow | null;
  anyRunning: boolean;
  invokingCity: string | null;
  skipInfo: SkipInfo | null;
  onRun: () => void;
  onForceFresh: () => void;
  onStop: () => void;
  onComposite: (city: string, mvs: number | null) => void;
}) {
  const live = useLiveMvs(city);
  const composite = live.result?.mvs ?? null;

  useEffect(() => {
    onComposite(city, composite);
  }, [city, composite, onComposite]);

  const status = latestRun?.status ?? null;
  const catchupMetaCheck = (latestRun?.source_counts as any)?.catchup;
  const isCatchingUpCheck = status === "done" && catchupMetaCheck && (catchupMetaCheck.batches_completed ?? 0) < (catchupMetaCheck.batches_total ?? 0);
  const inFlight = status === "queued" || status === "running" || isCatchingUpCheck;
  const isInvoking = invokingCity === city;
  const canRun = !anyRunning && !invokingCity;

  const statusPill = (() => {
    if (!status) return <span className="text-[11px] text-[#8a96aa]">never run</span>;
    const map: Record<RunStatus, { text: string; cls: string; icon: typeof CheckCircle2 | null }> = {
      queued: { text: "queued", cls: "bg-amber-50 text-amber-800 border-amber-200", icon: Loader2 },
      running: { text: "running", cls: "bg-blue-50 text-blue-800 border-blue-200", icon: Loader2 },
      done: { text: "done", cls: "bg-emerald-50 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
      done_stale: { text: "done (stale)", cls: "bg-amber-50 text-amber-800 border-amber-200", icon: CheckCircle2 },
      failed: { text: "failed", cls: "bg-red-50 text-red-800 border-red-200", icon: AlertTriangle },
      failed_no_data: { text: "failed (no data)", cls: "bg-red-50 text-red-800 border-red-200", icon: AlertTriangle },
    };
    const s = map[status];
    const Icon = s.icon;
    const catchupMeta = (latestRun?.source_counts as any)?.catchup;
    const isCatchingUp = status === "done" && catchupMeta && (catchupMeta.batches_completed ?? 0) < (catchupMeta.batches_total ?? 0);

    const pill = (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${isCatchingUp ? "bg-blue-50 text-blue-800 border-blue-200" : s.cls} ${status === "failed" ? "cursor-help" : ""}`}
      >
        {isCatchingUp ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
            <span>filling prices: {catchupMeta.batches_completed}/{catchupMeta.batches_total}</span>
          </>
        ) : (
          <>
            {Icon && <Icon className={`h-3 w-3 ${status === "running" || status === "queued" ? "animate-spin" : ""}`} />}
            {s.text}
          </>
        )}
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
                {(sourceCounts as any)?.catchup && (
                  <div className="mt-2 border-t pt-1.5 text-[11px] text-blue-700">
                    <span className="font-semibold text-blue-900">Missing price catch-up:</span>{" "}
                    {(sourceCounts as any).catchup.batches_completed ?? 0} of{" "}
                    {(sourceCounts as any).catchup.batches_total ?? "?"} batches completed
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

          {skipInfo && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-help items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Skipped — saved data{skipInfo.age != null ? ` (${skipInfo.age}d old)` : ""}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-[12px] leading-relaxed">
                <div className="font-semibold mb-1">Fresh crawl skipped</div>
                <div className="text-[11px]">
                  Saved data{skipInfo.dateIso ? ` from ${formatShortDate(skipInfo.dateIso)}` : ""} is
                  {skipInfo.age != null ? ` ${skipInfo.age} day${skipInfo.age === 1 ? "" : "s"} old` : " recent"} (≤ 30 days),
                  so the pipeline reused it to save Firecrawl credits. Click <em>Force fresh</em> to override.
                </div>
              </TooltipContent>
            </Tooltip>
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
        <div className="flex flex-col items-end gap-1">
          <div>
            {composite != null ? composite.toFixed(1) : <span className="text-[#8a96aa]">—</span>}
          </div>
          {showStaleWarning && (
            <div className="inline-flex items-start gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-left font-sans text-[10px] leading-snug text-amber-800">
              <Info className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />
              <span>
                Score may be stale — last run failed
                {failedDate ? ` on ${new Date(failedDate).toLocaleDateString()}` : ""}. Click Run to refresh.
              </span>
            </div>
          )}
        </div>
      </td>


      <td className="px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {inFlight || isInvoking ? (
            <button
              type="button"
              onClick={onStop}
              title="Stop this running pipeline immediately"
              className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-red-700 animate-pulse"
            >
              <Square className="h-3 w-3 fill-current" />
              Stop
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onRun}
                disabled={!canRun}
                title={anyRunning ? "Another city is running" : "Run pipeline (uses saved data if ≤ 30 days old)"}
                className="inline-flex items-center gap-1 rounded-md bg-[#174be8] px-2 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#0f37b5] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play className="h-3 w-3" />
                Run
              </button>
              <button
                type="button"
                onClick={onForceFresh}
                disabled={!canRun}
                title="Bypass the saved-data check and crawl this city again now."
                className="inline-flex items-center gap-1 rounded-md border border-[#174be8] bg-white px-2 py-1 text-[11px] font-semibold text-[#174be8] transition hover:bg-[#eef3ff] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Force fresh
              </button>
            </>
          )}
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
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptCity, setPromptCity] = useState<string | null>(null);
  const [promptState, setPromptState] = useState<string | null>(null);
  const [promptDateIso, setPromptDateIso] = useState<string | null>(null);
  const [promptAge, setPromptAge] = useState<number | null>(null);
  const [skipInfos, setSkipInfos] = useState<Record<string, SkipInfo>>({});
  const queryClient = useQueryClient();

  const recordSkip = useCallback((city: string, dateIso: string | null, age: number | null) => {
    setSkipInfos((prev) => ({ ...prev, [city]: { dateIso, age, at: Date.now() } }));
  }, []);
  const clearSkip = useCallback((city: string) => {
    setSkipInfos((prev) => {
      if (!prev[city]) return prev;
      const next = { ...prev };
      delete next[city];
      return next;
    });
  }, []);


  const { rows: additions, addCity } = useShortlistAdditions();
  const SHORTLISTED_CITIES = useMemo<{ city: string; state: string }[]>(
    () => {
      const merged = [
        ...BASE_SHORTLIST,
        ...additions.map((a) => ({ city: `${a.city}, ${a.state}`, state: a.state })),
      ];
      const seen = new Set<string>();
      const out: { city: string; state: string }[] = [];
      for (const row of merged) {
        const key = row.city.trim().toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(row);
      }
      return out;
    },
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

  const anyRunningOrCatchingUp = useMemo(
    () => Object.values(latestRuns).some((r) => {
      if (!r) return false;
      if (r.status === "queued" || r.status === "running") return true;
      if (r.status === "done") {
        const catchup = (r.source_counts as any)?.catchup;
        if (catchup && (catchup.batches_completed ?? 0) < (catchup.batches_total ?? 0)) return true;
      }
      return false;
    }),
    [latestRuns],
  );

  const anyRunning = useMemo(
    () => Object.values(latestRuns).some((r) => {
      if (!r) return false;
      if (r.status === "queued" || r.status === "running") return true;
      if (r.status === "done") {
        const catchup = (r.source_counts as any)?.catchup;
        if (catchup && (catchup.batches_completed ?? 0) < (catchup.batches_total ?? 0)) return true;
      }
      return false;
    }),
    [latestRuns],
  );

  // Poll while any city is in-flight, catching up background jobs, or while we just kicked one off.
  useEffect(() => {
    if (!anyRunningOrCatchingUp && !invokingCity) return;
    const t = setInterval(fetchAll, 4000);
    return () => clearInterval(t);
  }, [anyRunningOrCatchingUp, invokingCity, fetchAll]);

  // Actually invoke the edge function. `force=true` bypasses the backend
  // freshness guard so the crawl always runs.
  const startCrawl = useCallback(async (city: string, opts?: { force?: boolean }) => {
    if (anyRunning || invokingCity) {
      toast.error("Wait for the in-flight run to finish — runs are sequential by design.");
      return;
    }
    setInvokingCity(city);
    try {
      const { data, error } = await supabase.functions.invoke("mvs-run-pipeline", {
        body: { city, forceFresh: !!opts?.force },
      });
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
      } else if (data?.skipped) {
        // Backend guard blocked the crawl because saved data is fresh.
        const d = formatShortDate(data?.saved_data_date);
        const age = typeof data?.age_days === "number" ? data.age_days : null;
        recordSkip(city, data?.saved_data_date ?? null, age);
        toast.success(
          `${city}: using saved data${d ? ` from ${d}` : ""}${age != null ? ` (${age} day${age === 1 ? "" : "s"} old)` : ""} — fresh crawl skipped to save credits.`,
          {
            duration: 12000,
            action: {
              label: "Force fresh",
              onClick: () => { void startCrawl(city, { force: true }); },
            },
          },
        );
        invalidateAllMvs(queryClient);
        queryClient.refetchQueries({ queryKey: ["mvs-live"] });
      } else if (data?.already_running) {
        toast.info(data?.message ?? `${city} is already running — refreshing status.`);
      } else if (data?.ok && data?.run_id) {
        clearSkip(city);
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
  }, [anyRunning, invokingCity, fetchAll, queryClient]);

  // Normal Run click: freshness pre-check → skip / prompt / run.
  const handleRun = useCallback(async (city: string, state: string) => {
    if (anyRunning || invokingCity) {
      toast.error("Wait for the in-flight run to finish — runs are sequential by design.");
      return;
    }
    let decision: Awaited<ReturnType<typeof decideFreshness>>;
    try {
      decision = await decideFreshness(city);
    } catch {
      // Fail safe: do NOT auto-crawl when the lookup fails.
      toast.error(
        `Couldn't confirm saved-data age for ${city}. Click "Force fresh" if you still want to crawl.`,
        { duration: 8000 },
      );
      return;
    }
    if (decision.kind === "skip") {
      const d = formatShortDate(decision.dateIso);
      recordSkip(city, decision.dateIso, decision.age);
      toast.success(
        `${city}: using saved data${d ? ` from ${d}` : ""} (${decision.age} day${decision.age === 1 ? "" : "s"} old) — skipped fresh crawl to save credits.`,
        {
          duration: 12000,
          action: {
            label: "Force fresh",
            onClick: () => { void startCrawl(city, { force: true }); },
          },
        },
      );
      invalidateAllMvs(queryClient);
      queryClient.refetchQueries({ queryKey: ["mvs-live"] });
      await fetchAll();
      return;
    }
    if (decision.kind === "prompt") {
      setPromptCity(city);
      setPromptState(state);
      setPromptDateIso(decision.dateIso);
      setPromptAge(decision.age);
      setPromptOpen(true);
      return;
    }
    // > 60 days or no prior good run → run fresh (backend guard will also let it through).
    await startCrawl(city, { force: true });
  }, [anyRunning, invokingCity, fetchAll, queryClient, startCrawl]);

  // Force fresh: skip pre-check entirely AND tell the backend to bypass its guard.
  const handleForceFresh = useCallback(
    (city: string) => startCrawl(city, { force: true }),
    [startCrawl],
  );

  const handleStop = useCallback(
    async (city: string) => {
      const run = latestRuns[city];
      if (!run) return;
      toast.info(`Cancelling pipeline run for ${city}...`);
      await supabase
        .from("mvs_pipeline_runs")
        .update({ status: "failed", error: "Cancelled by user" })
        .eq("id", run.id);
      setInvokingCity(null);
      await fetchAll();
    },
    [latestRuns, fetchAll],
  );

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

  const doneCount = SHORTLISTED_CITIES.filter((c) => {
    const st = latestRuns[c.city]?.status;
    return st === "done" || st === "done_stale";
  }).length;
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
      <div className="mb-5 rounded-lg border border-[#e5eaf2] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between text-[13px] mb-2">
          <div className="flex items-center gap-2">
            {allDone ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <Loader2 className={`h-4 w-4 shrink-0 text-[#174be8] ${anyRunning ? "animate-spin" : ""}`} />
            )}
            <span className="font-semibold text-[#07142f]">
              Shortlist Scoring Progress: <strong>{doneCount}</strong> of <strong>{totalCount}</strong> cities completed
            </span>
          </div>
          <span className="font-mono text-xs font-semibold text-[#526078]">
            {Math.round((doneCount / (totalCount || 1)) * 100)}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#f0f4fa]">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              allDone ? "bg-emerald-500" : anyRunning ? "bg-[#174be8] animate-pulse" : "bg-[#174be8]"
            }`}
            style={{ width: `${Math.round((doneCount / (totalCount || 1)) * 100)}%` }}
          />
        </div>
        <div className="mt-2 text-[11px] text-[#8a96aa] flex items-center justify-between">
          <span>
            {allDone ? "Every shortlisted city has a live composite score." : "Run the remaining cities below to complete the shortlist."}
          </span>
          {anyRunning && (
            <span className="inline-flex items-center gap-1 font-medium text-[#174be8]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#174be8] animate-ping" />
              Pipeline active...
            </span>
          )}
        </div>
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
                skipInfo={skipInfos[c.city] ?? null}
                onRun={() => handleRun(c.city, c.state)}
                onForceFresh={() => handleForceFresh(c.city)}
                onStop={() => handleStop(c.city)}
                onComposite={reportComposite}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-[11px] text-[#8a96aa]">
        Runs are sequential — one city at a time keeps data-provider costs predictable and isolates failures.
        Cities with saved data ≤ 30 days old are skipped automatically; use <em>Force fresh</em> to override.
      </div>

      <AlertDialog open={promptOpen} onOpenChange={setPromptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>This city has recent saved data</AlertDialogTitle>
            <AlertDialogDescription>
              {promptCity} was last crawled on {formatShortDate(promptDateIso)}
              {promptAge != null ? ` (${promptAge} days ago)` : ""}.
              Use the saved data, or run a fresh crawl now? A fresh crawl will use Firecrawl credits.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPromptOpen(false);
                const d = formatShortDate(promptDateIso);
                const age = ageDays(promptDateIso);
                if (promptCity) recordSkip(promptCity, promptDateIso, age);
                toast.success(
                  `${promptCity ?? "City"}: using saved data${d ? ` from ${d}` : ""}${age != null ? ` (${age} day${age === 1 ? "" : "s"} old)` : ""} — skipped fresh crawl.`,
                  {
                    duration: 12000,
                    action: promptCity ? {
                      label: "Force fresh",
                      onClick: () => { void startCrawl(promptCity, { force: true }); },
                    } : undefined,
                  },
                );
                invalidateAllMvs(queryClient);
                queryClient.refetchQueries({ queryKey: ["mvs-live"] });
                void fetchAll();
              }}
            >
              Use saved data
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setPromptOpen(false);
                if (promptCity) void startCrawl(promptCity, { force: true });
              }}
            >
              Run fresh crawl
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

