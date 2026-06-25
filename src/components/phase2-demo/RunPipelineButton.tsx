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

function formatShortDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function ageDays(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

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

  // Fire toast + refresh once when a run transitions to terminal.
  // The toast text comes from the invoke response when present (richer summary);
  // polling fallback keeps the simpler call-count line.
  useEffect(() => {
    if (!latest) return;
    if (latest.status !== "done" && latest.status !== "failed") return;
    if (lastTerminalId === latest.id) return;
    setLastTerminalId(latest.id);
    if (latest.status === "done") {
      toast.success(`Pipeline complete · ${latest.firecrawl_calls} Firecrawl calls`);
      // Invalidate + force an immediate refetch so the "Scores as of" timestamp
      // and all sub-score "scraped on" dates update right now instead of on
      // next page-visit. Without the refetch, cachedAt stays old.
      invalidateAllMvs(queryClient);
      queryClient.refetchQueries({ queryKey: ["mvs-live"] });
      onComplete?.();
    } else {
      toast.error(`Pipeline failed: ${latest.error ?? "unknown error"}`);
    }
  }, [latest, lastTerminalId, onComplete, queryClient]);

  const handleRun = async () => {
    setInvoking(true);
    try {
      const { data, error } = await supabase.functions.invoke("mvs-run-pipeline", {
        body: { city },
      });
      if (error) {
        toast.error(`Failed to start pipeline: ${error.message}`);
      } else if (data?.ok === false) {
        toast.error(`Pipeline error: ${data.error ?? "unknown"}`);
      } else if (data?.ok && data.summary) {
        const s = data.summary;
        toast.success(
          `Pipeline complete · ${s.providers_processed} providers · ${s.weeks_upserted} weeks upserted · ${s.screenshots_stored} screenshots · ${s.firecrawl_calls} Firecrawl call${s.firecrawl_calls === 1 ? "" : "s"}`,
          { duration: 8000 },
        );
        // Pre-mark this run id so the polling effect doesn't fire a second toast.
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
  };

  const busy = invoking || inFlight;
  const StatusIcon = latest?.status === "done"
    ? CheckCircle2
    : latest?.status === "failed"
      ? AlertTriangle
      : null;

  const triggerButton = (
    <button
      type="button"
      onClick={handleRun}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-md bg-[#174be8] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#0f37b5] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
      {busy ? (latest?.status === "running" ? "Running…" : "Starting…") : "Run Pipeline"}
    </button>
  );

  if (variant === "compact") {
    return triggerButton;
  }

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-dashed bg-white p-3" style={{ borderColor: "#cfd8e6" }}>
      {triggerButton}
      <div className="text-[11px] text-[#526078]">
        Admin only · discover → classify → ACS · cap 30 Firecrawl calls
      </div>
      {latest && (
        <div className="ml-auto flex items-center gap-2 text-[11px] text-[#526078]">
          {StatusIcon && (
            <StatusIcon
              className={`h-3.5 w-3.5 ${latest.status === "done" ? "text-emerald-600" : "text-red-600"}`}
            />
          )}
          <span>
            Last run:&nbsp;
            <span className="font-semibold text-[#07142f]">{latest.status}</span>
            {" · "}
            {latest.firecrawl_calls} calls
            {" · "}
            {new Date(latest.created_at).toLocaleString()}
          </span>
        </div>
      )}
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
      .select("id, status, started_at, finished_at, firecrawl_calls, error, created_at")
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

  const StatusIcon = latest?.status === "done"
    ? CheckCircle2
    : latest?.status === "failed"
      ? AlertTriangle
      : null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#526078]">
      <span>Admin only · discover → classify → ACS · cap 30 Firecrawl calls</span>
      {latest && (
        <span className="flex items-center gap-1.5">
          {StatusIcon && (
            <StatusIcon
              className={`h-3.5 w-3.5 ${latest.status === "done" ? "text-emerald-600" : "text-red-600"}`}
            />
          )}
          <span>
            Last run:&nbsp;
            <span className="font-semibold text-[#07142f]">{latest.status}</span>
            {" · "}
            {latest.firecrawl_calls} calls
            {" · "}
            {new Date(latest.created_at).toLocaleString()}
          </span>
        </span>
      )}
    </div>
  );
}
