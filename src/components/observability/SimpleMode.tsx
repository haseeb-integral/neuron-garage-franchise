// ============================================================================
// Simple Mode for /observability.
//
// One-glance view for non-technical users (Brett, Kaylie, Sam). Renders:
//   - One big Trust Score dial with plain-English verdict
//   - A friendly tile per data domain (one traffic light, one sentence)
//   - A nudge to flip to Advanced Mode for the granular per-metric view
//
// We deliberately re-run the same metrics under the hood (useDomainMetrics) so
// Simple and Advanced agree, but we hide row counts / percentages / SQL.
// ============================================================================

import { useMemo } from "react";
import { ArrowRight, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { DOMAINS, DomainDef } from "@/lib/dbHealth/queries";
import { HealthStatus, rollup, statusColor } from "@/lib/dbHealth/thresholds";
import { useDomainMetrics } from "@/hooks/dbHealth/useDomainMetrics";
import { AskAiButton } from "./ObservabilityAi";

const FRIENDLY_NAME: Record<string, string> = {
  us_cities_scored: "City scoring data",
  us_cities_geo: "City geography",
  teacher_prospects: "Teacher prospects",
  public_schools: "Public schools",
  candidates: "Candidate pipeline",
  city_seed_runs: "Background data jobs",
};

const WHAT_IT_POWERS: Record<string, string> = {
  us_cities_scored: "Powers City Search rankings and the franchise fit scores.",
  us_cities_geo: "Powers map views, distance filters, and city detail pages.",
  teacher_prospects: "Powers Teacher Search and the outreach campaigns.",
  public_schools: "Powers school directories and lets us attach teachers to schools.",
  candidates: "Powers the Candidate Pipeline kanban board.",
  city_seed_runs: "Keeps city data refreshed in the background — small lags here don't affect the app.",
};

const STATUS_VERDICT: Record<HealthStatus, string> = {
  green: "Looking good.",
  yellow: "Minor warning — still usable.",
  red: "Needs a human to look.",
  unknown: "Checking…",
};

interface Props {
  onSwitchToAdvanced: () => void;
}

// We need one hook call per domain. DOMAINS is a module-level constant so the
// hook order is stable across renders — safe by the Rules of Hooks.
// We deliberately exclude `public_schools` from Simple Mode. A global "X% of
// teachers are missing a school name" warning isn't actionable for our
// workflow — teachers are only enriched on a per-target-city basis, so a
// system-wide nag adds noise without helping anyone decide anything. The
// per-city school coverage view in Advanced Mode replaces it.
const SIMPLE_MODE_DOMAINS = DOMAINS.filter((d) => d.key !== "public_schools");

export function SimpleMode({ onSwitchToAdvanced }: Props) {
  const perDomain = SIMPLE_MODE_DOMAINS.map((d) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const state = useDomainMetrics(d);
    const vals = Object.values(state.results);
    const status: HealthStatus =
      state.loading && vals.length === 0 ? "unknown" : rollup(vals.map((v) => v.status));
    return { domain: d, status };
  });

  const statuses = perDomain.map((p) => p.status);
  const overall = rollup(statuses);
  const greens = statuses.filter((s) => s === "green").length;
  const yellows = statuses.filter((s) => s === "yellow").length;
  const reds = statuses.filter((s) => s === "red").length;
  const score = statuses.length === 0 ? null : Math.round((greens / statuses.length) * 100);

  return (
    <div className="mt-5 space-y-5">
      <SimpleSummary
        overall={overall}
        score={score}
        greens={greens}
        yellows={yellows}
        reds={reds}
        onSwitchToAdvanced={onSwitchToAdvanced}
      />
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[14px] font-black text-[#07142f]">Your data sources</h2>
          <span className="text-[11px] text-[#526078]">One tile per table that powers the app.</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {perDomain.map(({ domain, status }) => (
            <DomainTile key={domain.key} domain={domain} status={status} />
          ))}
        </div>
      </div>
      <FooterSwitch onSwitchToAdvanced={onSwitchToAdvanced} />
    </div>
  );
}

function SimpleSummary({
  overall,
  score,
  greens,
  yellows,
  reds,
  onSwitchToAdvanced,
}: {
  overall: HealthStatus;
  score: number | null;
  greens: number;
  yellows: number;
  reds: number;
  onSwitchToAdvanced: () => void;
}) {
  const headline =
    overall === "unknown"
      ? "Checking your data now…"
      : overall === "green"
      ? "Everything is healthy."
      : overall === "yellow"
      ? "Small warnings — nothing is broken."
      : "Something needs a human to look at it.";

  const body =
    overall === "unknown"
      ? "This usually takes 1–3 seconds. You can keep using the app while we check."
      : overall === "green"
      ? "Every data source that powers Neuron Garage is full, fresh, and within expected ranges. Keep going."
      : overall === "yellow"
      ? `${yellows} data source${yellows === 1 ? "" : "s"} missed a soft target (e.g. fewer rows than ideal, or a small number of blanks). Safe to keep using.`
      : `${reds} data source${reds === 1 ? "" : "s"} ${reds === 1 ? "is" : "are"} empty, stale, or unreachable. Ping Haseeb or flip to Advanced Mode to see exactly what failed.`;

  return (
    <div className="rounded-2xl border border-[#eef2f7] bg-white p-5">
      <div className="flex flex-col gap-5 md:flex-row md:items-center">
        <Gauge value={score} status={overall} />
        <div className="flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wide text-[#526078]">Overall health</div>
          <h2 className="mt-1 text-[20px] font-black leading-tight text-[#07142f]">{headline}</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#526078]">{body}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Pill color="#16a34a" label={`${greens} healthy`} />
            <Pill color="#f59e0b" label={`${yellows} warning${yellows === 1 ? "" : "s"}`} />
            <Pill color="#dc2626" label={`${reds} failing`} />
            <div className="ml-auto flex items-center gap-2">
              <AskAiButton
                section="global"
                sectionLabel="Overall data trustworthiness"
                suggestions={[
                  "Explain this in plain English.",
                  "What should I do about any warnings?",
                  "Is it safe to send emails today?",
                ]}
              />
              <button
                onClick={onSwitchToAdvanced}
                className="inline-flex items-center gap-1 text-[12px] font-bold text-[#174be8] hover:underline"
              >
                See the details
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Gauge({ value, status }: { value: number | null; status: HealthStatus }) {
  const size = 140;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * c;
  const color = statusColor(status);

  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#eef2f7" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: "stroke-dasharray 600ms ease, stroke 300ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {value == null ? (
          <Loader2 className="animate-spin text-[#94a3b8]" size={22} />
        ) : (
          <>
            <div className="text-[32px] font-black leading-none tabular-nums text-[#07142f]">{value}</div>
            <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-[#526078]">/ 100</div>
          </>
        )}
      </div>
    </div>
  );
}

function Pill({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f7faff] px-2.5 py-1 text-[11px] font-bold text-[#07142f]">
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />
      {label}
    </span>
  );
}

function DomainTile({ domain, status }: { domain: DomainDef; status: HealthStatus }) {
  const label = FRIENDLY_NAME[domain.key] ?? domain.label;
  const powers = WHAT_IT_POWERS[domain.key] ?? domain.description;

  const palette = useMemo(() => {
    switch (status) {
      case "green":
        return { bg: "bg-[#ecfdf5]", border: "border-[#bbf7d0]", icon: <CheckCircle2 size={22} className="text-[#16a34a]" /> };
      case "yellow":
        return { bg: "bg-[#fffbeb]", border: "border-[#fde68a]", icon: <AlertTriangle size={22} className="text-[#d97706]" /> };
      case "red":
        return { bg: "bg-[#fef2f2]", border: "border-[#fecaca]", icon: <XCircle size={22} className="text-[#dc2626]" /> };
      default:
        return { bg: "bg-[#f7faff]", border: "border-[#eef2f7]", icon: <Loader2 size={22} className="animate-spin text-[#94a3b8]" /> };
    }
  }, [status]);

  return (
    <div className={`rounded-xl border ${palette.border} ${palette.bg} p-4`}>
      <div className="flex items-start gap-3">
        <div className="shrink-0">{palette.icon}</div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-black text-[#07142f]">{label}</div>
          <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: statusColor(status) }}>
            {STATUS_VERDICT[status]}
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-[#526078]">{powers}</p>
        </div>
      </div>
    </div>
  );
}

function FooterSwitch({ onSwitchToAdvanced }: { onSwitchToAdvanced: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-[#cbd5e1] bg-[#f7faff] p-4">
      <div className="text-[12px] leading-relaxed text-[#526078]">
        <span className="font-bold text-[#07142f]">Want the granular view?</span> Advanced Mode shows row counts,
        column completeness, freshness, SQL queries, rule definitions, alert history, and the incident log.
      </div>
      <button
        onClick={onSwitchToAdvanced}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[#174be8] bg-white px-3 py-1.5 text-[12px] font-bold text-[#174be8] hover:bg-[#eef4ff]"
      >
        Switch to Advanced Mode
        <ArrowRight size={12} />
      </button>
    </div>
  );
}
