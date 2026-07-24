// Apify circuit breaker status + manual controls for the City Scoring Console.
//
// Reads `public.apify_breaker_state` (single-row table, id=true) and exposes
// two staff-only RPCs:
//   - apify_breaker_set_paused(_paused boolean)  → pause / resume
//   - apify_breaker_force_close()                → clear the breaker after a fix
//
// The breaker itself is written by shared/apifyBreaker.ts inside the edge
// functions that talk to Apify (mvs-discover-providers, mvs-price-b3).

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Pause, Play, RotateCcw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type BreakerRow = {
  state: "closed" | "half_open" | "open";
  consecutive_failures: number;
  opened_at: string | null;
  next_retry_at: string | null;
  paused_by_user: boolean;
  paused_by: string | null;
  paused_at: string | null;
  last_error: string | null;
  last_actor: string | null;
  updated_at: string | null;
};

function fmt(ts: string | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function minutesUntil(ts: string | null): number | null {
  if (!ts) return null;
  const ms = new Date(ts).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.ceil(ms / 60000));
}

export function ApifyBreakerCard() {
  const [row, setRow] = useState<BreakerRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"pause" | "resume" | "close" | null>(null);

  const fetchRow = useCallback(async () => {
    const { data, error } = await supabase
      .from("apify_breaker_state")
      .select(
        "state, consecutive_failures, opened_at, next_retry_at, paused_by_user, paused_by, paused_at, last_error, last_actor, updated_at",
      )
      .eq("id", true)
      .maybeSingle();
    if (error) {
      console.warn("[ApifyBreakerCard] read failed:", error.message);
    } else {
      setRow((data as BreakerRow | null) ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRow();
    const t = setInterval(fetchRow, 20_000);
    return () => clearInterval(t);
  }, [fetchRow]);

  const setPaused = useCallback(
    async (paused: boolean) => {
      setBusy(paused ? "pause" : "resume");
      const { error } = await supabase.rpc("apify_breaker_set_paused", { _paused: paused });
      setBusy(null);
      if (error) {
        toast.error(`Could not ${paused ? "pause" : "resume"} pipeline: ${error.message}`);
        return;
      }
      toast.success(paused ? "Apify pipeline paused" : "Apify pipeline resumed");
      fetchRow();
    },
    [fetchRow],
  );

  const forceClose = useCallback(async () => {
    setBusy("close");
    const { error } = await supabase.rpc("apify_breaker_force_close");
    setBusy(null);
    if (error) {
      toast.error(`Could not clear breaker: ${error.message}`);
      return;
    }
    toast.success("Circuit breaker cleared");
    fetchRow();
  }, [fetchRow]);

  if (loading) {
    return (
      <div className="mb-5 flex items-center gap-2 rounded-lg border border-[#e5eaf2] bg-white p-4 text-[12px] text-[#526078] shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-[#174be8]" />
        Loading Apify pipeline status…
      </div>
    );
  }

  if (!row) {
    return (
      <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-[12px] text-amber-900 shadow-sm">
        No Apify breaker row found. Something's off with the pipeline health table.
      </div>
    );
  }

  const paused = row.paused_by_user;
  const open = row.state === "open";
  const halfOpen = row.state === "half_open";
  const healthy = !paused && !open && !halfOpen;
  const retryMins = minutesUntil(row.next_retry_at);

  const tone =
    paused ? {
      border: "border-purple-300",
      bg: "bg-purple-50",
      badge: "bg-purple-100 text-purple-900",
      icon: <Pause className="h-4 w-4 text-purple-700" />,
      label: "Paused by operator",
    }
    : open ? {
      border: "border-red-300",
      bg: "bg-red-50",
      badge: "bg-red-100 text-red-900",
      icon: <ShieldAlert className="h-4 w-4 text-red-700" />,
      label: `Circuit open${retryMins != null ? ` — auto-retry in ~${retryMins} min` : ""}`,
    }
    : halfOpen ? {
      border: "border-amber-300",
      bg: "bg-amber-50",
      badge: "bg-amber-100 text-amber-900",
      icon: <AlertTriangle className="h-4 w-4 text-amber-700" />,
      label: "Probing — one test call allowed",
    }
    : {
      border: "border-emerald-200",
      bg: "bg-emerald-50",
      badge: "bg-emerald-100 text-emerald-900",
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-700" />,
      label: "Healthy",
    };

  return (
    <div className={`mb-5 rounded-lg border ${tone.border} ${tone.bg} p-4 shadow-sm`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#07142f]">
            {tone.icon}
            Apify Pipeline Health
            <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone.badge}`}>
              {tone.label}
            </span>
          </div>
          <div className="text-[12px] leading-relaxed text-[#07142f]">
            {healthy && (
              <>All Apify-backed sources (Google Maps, Google Search, Yelp, Sawyer, ActivityHero) are running normally.</>
            )}
            {open && (
              <>
                The breaker tripped after repeated Apify errors. New discover / price calls will short-circuit
                (returning 503) until <strong>{fmt(row.next_retry_at)}</strong>, then one probe call is allowed
                through. Any success closes the breaker automatically.
              </>
            )}
            {halfOpen && (
              <>The breaker is testing recovery — the next Apify call decides whether we close or re-open with a longer back-off.</>
            )}
            {paused && (
              <>
                The pipeline is paused. No edge function will call Apify until you resume. Use this when
                Apify is having an incident or when we've hit a spend cap.
              </>
            )}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-[#526078] sm:grid-cols-4">
            <div>
              <div className="font-semibold text-[#07142f]">State</div>
              <div className="font-mono">{row.state}</div>
            </div>
            <div>
              <div className="font-semibold text-[#07142f]">Consecutive failures</div>
              <div className="font-mono">{row.consecutive_failures}</div>
            </div>
            <div>
              <div className="font-semibold text-[#07142f]">Opened at</div>
              <div className="font-mono">{fmt(row.opened_at)}</div>
            </div>
            <div>
              <div className="font-semibold text-[#07142f]">Next retry</div>
              <div className="font-mono">{fmt(row.next_retry_at)}</div>
            </div>
          </div>
          {(row.last_error || row.last_actor) && (
            <div className="mt-2 rounded border border-[#e5eaf2] bg-white/70 p-2 text-[11px] text-[#07142f]">
              <div className="font-semibold text-[#07142f]">Last error</div>
              <div className="font-mono text-[#526078] break-words">
                {(row.last_actor ? `[${row.last_actor}] ` : "") + (row.last_error ?? "—")}
              </div>
            </div>
          )}
          {paused && (row.paused_by || row.paused_at) && (
            <div className="mt-2 text-[11px] text-[#526078]">
              Paused by <span className="font-mono">{row.paused_by ?? "unknown"}</span> at {fmt(row.paused_at)}.
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          {!paused ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setPaused(true)}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1.5 rounded-md border border-purple-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-purple-800 hover:bg-purple-50 disabled:opacity-50"
                >
                  {busy === "pause" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pause className="h-3 w-3" />}
                  Pause Apify
                </button>
              </TooltipTrigger>
              <TooltipContent>Stop all Apify calls until you resume.</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setPaused(false)}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                >
                  {busy === "resume" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                  Resume Apify
                </button>
              </TooltipTrigger>
              <TooltipContent>Allow edge functions to call Apify again.</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={forceClose}
                disabled={busy !== null || (healthy && row.consecutive_failures === 0)}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#cfd8e6] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#07142f] hover:bg-[#f7faff] disabled:opacity-50"
              >
                {busy === "close" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                Force close
              </button>
            </TooltipTrigger>
            <TooltipContent>
              Admin-only. Reset failure counters and let calls through immediately.
            </TooltipContent>
          </Tooltip>
          <button
            type="button"
            onClick={fetchRow}
            className="inline-flex items-center justify-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-[#526078] hover:text-[#174be8]"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
