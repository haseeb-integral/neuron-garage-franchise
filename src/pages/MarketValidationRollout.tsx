// Phase 7 / Turn 7.1 — Tier A rollout operator console.
//
// Manager-only single page that drives the 8-city Tier A live rollout:
//   - One row per Tier A city, sequential Run Pipeline, per-city Flip to live
//     / Unwind, live composite recomputed via useLiveMvs (Brett's rule).
//   - Calibration banner: once every city has a `done` run, ranks composites
//     and flags if Boston is outside the top quartile.
//   - Human-test signoff checklist persisted to localStorage per browser
//     (operator workflow, not shared state).

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
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLiveMvs } from "@/lib/mvs/useLiveMvs";
import { useAuth } from "@/contexts/AuthContext";

const TIER_A: { city: string; state: string }[] = [
  { city: "Austin, TX", state: "TX" },
  { city: "New York, NY", state: "NY" },
  { city: "Houston, TX", state: "TX" },
  { city: "Chicago, IL", state: "IL" },
  { city: "Boston, MA", state: "MA" },
  { city: "San Antonio, TX", state: "TX" },
  { city: "Philadelphia, PA", state: "PA" },
  { city: "Los Angeles, CA", state: "CA" },
];

type RunStatus = "queued" | "running" | "done" | "failed";

interface RunRow {
  id: string;
  status: RunStatus;
  started_at: string | null;
  finished_at: string | null;
  firecrawl_calls: number;
  error: string | null;
  created_at: string;
}

interface FlagRow {
  city: string;
  mvs_data_source: "sample" | "live";
  low_confidence_badge: boolean;
}

type SignoffChecks = {
  rowMatchesPanel: boolean;
  formulaDrawer: boolean;
  sliderUpdates: boolean;
  pdfExport: boolean;
  signedBy: string;
};

const EMPTY_CHECKS: SignoffChecks = {
  rowMatchesPanel: false,
  formulaDrawer: false,
  sliderUpdates: false,
  pdfExport: false,
  signedBy: "",
};

const SIGNOFF_KEY = "mvs_rollout_signoff_v1";

function loadSignoff(): Record<string, SignoffChecks> {
  try {
    const raw = localStorage.getItem(SIGNOFF_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, SignoffChecks>;
  } catch {
    return {};
  }
}
function saveSignoff(all: Record<string, SignoffChecks>) {
  localStorage.setItem(SIGNOFF_KEY, JSON.stringify(all));
}

function isFullySignedOff(c: SignoffChecks | undefined): boolean {
  if (!c) return false;
  return c.rowMatchesPanel && c.formulaDrawer && c.sliderUpdates && c.pdfExport && c.signedBy.trim().length > 0;
}

// ---------------------------------------------------------------------------
// Per-row hook — composite via shared computeMvs helper (Brett's rule).
// ---------------------------------------------------------------------------

function CityRow({
  city,
  state,
  latestRun,
  flag,
  anyRunning,
  invokingCity,
  onRun,
  onFlip,
  onUnwind,
  onComposite,
}: {
  city: string;
  state: string;
  latestRun: RunRow | null;
  flag: FlagRow | null;
  anyRunning: boolean;
  invokingCity: string | null;
  onRun: () => void;
  onFlip: () => void;
  onUnwind: () => void;
  onComposite: (city: string, mvs: number | null) => void;
}) {
  const live = useLiveMvs(city);
  const composite = live.result?.mvs ?? null;

  // Report composite up to parent for calibration ranking.
  useEffect(() => {
    onComposite(city, composite);
  }, [city, composite, onComposite]);

  const status = latestRun?.status ?? null;
  const inFlight = status === "queued" || status === "running";
  const isInvoking = invokingCity === city;
  const canRun = !anyRunning && !invokingCity;
  const canFlip = status === "done" && flag?.mvs_data_source !== "live";
  const canUnwind = flag?.mvs_data_source === "live";

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
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.cls}`}>
        {Icon && <Icon className={`h-3 w-3 ${status === "running" || status === "queued" ? "animate-spin" : ""}`} />}
        {s.text}
      </span>
    );
  })();

  const sourcePill = (() => {
    const isLive = flag?.mvs_data_source === "live";
    return (
      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
        isLive
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-[#cfd8e6] bg-[#f7faff] text-[#526078]"
      }`}>
        {isLive ? "live" : "sample"}
      </span>
    );
  })();

  return (
    <tr className="border-b border-[#e5eaf2] last:border-b-0">
      <td className="px-3 py-2.5 text-[13px] font-semibold text-[#07142f]">{city}</td>
      <td className="px-3 py-2.5">{sourcePill}</td>
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
          <button
            type="button"
            onClick={onFlip}
            disabled={!canFlip}
            title={!canFlip ? (status === "done" ? "Already live" : "Run pipeline to 'done' first") : "Flip data source to live"}
            className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ShieldCheck className="h-3 w-3" />
            Flip to live
          </button>
          <button
            type="button"
            onClick={onUnwind}
            disabled={!canUnwind}
            title={canUnwind ? "Revert to sample badge" : "Already on sample"}
            className="inline-flex items-center gap-1 rounded-md border border-[#cfd8e6] bg-white px-2 py-1 text-[11px] font-semibold text-[#526078] transition hover:bg-[#f7faff] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Undo2 className="h-3 w-3" />
            Unwind
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
  const [signoff, setSignoff] = useState<Record<string, SignoffChecks>>(() => loadSignoff());
  const [invokingCity, setInvokingCity] = useState<string | null>(null);

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
    const cities = TIER_A.map((c) => c.city);

    // Latest run per city: pull last ~50 runs across these cities, then group.
    const { data: runRows } = await supabase
      .from("mvs_pipeline_runs")
      .select("id, city, status, started_at, finished_at, firecrawl_calls, error, created_at")
      .in("city", cities)
      .order("created_at", { ascending: false })
      .limit(200);
    const latest: Record<string, RunRow | null> = {};
    for (const c of cities) latest[c] = null;
    for (const r of runRows ?? []) {
      if (!latest[(r as any).city]) {
        latest[(r as any).city] = {
          id: (r as any).id,
          status: (r as any).status as RunStatus,
          started_at: (r as any).started_at,
          finished_at: (r as any).finished_at,
          firecrawl_calls: (r as any).firecrawl_calls ?? 0,
          error: (r as any).error,
          created_at: (r as any).created_at,
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
  }, []);

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

  const handleRun = useCallback(async (city: string) => {
    if (anyRunning || invokingCity) {
      toast.error("Wait for the in-flight run to finish — runs are sequential by design.");
      return;
    }
    setInvokingCity(city);
    try {
      const { data, error } = await supabase.functions.invoke("mvs-run-pipeline", { body: { city } });
      const errMsg = error?.message ?? "";
      const is409 = /409/.test(errMsg) || data?.error === "a run is already in flight";
      if (is409) {
        toast.info(`${city} is already running — refreshing status.`);
      } else if (data?.already_running) {
        toast.info(`${city} is already running — refreshing status.`);
      } else if (error) {
        toast.error(`Failed to start pipeline for ${city}: ${errMsg}`);
      } else if (data?.ok === false || data?.error) {
        toast.error(`Pipeline error: ${data.error ?? "unknown"}`);
      } else if (data?.ok && data.summary) {
        const s = data.summary;
        toast.success(
          `${city} · ${s.providers_processed} providers · ${s.weeks_upserted} weeks · ${s.firecrawl_calls} Firecrawl calls`,
          { duration: 8000 },
        );
      }
      await fetchAll();

    } catch (e) {
      toast.error(`Failed to start pipeline: ${(e as Error).message}`);
    } finally {
      setInvokingCity(null);
    }
  }, [anyRunning, invokingCity, fetchAll]);

  const handleFlip = useCallback(async (city: string, state: string, source: "live" | "sample") => {
    const { error } = await supabase
      .from("mvs_city_flags")
      .upsert({ city, state, mvs_data_source: source }, { onConflict: "city,state" });
    if (error) {
      toast.error(`Flag update failed: ${error.message}`);
      return;
    }
    toast.success(`${city} → ${source}`);
    await fetchAll();
  }, [fetchAll]);

  const reportComposite = useCallback((city: string, mvs: number | null) => {
    setComposites((prev) => (prev[city] === mvs ? prev : { ...prev, [city]: mvs }));
  }, []);

  // Calibration gate — only meaningful once every city has a done run + composite.
  const calibration = useMemo(() => {
    const allDone = TIER_A.every((c) => latestRuns[c.city]?.status === "done");
    const allHaveComposite = TIER_A.every((c) => composites[c.city] != null);
    if (!allDone || !allHaveComposite) {
      return { ready: false as const };
    }
    const ranked = TIER_A
      .map((c) => ({ city: c.city, score: composites[c.city] as number }))
      .sort((a, b) => b.score - a.score);
    const bostonRank = ranked.findIndex((r) => r.city === "Boston, MA") + 1;
    const topQuartile = bostonRank > 0 && bostonRank <= 2; // top 2 of 8
    return { ready: true as const, ranked, bostonRank, topQuartile };
  }, [latestRuns, composites]);

  // Signoff helpers.
  const updateSignoff = useCallback((city: string, patch: Partial<SignoffChecks>) => {
    setSignoff((prev) => {
      const next = { ...prev, [city]: { ...(prev[city] ?? EMPTY_CHECKS), ...patch } };
      saveSignoff(next);
      return next;
    });
  }, []);

  const signedCities = useMemo(
    () => TIER_A.filter((c) => c.city !== "Austin, TX" && isFullySignedOff(signoff[c.city])).map((c) => c.city),
    [signoff],
  );
  const readyForClientMeeting = signedCities.length >= 2;

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
          The Tier A rollout console is restricted to manager/admin users.
        </p>
      </div>
    );
  }

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
            Tier A Rollout Console
          </h1>
          <p className="mt-0.5 text-[12px] text-[#526078]">
            Run pipeline → verify → flip to live, one city at a time. Brett's rule: every composite below is recomputed live.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchAll}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#cfd8e6] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[#526078] hover:bg-[#f7faff]"
        >
          <RotateCcw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {/* Calibration banner */}
      {calibration.ready ? (
        <div
          className={`mb-5 rounded-lg border p-3 text-[12px] ${
            calibration.topQuartile
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          <div className="flex items-start gap-2">
            {calibration.topQuartile ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div>
              <div className="font-semibold">
                {calibration.topQuartile
                  ? "Calibration OK — Boston in top quartile. Safe to demo."
                  : `Calibration FAILED — Boston ranked ${calibration.bostonRank}/8. Halt Tier A flip; review weights before the client meeting.`}
              </div>
              <div className="mt-1 text-[11px] opacity-80">
                Ranked composites:{" "}
                {calibration.ranked.map((r, i) => (
                  <span key={r.city} className="mr-2">
                    {i + 1}. {r.city.split(",")[0]} {r.score.toFixed(1)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-5 rounded-lg border border-dashed border-[#cfd8e6] bg-white p-3 text-[11px] text-[#526078]">
          Calibration gate inactive — every Tier A city needs a <span className="font-mono">done</span> run + non-null composite to evaluate Boston's rank.
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-[#e5eaf2] bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-[#f7faff] text-left text-[11px] uppercase tracking-wide text-[#526078]">
            <tr>
              <th className="px-3 py-2 font-semibold">City</th>
              <th className="px-3 py-2 font-semibold">Data source</th>
              <th className="px-3 py-2 font-semibold">Last run</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 text-right font-semibold">Composite</th>
              <th className="px-3 py-2 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {TIER_A.map((c) => (
              <CityRow
                key={c.city}
                city={c.city}
                state={c.state}
                latestRun={latestRuns[c.city] ?? null}
                flag={flags[c.city] ?? null}
                anyRunning={anyRunning}
                invokingCity={invokingCity}
                onRun={() => handleRun(c.city)}
                onFlip={() => handleFlip(c.city, c.state, "live")}
                onUnwind={() => handleFlip(c.city, c.state, "sample")}
                onComposite={reportComposite}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-[11px] text-[#8a96aa]">
        Runs are sequential — one city at a time keeps Firecrawl cost predictable and isolates failures. Tier B (14 cities) stays on Sample Data until v1.1.
      </div>

      {/* Human-test signoff */}
      <div className="mt-8">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[15px] font-bold text-[#07142f]">Human-test gate signoff</h2>
          {readyForClientMeeting ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="h-3 w-3" /> Ready for client meeting ({signedCities.length} Tier A signed off)
            </span>
          ) : (
            <span className="text-[11px] text-[#526078]">
              Sign off ≥ 2 non-Austin Tier A cities to unlock the client-meeting pill.
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {TIER_A.map((c) => {
            const checks = signoff[c.city] ?? EMPTY_CHECKS;
            const fully = isFullySignedOff(checks);
            return (
              <div
                key={c.city}
                className={`rounded-lg border bg-white p-3 ${
                  fully ? "border-emerald-300" : "border-[#e5eaf2]"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[13px] font-semibold text-[#07142f]">{c.city}</div>
                  {fully && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                </div>
                {[
                  { key: "rowMatchesPanel", label: "Table row composite matches detail panel" },
                  { key: "formulaDrawer", label: "Show Formula drawer opens, numbers match" },
                  { key: "sliderUpdates", label: "Composite updates when weight slider moves" },
                  { key: "pdfExport", label: "PDF exports cleanly, numbers match on-screen" },
                ].map((row) => (
                  <label key={row.key} className="flex items-start gap-2 py-0.5 text-[11.5px] text-[#07142f]">
                    <input
                      type="checkbox"
                      checked={!!checks[row.key as keyof SignoffChecks]}
                      onChange={(e) =>
                        updateSignoff(c.city, { [row.key]: e.target.checked } as Partial<SignoffChecks>)
                      }
                      className="mt-0.5 h-3.5 w-3.5"
                    />
                    <span>{row.label}</span>
                  </label>
                ))}
                <input
                  type="text"
                  value={checks.signedBy}
                  onChange={(e) => updateSignoff(c.city, { signedBy: e.target.value })}
                  placeholder="Signed by (Brett / Haseeb)"
                  className="mt-2 w-full rounded border border-[#cfd8e6] px-2 py-1 text-[11.5px] focus:border-[#174be8] focus:outline-none"
                />
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-[11px] text-[#8a96aa]">
          Signoff persists in your browser only (operator workflow, not shared state).
        </div>
      </div>
    </div>
  );
}
