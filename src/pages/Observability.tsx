import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCw, ShieldCheck, Info, CheckCircle2, AlertTriangle, Sparkles, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { DOMAINS } from "@/lib/dbHealth/queries";
import { HealthStatus, rollup, statusColor } from "@/lib/dbHealth/thresholds";
import { DomainCard, type DomainIssue } from "@/components/dbHealth/DomainCard";
import { useIsManager } from "@/hooks/dbHealth/useIsManager";
import { AccuracySection } from "@/components/observability/AccuracySection";
import { AlertsSection } from "@/components/observability/AlertsSection";
import { PageHeader } from "@/components/PageHeader";
import { InfoHint } from "@/components/observability/InfoHint";
import { SimpleMode } from "@/components/observability/SimpleMode";

import {
  ObservabilityAiProvider,
  AskAiButton,
} from "@/components/observability/ObservabilityAi";

type ViewMode = "simple" | "advanced";
const MODE_KEY = "observability:viewMode";


/**
 * /observability — Data Observability Dashboard.
 *
 * Visual style matches the rest of Neuron Garage (City Search, Teacher
 * Search, Email Outreach, Candidate Pipeline): top PageHeader with global
 * search + account, left-aligned title, stat-strip cards, then section
 * cards with subtle borders. No centered hero.
 */

const FRIENDLY: Record<HealthStatus, { label: string; tone: string }> = {
  green: { label: "All systems healthy", tone: "Every data source is fresh, full, and within expected ranges." },
  yellow: { label: "Minor issues — review when you can", tone: "A soft target was missed. Nothing is broken." },
  red: { label: "Something needs a human", tone: "At least one data source is empty, stale, or unreachable." },
  unknown: { label: "Running checks…", tone: "Live values are still loading." },
};

const PLAIN_ENGLISH: Record<string, string> = {
  us_cities_scored:
    "The U.S. cities we score for franchise fit. Healthy means the table is full, fresh, and the key columns are populated.",
  us_cities_geo:
    "Geographic reference data for every U.S. city (coordinates, population, county). Used to enrich search.",
  teacher_prospects:
    "Teacher contacts we've sourced, enriched, and queued for outreach. Healthy means new prospects are flowing in.",
  public_schools:
    "Public schools from NCES. Healthy means the directory is loaded and we can attach teachers to schools.",
  candidates:
    "People moving through the candidate pipeline. Healthy means the table is alive and being updated.",
  city_seed_runs:
    "Background jobs that seed and refresh city data. Healthy means jobs have run recently without errors.",
};

export default function Observability() {
  const { loading: roleLoading, isManager } = useIsManager();
  const [perDomain, setPerDomain] = useState<Record<string, HealthStatus>>({});
  const [perDomainIssues, setPerDomainIssues] = useState<Record<string, DomainIssue[]>>({});
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [tab, setTab] = useState<"status" | "accuracy" | "alerts">("status");
  const [mode, setMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "simple";
    return (localStorage.getItem(MODE_KEY) as ViewMode) || "simple";
  });
  useEffect(() => {
    try { localStorage.setItem(MODE_KEY, mode); } catch {}
  }, [mode]);
  const refreshersRef = useRef<Record<string, () => Promise<void>>>({});

  const overall = useMemo(() => rollup(Object.values(perDomain)), [perDomain]);

  const trust = useMemo(() => {
    const vals = Object.values(perDomain);
    if (vals.length === 0) return null;
    const greens = vals.filter((v) => v === "green").length;
    return Math.round((greens / vals.length) * 100);
  }, [perDomain]);

  const counts = useMemo(() => {
    const vals = Object.values(perDomain);
    return {
      total: DOMAINS.length,
      green: vals.filter((v) => v === "green").length,
      yellow: vals.filter((v) => v === "yellow").length,
      red: vals.filter((v) => v === "red").length,
    };
  }, [perDomain]);

  // Suppress public_schools issues from the top banner. Column-level gaps
  // (e.g. city_name blank on most rows) aren't actionable for our workflow —
  // we only care about school coverage for cities we're actively enriching,
  // which the per-city panel below already shows. The domain card itself
  // still surfaces details for anyone who wants them.
  const allIssues = useMemo(
    () =>
      Object.entries(perDomainIssues)
        .filter(([key]) => key !== "public_schools")
        .flatMap(([, v]) => v),
    [perDomainIssues],
  );


  const handleDomainStatus = useCallback((key: string, s: HealthStatus) => {
    setPerDomain((prev) => (prev[key] === s ? prev : { ...prev, [key]: s }));
  }, []);

  const handleDomainIssues = useCallback((key: string, issues: DomainIssue[]) => {
    setPerDomainIssues((prev) => ({ ...prev, [key]: issues }));
  }, []);

  const registerRefresh = useCallback((key: string, fn: () => Promise<void>) => {
    refreshersRef.current[key] = fn;
  }, []);

  const runAllChecks = useCallback(async () => {
    const fns = Object.values(refreshersRef.current);
    if (fns.length === 0) {
      toast.info("Checks are still warming up — try again in a second.");
      return;
    }
    setIsRunningAll(true);
    const toastId = toast.loading(`Re-running ${fns.length} health checks…`);
    try {
      await Promise.all(fns.map((fn) => fn()));
      toast.success("All checks complete", {
        id: toastId,
        description: "Every domain on the page has been refreshed.",
      });
    } catch (e: any) {
      toast.error("Some checks failed to refresh", {
        id: toastId,
        description: e?.message ?? "See individual cards for details.",
      });
    } finally {
      setIsRunningAll(false);
    }
  }, []);

  if (roleLoading) {
    return <div className="p-8 text-[13px] text-[#526078]">Loading…</div>;
  }
  if (!isManager) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-3xl border border-[#eef2f7] bg-white p-8 text-center">
        <ShieldCheck className="mx-auto mb-3 text-[#94a3b8]" size={28} strokeWidth={1.5} />
        <h1 className="text-[16px] font-black text-[#0b1a36]">Manager access only</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[#526078]">
          The Data Observability Dashboard is restricted to managers. If you need
          access, ask Brett or Haseeb to grant you the manager role.
        </p>
      </div>
    );
  }

  const overallColor = statusColor(overall);
  const friendly = FRIENDLY[overall];

  return (
    <ObservabilityAiProvider>
      <PageHeader
        title="Data Observability"
        subtitle="Live view of every table that powers Neuron Garage. Each number is backed by a visible SQL query."
        searchPlaceholder="Search domains, rules, incidents…"
        action={
          <div className="flex items-center gap-2">
            <ModeToggle mode={mode} setMode={setMode} />
            <AskAiButton
              section="global"
              sectionLabel="Overall data trustworthiness"
              variant="primary"
              suggestions={[
                "Is our data healthy right now?",
                "What's the single biggest data risk this week?",
                "Summarize any open incidents",
                "What changed in the last 7 days?",
              ]}
            />
            {mode === "advanced" && (
              <button
                onClick={runAllChecks}
                disabled={isRunningAll}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#eef2f7] bg-white px-3.5 py-2 text-[13px] font-bold text-[#07142f] transition-colors hover:bg-[#f7faff] disabled:opacity-60"
              >
                <RotateCw size={13} className={isRunningAll ? "animate-spin" : ""} />
                {isRunningAll ? "Running…" : "Run all checks"}
              </button>
            )}
          </div>
        }
      />

      {mode === "simple" && (
        <SimpleMode onSwitchToAdvanced={() => setMode("advanced")} />
      )}
      {mode === "advanced" && (
      <>



      {/* Stat strip — same pattern as Email Outreach / Candidate Pipeline */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatCard
          label="Trust Score"
          value={trust == null ? "—" : `${trust}`}
          suffix={trust == null ? "" : "/ 100"}
          accent={overallColor}
          footnote={`${friendly.label} · ${friendly.tone}`}
          help={{
            title: "Trust Score",
            body: "The % of data domains that are fully healthy right now. 100 means every table on the page passed every check. Below 100 means at least one warning or failure — see the cards below for what.",
          }}
        />
        <StatCard
          label="Healthy Domains"
          value={`${counts.green}`}
          suffix={`/ ${counts.total}`}
          accent="#16a34a"
          footnote="All checks passing"
          help={{
            title: "Healthy domains",
            body: "Tables where every check (row count, freshness, ranges) passed. Safe to rely on for City Search, Teacher Outreach, etc.",
          }}
        />
        <StatCard
          label="Warnings"
          value={`${counts.yellow}`}
          suffix={`/ ${counts.total}`}
          accent="#f59e0b"
          footnote="Below soft target"
          help={{
            title: "Warnings",
            body: "A soft target was missed — for example a table has fewer rows than we'd ideally like, or an update is slightly older than expected. Nothing is broken, but it's worth a glance when you have time.",
          }}
        />
        <StatCard
          label="Failing"
          value={`${counts.red}`}
          suffix={`/ ${counts.total}`}
          accent="#dc2626"
          footnote="Needs attention"
          help={{
            title: "Failing",
            body: "A check tripped a hard threshold — empty table, very stale data, or a value out of bounds. Click the matching domain card to see exactly which check failed and the SQL behind it.",
          }}
        />
      </div>

      {/* Per-tab plain-English intro */}
      <TabIntro tab={tab} />

      {/* Tabs — same pattern as DbHealth / Email Outreach */}
      <div className="mt-6 border-b border-[#eef2f7] flex gap-6">
        {([
          ["status", "Status & Structure"],
          ["accuracy", "Accuracy & Rules"],
          ["alerts", "Alerts & History"],
        ] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-1 py-2.5 text-[13px] font-bold border-b-2 -mb-px transition-colors ${
              tab === t
                ? "border-[#174be8] text-[#07142f]"
                : "border-transparent text-[#526078] hover:text-[#07142f]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "status" && (
        <div className="mt-5 space-y-4">
          <IssuesPanel issues={allIssues} overall={overall} />



          <div className="grid gap-3">
            {DOMAINS.map((d) => {
              const description = PLAIN_ENGLISH[d.key] ?? d.description;
              const friendlyDomain = { ...d, description };
              return (
                <DomainCard
                  key={d.key}
                  domain={friendlyDomain}
                  anchorId={`domain-${d.key}`}
                  onStatusChange={(s) => handleDomainStatus(d.key, s)}
                  onIssuesChange={(issues) => handleDomainIssues(d.key, issues)}
                  onRegisterRefresh={registerRefresh}
                />
              );
            })}
          </div>
        </div>
      )}

      {tab === "accuracy" && (
        <div className="mt-5">
          <AccuracySection />
        </div>
      )}

      {tab === "alerts" && (
        <div className="mt-5">
          <AlertsSection />
        </div>
      )}
      </>
      )}
    </ObservabilityAiProvider>
  );
}

function ModeToggle({ mode, setMode }: { mode: ViewMode; setMode: (m: ViewMode) => void }) {
  return (
    <div className="inline-flex rounded-md border border-[#eef2f7] bg-white p-0.5">
      <button
        onClick={() => setMode("simple")}
        className={`inline-flex items-center gap-1 rounded-[5px] px-2.5 py-1.5 text-[12px] font-bold transition-colors ${
          mode === "simple" ? "bg-[#0b1a36] text-white" : "text-[#526078] hover:text-[#07142f]"
        }`}
        aria-pressed={mode === "simple"}
      >
        <Sparkles size={12} />
        Simple
      </button>
      <button
        onClick={() => setMode("advanced")}
        className={`inline-flex items-center gap-1 rounded-[5px] px-2.5 py-1.5 text-[12px] font-bold transition-colors ${
          mode === "advanced" ? "bg-[#0b1a36] text-white" : "text-[#526078] hover:text-[#07142f]"
        }`}
        aria-pressed={mode === "advanced"}
      >
        <SlidersHorizontal size={12} />
        Advanced
      </button>
    </div>
  );
}



// ----------------------------------------------------------------------------
// Stat card — matches the simple bordered card pattern used elsewhere in app.
// ----------------------------------------------------------------------------
function StatCard({
  label,
  value,
  suffix,
  accent,
  footnote,
  help,
}: {
  label: string;
  value: string;
  suffix?: string;
  accent: string;
  footnote: string;
  help?: { title: string; body: string };
}) {
  return (
    <div className="rounded-xl border border-[#eef2f7] bg-white p-4">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#526078]">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: accent, boxShadow: `0 0 0 3px ${accent}22` }}
          aria-hidden
        />
        <span>{label}</span>
        {help && (
          <InfoHint title={help.title} size={12}>
            {help.body}
          </InfoHint>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-[28px] font-black tabular-nums leading-none text-[#07142f]">{value}</span>
        {suffix && <span className="text-[12px] text-[#526078]">{suffix}</span>}
      </div>
      <div className="mt-1 text-[11px] text-[#526078]">{footnote}</div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// TabIntro — plain-English description of what each tab is for. Shown above
// the tab content so a non-technical user knows what they're looking at.
// ----------------------------------------------------------------------------
function TabIntro({ tab }: { tab: "status" | "accuracy" | "alerts" }) {
  const copy: Record<
    typeof tab,
    { title: string; purpose: string; measures: string; means: string; care: string }
  > = {
    status: {
      title: "Status & Structure — is the data there, and is it fresh?",
      purpose:
        "Confirms every table the app reads from actually exists, has rows in it, and was updated recently.",
      measures:
        "For each table: row count, time since the last write, and whether the key columns are populated.",
      means:
        "Green = full and fresh. Yellow = a soft target missed (e.g. updated a bit later than expected). Red = empty, stale, or unreachable.",
      care:
        "If anything here is red, features that depend on that table (City Search, Teacher Outreach, Pipeline) will silently show wrong or empty results to users.",
    },
    accuracy: {
      title: "Accuracy & Rules — is the data correct?",
      purpose:
        "Catches data that exists but is wrong — negative populations, duplicate IDs, impossible dates, values out of the range we expect.",
      measures:
        "A set of invariants (statements that should always be true) run as SQL against the live tables, plus on-demand spot-checks (random row, column outlier scan).",
      means:
        "Pass = the rule held for every row. Fail = at least one row violates it; the count and a sample are shown so you can see the actual bad rows.",
      care:
        "Fresh, full tables can still be garbage. A failing rule here usually means an upstream import or an edge function wrote something it shouldn't have.",
    },
    alerts: {
      title: "Alerts & History — what happened, and what should I be told about?",
      purpose:
        "Gives you a history view so you can tell whether today's number is normal, and lets you subscribe to the rules you actually want to hear about.",
      measures:
        "30-day sparklines of row counts and freshness per table, plus an incidents log of anything that stayed red across a snapshot.",
      means:
        "A flat line = stable. A cliff = something broke or got fixed on that date. An open incident = the same check has been failing for more than one snapshot.",
      care:
        "Without this, a slow leak (e.g. enrichment quietly stopping) looks fine in the moment because each individual check still passes the threshold.",
    },
  };
  const c = copy[tab];
  return (
    <div className="mt-5 rounded-xl border border-[#dbeafe] bg-[#f0f7ff] p-4">
      <div className="text-[13px] font-bold text-[#07142f]">{c.title}</div>
      <dl className="mt-2 grid gap-x-6 gap-y-1.5 text-[12px] leading-relaxed sm:grid-cols-[auto_1fr]">
        <dt className="font-bold text-[#07142f]">What it's for</dt>
        <dd className="text-[#526078]">{c.purpose}</dd>
        <dt className="font-bold text-[#07142f]">What it measures</dt>
        <dd className="text-[#526078]">{c.measures}</dd>
        <dt className="font-bold text-[#07142f]">What it means</dt>
        <dd className="text-[#526078]">{c.means}</dd>
        <dt className="font-bold text-[#07142f]">Why you should care</dt>
        <dd className="text-[#526078]">{c.care}</dd>
      </dl>
    </div>
  );
}

// ----------------------------------------------------------------------------
// IssuesPanel — top-of-page plain-English explanation of what's healthy and
// what isn't. Replaces the abstract "needs attention" label.
// ----------------------------------------------------------------------------
function IssuesPanel({ issues, overall }: { issues: DomainIssue[]; overall: HealthStatus }) {
  if (overall === "unknown") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-[#eef2f7] bg-[#f7faff] p-4">
        <Info size={16} className="mt-0.5 shrink-0 text-[#174be8]" strokeWidth={1.75} />
        <div className="text-[13px] leading-relaxed text-[#07142f]">
          <p className="font-bold">Running checks…</p>
          <p className="mt-1 text-[#526078]">
            Live values are loading from the database. This usually takes 1–3 seconds.
          </p>
        </div>
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-xl border border-[#d1fae5] bg-[#ecfdf5] p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#16a34a]" strokeWidth={1.75} />
          <div className="text-[13px] leading-relaxed text-[#07142f]">
            <p className="font-bold">All data sources are healthy right now.</p>
            <p className="mt-1 text-[#526078]">
              Every table that powers Neuron Garage is full, recently updated, and within expected ranges. No action
              needed — you can keep using City Search, Teacher Outreach, and the Candidate Pipeline with confidence.
            </p>
          </div>
        </div>
        <AskAiButton
          section="status"
          sectionLabel="Status & Structure"
          suggestions={[
            "Walk me through what 'healthy' means here.",
            "What would cause this page to turn yellow or red?",
            "How often do these checks run?",
          ]}
        />
      </div>
    );
  }

  const reds = issues.filter((i) => i.status === "red");
  const yellows = issues.filter((i) => i.status === "yellow");
  const headline =
    reds.length > 0
      ? `${reds.length} item${reds.length === 1 ? "" : "s"} need a human, ${yellows.length} soft warning${yellows.length === 1 ? "" : "s"}`
      : `${yellows.length} soft warning${yellows.length === 1 ? "" : "s"} — nothing is broken`;
  const bg = reds.length > 0 ? "bg-[#fef2f2] border-[#fecaca]" : "bg-[#fffbeb] border-[#fde68a]";
  const iconColor = reds.length > 0 ? "text-[#dc2626]" : "text-[#d97706]";

  return (
    <div className={`flex items-start justify-between gap-3 rounded-xl border p-4 ${bg}`}>
      <div className="flex items-start gap-3 min-w-0">
        <AlertTriangle size={16} className={`mt-0.5 shrink-0 ${iconColor}`} strokeWidth={1.75} />
        <div className="text-[13px] leading-relaxed text-[#07142f] min-w-0">
          <p className="font-bold">{headline}</p>
          <ul className="mt-2 space-y-1.5">
            {[...reds, ...yellows].slice(0, 6).map((issue, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span
                  className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: statusColor(issue.status) }}
                  aria-hidden
                />
                <span className="text-[#07142f]">
                  <a
                    href={`#domain-${issue.domainKey}`}
                    className="font-bold underline-offset-2 hover:underline"
                  >
                    {issue.domainLabel}
                  </a>{" "}
                  <span className="text-[#526078]">— {issue.plainEnglish}</span>
                </span>
              </li>
            ))}
          </ul>
          {issues.length > 6 && (
            <p className="mt-2 text-[11px] text-[#526078]">+ {issues.length - 6} more — scroll down to see every domain.</p>
          )}
        </div>
      </div>
      <AskAiButton
        section="status"
        sectionLabel="Status & Structure"
        suggestions={[
          "Explain each of these issues in plain English.",
          "Which of these actually affect the product right now?",
          "What should we do about each issue, in priority order?",
          "Are any of these expected (e.g. a feature not yet launched)?",
        ]}
      />
    </div>
  );
}
