import { useCallback, useMemo, useState } from "react";
import { RotateCw, ShieldCheck, Info } from "lucide-react";
import { DOMAINS } from "@/lib/dbHealth/queries";
import { HealthStatus, rollup, statusColor } from "@/lib/dbHealth/thresholds";
import { DomainCard } from "@/components/dbHealth/DomainCard";
import { useIsManager } from "@/hooks/dbHealth/useIsManager";
import { AccuracySection } from "@/components/observability/AccuracySection";
import { AlertsSection } from "@/components/observability/AlertsSection";
import { PageHeader } from "@/components/PageHeader";
import {
  ObservabilityAiProvider,
  AskAiButton,
  useObservabilityAi,
} from "@/components/observability/ObservabilityAi";


/**
 * /observability — Data Observability Dashboard.
 *
 * Visual style matches the rest of Neuron Garage (City Search, Teacher
 * Search, Email Outreach, Candidate Pipeline): top PageHeader with global
 * search + account, left-aligned title, stat-strip cards, then section
 * cards with subtle borders. No centered hero.
 */

const FRIENDLY: Record<HealthStatus, { label: string; tone: string }> = {
  green: { label: "Healthy", tone: "All checks passing" },
  yellow: { label: "Watch", tone: "Some checks below target" },
  red: { label: "Needs attention", tone: "One or more checks failing" },
  unknown: { label: "Checking…", tone: "Running checks" },
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
  const [refreshTick, setRefreshTick] = useState(0);
  const [tab, setTab] = useState<"status" | "accuracy" | "alerts">("status");

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

  const handleDomainStatus = useCallback((key: string, s: HealthStatus) => {
    setPerDomain((prev) => (prev[key] === s ? prev : { ...prev, [key]: s }));
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
            <button
              onClick={() => setRefreshTick((t) => t + 1)}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#eef2f7] bg-white px-3.5 py-2 text-[13px] font-bold text-[#07142f] transition-colors hover:bg-[#f7faff]"
            >
              <RotateCw size={13} />
              Run all checks
            </button>
          </div>
        }
      />


      {/* Stat strip — same pattern as Email Outreach / Candidate Pipeline */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatCard
          label="Trust Score"
          value={trust == null ? "—" : `${trust}`}
          suffix={trust == null ? "" : "/ 100"}
          accent={overallColor}
          footnote={`${friendly.label} · ${friendly.tone}`}
        />
        <StatCard
          label="Healthy Domains"
          value={`${counts.green}`}
          suffix={`/ ${counts.total}`}
          accent="#16a34a"
          footnote="All checks passing"
        />
        <StatCard
          label="Warnings"
          value={`${counts.yellow}`}
          suffix={`/ ${counts.total}`}
          accent="#f59e0b"
          footnote="Below soft target"
        />
        <StatCard
          label="Failing"
          value={`${counts.red}`}
          suffix={`/ ${counts.total}`}
          accent="#dc2626"
          footnote="Needs attention"
        />
      </div>

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
          <div className="flex items-start justify-between gap-3 rounded-xl border border-[#eef2f7] bg-[#f7faff] p-4">
            <div className="flex items-start gap-3">
              <Info size={16} className="mt-0.5 shrink-0 text-[#174be8]" strokeWidth={1.75} />
              <div className="text-[13px] leading-relaxed text-[#07142f]">
                <p className="font-bold">How to read this page</p>
                <p className="mt-1 text-[#526078]">
                  The <strong>Trust Score</strong> above is the percentage of domains currently passing every health
                  check. Each card below is one domain. Green = within expected ranges, yellow = soft warning, red = at
                  least one check failing.
                </p>
              </div>
            </div>
            <AskAiButton
              section="status"
              sectionLabel="Status & Structure"
              suggestions={[
                "Which domain has the lowest health right now?",
                "Are any tables stale beyond their SLA?",
                "Which required columns are under-populated?",
                "Give me row counts vs expected floors for every domain",
              ]}
            />
          </div>

          <div className="grid gap-3">
            {DOMAINS.map((d) => {
              const description = PLAIN_ENGLISH[d.key] ?? d.description;
              const friendlyDomain = { ...d, description };
              return (
                <DomainCard
                  key={`${d.key}-${refreshTick}`}
                  domain={friendlyDomain}
                  anchorId={`domain-${d.key}`}
                  onStatusChange={(s) => handleDomainStatus(d.key, s)}
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
    </ObservabilityAiProvider>
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
}: {
  label: string;
  value: string;
  suffix?: string;
  accent: string;
  footnote: string;
}) {
  return (
    <div className="rounded-xl border border-[#eef2f7] bg-white p-4">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#526078]">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: accent, boxShadow: `0 0 0 3px ${accent}22` }}
          aria-hidden
        />
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-[28px] font-black tabular-nums leading-none text-[#07142f]">{value}</span>
        {suffix && <span className="text-[12px] text-[#526078]">{suffix}</span>}
      </div>
      <div className="mt-1 text-[11px] text-[#526078]">{footnote}</div>
    </div>
  );
}
