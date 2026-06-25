// Phase 5 / Turn 5.2 — Admin-only Run Pipeline button + status surface.
//
// Visible wherever rendered. The backend function still enforces manager/admin
// before spending Firecrawl calls, so the UI should not disappear because of a
// stale client-side role check.
//
// Polls latest mvs_pipeline_runs row for the city every 3s while
// queued/running. Disabled + spinner during in-flight runs. Toast on
// terminal state. Calls onComplete() so the parent can refetch live data.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Play, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invalidateAllMvs } from "@/lib/mvs/useLiveMvs";
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

// Pre-crawl freshness shared helper (see src/lib/mvs/preCrawlFreshness.ts).
import {
  FRESH_SKIP_DAYS,
  FRESH_PROMPT_DAYS,
  ageDays,
  formatShortDate,
  findLastGoodRun as findLastGoodRunShared,
} from "@/lib/mvs/preCrawlFreshness";

type RunStatus = "queued" | "running" | "done" | "failed" | "done_stale" | "failed_no_data";

interface RunRow {
  id: string;
  status: RunStatus;
  started_at: string | null;
  finished_at: string | null;
  firecrawl_calls: number;
  error: string | null;
  created_at: string;
  fallback_reason: string | null;
  fallback_data_date: string | null;
}

const SELECT_COLS =
  "id, status, started_at, finished_at, firecrawl_calls, error, created_at, fallback_reason, fallback_data_date";

interface Props {
  city: string; // e.g. "Austin, TX"
  onComplete?: () => void;
  /**
   * "full"    — dashed-border card with button + meta + last-run status (default).
   * "compact" — just the button; caller renders status separately.
   */
  variant?: "full" | "compact";
}

export function RunPipelineButton({ city, onComplete, variant = "full" }: Props) {
  const [latest, setLatest] = useState<RunRow | null>(null);
  const [invoking, setInvoking] = useState(false);
  const [lastTerminalId, setLastTerminalId] = useState<string | null>(null);
  const initialSeededRef = useRef(false);
  const queryClient = useQueryClient();

  const fetchLatest = useCallback(async () => {
    const { data } = await supabase
      .from("mvs_pipeline_runs")
      .select(SELECT_COLS)
      .eq("city", city)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const row = (data as RunRow | null) ?? null;
    setLatest(row);
    if (!initialSeededRef.current && row && row.status !== "queued" && row.status !== "running") {
      setLastTerminalId(row.id);
      initialSeededRef.current = true;
    }
  }, [city]);

  // Reset per-city state when the selected city changes so the terminal-toast
  // guard re-seeds for the new city's last run (otherwise switching cities
  // fires a stale red toast on every click).
  useEffect(() => {
    setLatest(null);
    setLastTerminalId(null);
    initialSeededRef.current = false;
    fetchLatest();
  }, [fetchLatest]);

  const inFlight = latest?.status === "queued" || latest?.status === "running";

  // Poll while in-flight.
  useEffect(() => {
    if (!inFlight) return;
    const t = setInterval(fetchLatest, 3000);
    return () => clearInterval(t);
  }, [inFlight, fetchLatest]);

  // Fire toast + refresh once when a run reaches a terminal state.
  useEffect(() => {
    if (!latest) return;
    const terminal =
      latest.status === "done" ||
      latest.status === "failed" ||
      latest.status === "done_stale" ||
      latest.status === "failed_no_data";
    if (!terminal) return;
    if (lastTerminalId === latest.id) return;
    setLastTerminalId(latest.id);
    if (latest.status === "done") {
      toast.success(`Pipeline complete · ${latest.firecrawl_calls} Firecrawl calls`);
      invalidateAllMvs(queryClient);
      queryClient.refetchQueries({ queryKey: ["mvs-live"] });
      onComplete?.();
    } else if (latest.status === "done_stale") {
      const d = formatShortDate(latest.fallback_data_date);
      toast(`Crawl failed — using saved data${d ? ` from ${d}` : ""}.`, {
        description: latest.fallback_reason ?? undefined,
        duration: 8000,
      });
      // Still refresh so any other UI re-reads the saved-data timestamp.
      invalidateAllMvs(queryClient);
      queryClient.refetchQueries({ queryKey: ["mvs-live"] });
      onComplete?.();
    } else if (latest.status === "failed_no_data") {
      toast.error("Crawl failed — no recent saved data to fall back on.", {
        description: latest.fallback_reason ?? latest.error ?? undefined,
        duration: 10000,
      });
    } else {
      toast.error(`Pipeline failed: ${latest.error ?? "unknown error"}`);
    }
  }, [latest, lastTerminalId, onComplete, queryClient]);

  const [promptOpen, setPromptOpen] = useState(false);
  const [promptAge, setPromptAge] = useState<number | null>(null);
  const [promptDate, setPromptDate] = useState<string | null>(null);

  // Find newest successful run via shared helper.
  const findLastGoodRun = useCallback(() => findLastGoodRunShared(city), [city]);


  const startCrawl = useCallback(async (opts?: { force?: boolean }) => {
    setInvoking(true);
    try {
      const { data, error } = await supabase.functions.invoke("mvs-run-pipeline", {
        body: { city, forceFresh: !!opts?.force },
      });
      if (error) {
        toast.error(`Failed to start pipeline: ${error.message}`);
      } else if (data?.skipped) {
        const d = formatShortDate(data?.saved_data_date);
        toast.success(
          `Using saved data${d ? ` from ${d}` : ""} (${data?.age_days ?? "?"} days old) — fresh crawl skipped to save credits.`,
          { duration: 7000 },
        );
        invalidateAllMvs(queryClient);
        queryClient.refetchQueries({ queryKey: ["mvs-live"] });
        onComplete?.();
      } else if (data?.ok === false) {
        toast.error(`Pipeline error: ${data.error ?? "unknown"}`);
      } else if (data?.ok && data.summary) {
        const s = data.summary;
        toast.success(
          `Pipeline complete · ${s.providers_processed} providers · ${s.weeks_upserted} weeks upserted · ${s.screenshots_stored} screenshots · ${s.firecrawl_calls} Firecrawl call${s.firecrawl_calls === 1 ? "" : "s"}`,
          { duration: 8000 },
        );
        if (data.run_id) setLastTerminalId(data.run_id);
        invalidateAllMvs(queryClient);
        queryClient.refetchQueries({ queryKey: ["mvs-live"] });
        onComplete?.();
      }
      await fetchLatest();
    } catch (e) {
      toast.error(`Failed to start pipeline: ${(e as Error).message}`);
    } finally {
      setInvoking(false);
    }
  }, [city, fetchLatest, onComplete, queryClient]);

  const useSavedDataOnly = useCallback(
    (dateIso: string | null) => {
      const d = formatShortDate(dateIso);
      const age = ageDays(dateIso);
      toast.success(
        `Using saved data${d ? ` from ${d}` : ""}${age != null ? ` (${age} day${age === 1 ? "" : "s"} old)` : ""} — skipped fresh crawl to save credits.`,
        { duration: 7000 },
      );
      invalidateAllMvs(queryClient);
      queryClient.refetchQueries({ queryKey: ["mvs-live"] });
      onComplete?.();
    },
    [onComplete, queryClient],
  );

  // Click handler: apply the freshness pre-check, then either skip / prompt / run.
  const handleRun = useCallback(
    async (opts?: { force?: boolean }) => {
      if (opts?.force) {
        await startCrawl({ force: true });
        return;
      }
      let lastGoodIso: string | null = null;
      try {
        lastGoodIso = await findLastGoodRun();
      } catch {
        toast.error(
          `Couldn't confirm saved-data age for ${city}. Click "Force fresh crawl" if you still want to crawl.`,
          { duration: 8000 },
        );
        return;
      }
      const age = ageDays(lastGoodIso);
      if (age == null) {
        // No prior successful run → run fresh (backend guard will allow it).
        await startCrawl({ force: true });
        return;
      }
      if (age <= FRESH_SKIP_DAYS) {
        useSavedDataOnly(lastGoodIso);
        return;
      }
      if (age <= FRESH_PROMPT_DAYS) {
        setPromptAge(age);
        setPromptDate(lastGoodIso);
        setPromptOpen(true);
        return;
      }
      // > 60 days → run fresh automatically.
      await startCrawl({ force: true });
    },
    [city, findLastGoodRun, startCrawl, useSavedDataOnly],
  );

  const busy = invoking || inFlight;
  const status = latest?.status;
  const statusMeta = useMemo(() => {
    switch (status) {
      case "done":
        return { icon: CheckCircle2, color: "text-emerald-600", label: "done" };
      case "done_stale":
        return { icon: Info, color: "text-amber-600", label: "done (saved data)" };
      case "failed":
        return { icon: AlertTriangle, color: "text-red-600", label: "failed" };
      case "failed_no_data":
        return { icon: AlertTriangle, color: "text-red-600", label: "failed (no recent data)" };
      default:
        return null;
    }
  }, [status]);
  const StatusIcon = statusMeta?.icon ?? null;

  const triggerButton = (
    <button
      type="button"
      onClick={() => { void handleRun(); }}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-md bg-[#174be8] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#0f37b5] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
      {busy ? (latest?.status === "running" ? "Running…" : "Starting…") : "Run Pipeline"}
    </button>
  );

  const forceFreshLink = (
    <button
      type="button"
      onClick={() => { void handleRun({ force: true }); }}
      disabled={busy}
      className="text-[11px] font-medium text-[#174be8] underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
      title="Bypass the saved-data check and crawl the city again now."
    >
      Force fresh crawl
    </button>
  );

  const promptDialog = (
    <AlertDialog open={promptOpen} onOpenChange={setPromptOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>This city has recent saved data</AlertDialogTitle>
          <AlertDialogDescription>
            {city} was last crawled on {formatShortDate(promptDate)}
            {promptAge != null ? ` (${promptAge} days ago)` : ""}.
            Use the saved data, or run a fresh crawl now? A fresh crawl will use Firecrawl credits.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              setPromptOpen(false);
              useSavedDataOnly(promptDate);
            }}
          >
            Use saved data
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setPromptOpen(false);
              void startCrawl({ force: true });
            }}
          >
            Run fresh crawl
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (variant === "compact") {
    return (
      <>
        {triggerButton}
        {promptDialog}
      </>
    );
  }

  const staleAge = ageDays(latest?.fallback_data_date ?? null);

  return (
    <div className="mb-5 rounded-lg border border-dashed bg-white p-3" style={{ borderColor: "#cfd8e6" }}>
      <div className="flex flex-wrap items-center gap-3">
        {triggerButton}
        {forceFreshLink}
        <div className="text-[11px] text-[#526078]">
          Admin only · discover → classify → ACS · cap 30 Firecrawl calls · skips re-crawl if saved data ≤ 30 days
        </div>
        {latest && statusMeta && (
          <div className="ml-auto flex items-center gap-2 text-[11px] text-[#526078]">
            {StatusIcon && <StatusIcon className={`h-3.5 w-3.5 ${statusMeta.color}`} />}
            <span>
              Last run:&nbsp;
              <span className="font-semibold text-[#07142f]">{statusMeta.label}</span>
              {" · "}
              {latest.firecrawl_calls} calls
              {" · "}
              {new Date(latest.created_at).toLocaleString()}
            </span>
          </div>
        )}
      </div>
      {latest?.status === "done_stale" && (
        <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <span className="font-semibold">Using saved data{latest.fallback_data_date ? ` from ${formatShortDate(latest.fallback_data_date)}` : ""}</span>
            {staleAge != null && <> ({staleAge} day{staleAge === 1 ? "" : "s"} old)</>}
            {" — new crawl failed."}
            {latest.fallback_reason && (
              <div className="mt-0.5 text-amber-800/80">{latest.fallback_reason}</div>
            )}
          </div>
        </div>
      )}
      {latest?.status === "failed_no_data" && (
        <div className="mt-2 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-900">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <span className="font-semibold">Needs review</span> — crawl failed and no recent saved data (≤ 60 days) exists. Try running the pipeline again.
            {latest.fallback_reason && (
              <div className="mt-0.5 text-red-800/80">{latest.fallback_reason}</div>
            )}
          </div>
        </div>
      )}
      {promptDialog}
    </div>
  );
}

/**
 * Compact status strip — shows last-run info next to the compact button.
 * Reads the same `mvs_pipeline_runs` row, no polling (parent polls via button).
 */
export function PipelineStatusStrip({ city }: { city: string }) {
  const [latest, setLatest] = useState<RunRow | null>(null);

  const fetchLatest = useCallback(async () => {
    const { data } = await supabase
      .from("mvs_pipeline_runs")
      .select(SELECT_COLS)
      .eq("city", city)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setLatest((data as RunRow | null) ?? null);
  }, [city]);

  useEffect(() => {
    fetchLatest();
    const t = setInterval(fetchLatest, 3000);
    return () => clearInterval(t);
  }, [fetchLatest]);

  const meta = (() => {
    switch (latest?.status) {
      case "done":
        return { icon: CheckCircle2, color: "text-emerald-600", label: "done" };
      case "done_stale":
        return { icon: Info, color: "text-amber-600", label: "done (saved data)" };
      case "failed":
        return { icon: AlertTriangle, color: "text-red-600", label: "failed" };
      case "failed_no_data":
        return { icon: AlertTriangle, color: "text-red-600", label: "failed (no recent data)" };
      default:
        return null;
    }
  })();
  const StatusIcon = meta?.icon ?? null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#526078]">
      <span>Admin only · discover → classify → ACS · cap 30 Firecrawl calls</span>
      {latest && meta && (
        <span className="flex items-center gap-1.5">
          {StatusIcon && <StatusIcon className={`h-3.5 w-3.5 ${meta.color}`} />}
          <span>
            Last run:&nbsp;
            <span className="font-semibold text-[#07142f]">{meta.label}</span>
            {" · "}
            {latest.firecrawl_calls} calls
            {" · "}
            {new Date(latest.created_at).toLocaleString()}
            {latest.status === "done_stale" && latest.fallback_data_date && (
              <> · saved data from {formatShortDate(latest.fallback_data_date)}</>
            )}
          </span>
        </span>
      )}
    </div>
  );
}
