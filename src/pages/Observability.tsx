import { useCallback, useMemo, useState } from "react";
import { RotateCw, ShieldCheck, Info } from "lucide-react";
import { DOMAINS } from "@/lib/dbHealth/queries";
import { HealthStatus, rollup, statusColor } from "@/lib/dbHealth/thresholds";
import { DomainCard } from "@/components/dbHealth/DomainCard";
import { useIsManager } from "@/hooks/dbHealth/useIsManager";
import { AccuracySection } from "@/components/observability/AccuracySection";

/**
 * /observability — Data Observability Dashboard (Tier 1: Status & Structure).
 *
 * Designed to answer one question at a glance: "Is our data trustworthy
 * right now?". Calm typography, generous whitespace, plain-English labels,
 * and every number is backed by a visible SQL query.
 */

// Friendly status vocabulary used across this page (overrides the
// engineer-ish "Failing/Degraded" labels from thresholds.ts).
const FRIENDLY: Record<HealthStatus, { label: string; tone: string }> = {
  green: { label: "Healthy", tone: "All checks passing" },
  yellow: { label: "Watch", tone: "Some checks below target" },
  red: { label: "Needs attention", tone: "One or more checks failing" },
  unknown: { label: "Checking…", tone: "Running checks" },
};

// One-line plain-English description per domain key. Falls back to
// the domain's built-in description when missing.
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

  const overall = useMemo(() => rollup(Object.values(perDomain)), [perDomain]);

  // Trust Score: % of domains currently green. Calm, single number.
  const trust = useMemo(() => {
    const vals = Object.values(perDomain);
    if (vals.length === 0) return null;
    const greens = vals.filter((v) => v === "green").length;
    return Math.round((greens / vals.length) * 100);
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
    <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
      {/* ────────────────────────────────────────────────────────────────
          Hero — single focal point: the Trust Score.
          ──────────────────────────────────────────────────────────────── */}
      <header className="mb-10 flex flex-col items-center text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#94a3b8]">
          Data Observability
        </p>
        <h1 className="mt-3 text-[28px] font-black tracking-tight text-[#0b1a36] md:text-[34px]">
          Is our data trustworthy right now?
        </h1>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[#526078]">
          A single, honest answer about every table that powers Neuron Garage.
          Each number below is live, and every check shows its exact SQL.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
          <div
            className="flex h-32 w-32 items-center justify-center rounded-full border-[6px] bg-white"
            style={{ borderColor: overallColor }}
            aria-label={`Trust score ${trust ?? "calculating"}`}
          >
            <span className="text-[36px] font-black tabular-nums text-[#0b1a36]">
              {trust == null ? "—" : `${trust}`}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[13px]">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: overallColor, boxShadow: `0 0 0 4px ${overallColor}22` }}
            />
            <span className="font-bold text-[#0b1a36]">{friendly.label}</span>
            <span className="text-[#526078]">· {friendly.tone}</span>
          </div>
          <button
            onClick={() => setRefreshTick((t) => t + 1)}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#eef2f7] bg-white px-4 py-1.5 text-[12px] font-bold text-[#0b1a36] transition-colors hover:bg-[#f7faff]"
          >
            <RotateCw size={12} />
            Run all checks now
          </button>
        </div>
      </header>

      {/* ────────────────────────────────────────────────────────────────
          What this page tells you — explicit, friendly explainer.
          ──────────────────────────────────────────────────────────────── */}
      <section className="mb-8 rounded-2xl border border-[#eef2f7] bg-[#f7faff] p-5">
        <div className="flex items-start gap-3">
          <Info size={18} className="mt-0.5 shrink-0 text-[#0757ff]" strokeWidth={1.75} />
          <div className="text-[13px] leading-relaxed text-[#0b1a36]">
            <p className="font-bold">How to read this page</p>
            <p className="mt-1 text-[#526078]">
              The <strong>Trust Score</strong> above is the percentage of data
              domains currently passing every health check. Each card below is one
              domain (one part of the database). A green dot means everything is
              within expected ranges. A yellow dot is a soft warning. A red dot
              means at least one check failed — open the card to see exactly which.
            </p>
            <p className="mt-2 text-[#526078]">
              Press <strong>Show query</strong> on any metric to see the SQL we
              ran. Press <strong>Run now</strong> to re-check a single number
              without refreshing the whole page.
            </p>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────
          Domain grid — calm, one card per domain.
          ──────────────────────────────────────────────────────────────── */}
      <section aria-label="Data domains" className="grid gap-4">
        {DOMAINS.map((d) => {
          const description = PLAIN_ENGLISH[d.key] ?? d.description;
          // We pass a shallow-cloned domain with the friendlier description
          // so DomainCard's existing layout picks it up.
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
      </section>

      {/* ────────────────────────────────────────────────────────────────
          Divider between Tier 1 and Tier 2.
          ──────────────────────────────────────────────────────────────── */}
      <div className="my-16 h-px bg-[#eef2f7]" />

      {/* Tier 2 — Accuracy & Rules */}
      <AccuracySection />

      {/* ────────────────────────────────────────────────────────────────
          Footer — quietly sets expectations for what's coming next.
          ──────────────────────────────────────────────────────────────── */}
      <footer className="mt-16 text-center">
        <p className="text-[12px] text-[#94a3b8]">
          Tier 1 (Status &amp; Structure) and Tier 2 (Accuracy &amp; Rules) are live.
          Tier 3 (Alerts &amp; History) ships next.
        </p>
      </footer>
    </div>
  );
}
