import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  MapPin,
  Plus,
  Star,
  XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { LiveEngineCard, SAS_ENGINE_LIVE } from "@/components/site-analysis/LiveEngineCard";
import { Feature1BStatus } from "@/components/phase2-demo/Feature1BStatus";
import { SiteDecisionControls } from "@/components/phase2-demo/SiteDecisionControls";
import { useSiteDecisions, type SiteVerdict } from "@/hooks/useSiteDecisions";
import { useSiteScore, type SiteScoreResult, type SiteScoreSignals } from "@/hooks/useSiteScore";
import { exportSiteDecisionPack, type ExportCandidate } from "@/lib/decisionsExport";
import { SITE_RECOMMEND_THRESHOLDS } from "@/data/phase2DemoData";
import {
  recomputeSiteScores,
  siteComposite,
  type SchoolType,
  type GradeBand,
} from "@/lib/sasMath";

const NAVY = "#07142f";
const MUTED = "#526078";
const BORDER = "#eef2f7";
const SOFT = "#f7faff";
const BLUE = "#174be8";

const VERDICT_STYLE: Record<SiteVerdict, { bg: string; fg: string; label: string }> = {
  recommend: { bg: "#e3f3e7", fg: "#1d6b32", label: "Recommend" },
  worth_a_look: { bg: "#fff8d9", fg: "#7a5800", label: "Worth a look" },
  dont_recommend: { bg: "#fce7ec", fg: "#a3142b", label: "Don't recommend" },
  undecided: { bg: "#eef2f7", fg: "#526078", label: "Undecided" },
};

function tierBadge(score: number) {
  if (score >= SITE_RECOMMEND_THRESHOLDS.recommend)
    return { bg: "#e3f3e7", fg: "#1d6b32", label: "Recommend" };
  if (score >= SITE_RECOMMEND_THRESHOLDS.worthALook)
    return { bg: "#fff8d9", fg: "#7a5800", label: "Worth a look" };
  return { bg: "#fce7ec", fg: "#a3142b", label: "Don't recommend" };
}

function defaultVerdictFromScore(score: number): SiteVerdict {
  if (score >= SITE_RECOMMEND_THRESHOLDS.recommend) return "recommend";
  if (score >= SITE_RECOMMEND_THRESHOLDS.worthALook) return "worth_a_look";
  return "dont_recommend";
}

// ---------------------------------------------------------------------------
// Candidate model — replaces the old hardcoded demo cards. Each candidate is
// a small form that runs the live `compute-sas` engine and renders the
// returned pillars + composite via the single recompute helper.
// ---------------------------------------------------------------------------

interface Candidate {
  id: string;
  schoolName: string;
  address: string;
  schoolType: SchoolType;
  gradeBand: GradeBand;
  enrollment: string;
  calibrationRole?: "trinity" | "leafspring";
}

const TRINITY_CANDIDATE: Candidate = {
  id: "trinity-christian-academy",
  schoolName: "Trinity Christian Academy",
  address: "4131 Spring Valley Rd, Addison, TX 75001",
  schoolType: "private_elementary",
  gradeBand: "k5_k6",
  enrollment: "",
  calibrationRole: "trinity",
};

const LEAFSPRING_CANDIDATE: Candidate = {
  id: "leafspring-plano",
  schoolName: "LeafSpring School at Plano (closed 2023)",
  address: "7000 Preston Rd, Plano, TX 75024",
  schoolType: "daycare",
  gradeBand: "other",
  enrollment: "",
  calibrationRole: "leafspring",
};

// ---------------------------------------------------------------------------
// CandidateCard
// ---------------------------------------------------------------------------

interface CardProps {
  candidate: Candidate;
  onChange: (c: Candidate) => void;
  onRemove?: () => void;
  onResult: (result: SiteScoreResult | null) => void;
  autoRun: boolean;
}

function CandidateCard({ candidate, onChange, onRemove, onResult, autoRun }: CardProps) {
  const { status, result, error, run } = useSiteScore();
  const { byAddress } = useSiteDecisions();
  const decision = byAddress.get(candidate.address);
  const brettVerdict: SiteVerdict | undefined =
    decision && decision.verdict !== "undecided" ? decision.verdict : undefined;
  const isWinner = decision?.is_winner ?? false;
  const [showFormulas, setShowFormulas] = useState(false);

  // Auto-run for pre-seeded calibration candidates on first mount.
  useEffect(() => {
    if (!autoRun) return;
    if (status !== "idle") return;
    if (!candidate.address.trim() || !candidate.schoolName.trim()) return;
    run({
      schoolName: candidate.schoolName,
      address: candidate.address,
      schoolType: candidate.schoolType,
      gradeBand: candidate.gradeBand,
      enrollment: candidate.enrollment ? Number(candidate.enrollment) : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun]);

  // Bubble result up so parent (calibration banner, summary, export) sees it.
  useEffect(() => {
    onResult(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const recomputed = result ? recomputeSiteScores(result.pillars) : null;
  const composite = recomputed?.composite ?? null;
  const scoreTier = composite != null ? tierBadge(composite) : null;
  const pill = brettVerdict ? VERDICT_STYLE[brettVerdict] : scoreTier;
  const pillSource = brettVerdict ? "Brett/Sam's call" : "auto from score";

  const submit = () => {
    run({
      schoolName: candidate.schoolName,
      address: candidate.address,
      schoolType: candidate.schoolType,
      gradeBand: candidate.gradeBand,
      enrollment: candidate.enrollment ? Number(candidate.enrollment) : null,
    });
  };

  return (
    <div
      className="flex flex-col rounded-lg border bg-white p-4"
      style={{
        borderColor: isWinner ? "#1d6b32" : BORDER,
        borderWidth: isWinner ? 2 : 1,
        minHeight: 540,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <MapPin size={14} style={{ color: BLUE }} className="shrink-0" />
            <h3
              className="truncate text-[13px] font-bold"
              style={{ color: NAVY }}
              title={candidate.schoolName || "Unnamed candidate"}
            >
              {candidate.schoolName || "New candidate"}
            </h3>
            {isWinner && (
              <span
                className="inline-flex items-center whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                style={{ backgroundColor: "#1d6b32", color: "#fff" }}
              >
                <Star size={9} className="mr-0.5" fill="#fff" /> Winner
              </span>
            )}
            {candidate.calibrationRole && (
              <span
                className="inline-flex items-center whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: "#dde7ff", color: BLUE }}
                title="Pre-seeded calibration anchor"
              >
                {candidate.calibrationRole === "trinity" ? "Positive anchor" : "Negative anchor"}
              </span>
            )}
          </div>
          {candidate.address && (
            <p
              className="mt-0.5 line-clamp-1 text-[11px]"
              style={{ color: MUTED }}
              title={candidate.address}
            >
              {candidate.address}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {composite != null ? (
            <>
              <div
                className="text-[28px] font-black leading-none tabular-nums"
                style={{ color: NAVY }}
              >
                {composite}
              </div>
              {pill && (
                <span
                  className="inline-flex items-center whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                  style={{ backgroundColor: pill.bg, color: pill.fg }}
                  title={`${pill.label} — ${pillSource}`}
                >
                  {pill.label}
                </span>
              )}
              <span
                className="text-[9px] uppercase tracking-wide"
                style={{ color: MUTED }}
              >
                {pillSource}
              </span>
            </>
          ) : (
            <span
              className="text-[10px] uppercase tracking-wide"
              style={{ color: MUTED }}
            >
              {status === "loading" ? "Computing…" : "No score yet"}
            </span>
          )}
        </div>
      </div>

      {/* Input form */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label
          className="col-span-2 flex flex-col gap-1 text-[10px]"
          style={{ color: MUTED }}
        >
          School name
          <input
            type="text"
            value={candidate.schoolName}
            onChange={(e) => onChange({ ...candidate, schoolName: e.target.value })}
            className="rounded border px-2 py-1 text-[12px]"
            style={{ borderColor: BORDER, color: NAVY }}
            placeholder="e.g. Trinity Episcopal School"
          />
        </label>
        <label
          className="col-span-2 flex flex-col gap-1 text-[10px]"
          style={{ color: MUTED }}
        >
          Address
          <input
            type="text"
            value={candidate.address}
            onChange={(e) => onChange({ ...candidate, address: e.target.value })}
            className="rounded border px-2 py-1 text-[12px]"
            style={{ borderColor: BORDER, color: NAVY }}
            placeholder="3901 Bee Caves Rd, Austin, TX 78746"
          />
        </label>
        <label className="flex flex-col gap-1 text-[10px]" style={{ color: MUTED }}>
          School type
          <select
            value={candidate.schoolType}
            onChange={(e) =>
              onChange({ ...candidate, schoolType: e.target.value as SchoolType })
            }
            className="rounded border px-2 py-1 text-[12px]"
            style={{ borderColor: BORDER, color: NAVY }}
          >
            <option value="private_elementary">Private elementary</option>
            <option value="public_elementary">Public elementary</option>
            <option value="charter_elementary">Charter elementary</option>
            <option value="montessori">Montessori</option>
            <option value="daycare">Daycare</option>
            <option value="other_k8">Other K-8</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px]" style={{ color: MUTED }}>
          Grade band
          <select
            value={candidate.gradeBand}
            onChange={(e) =>
              onChange({ ...candidate, gradeBand: e.target.value as GradeBand })
            }
            className="rounded border px-2 py-1 text-[12px]"
            style={{ borderColor: BORDER, color: NAVY }}
          >
            <option value="k5_k6">K-5 / K-6</option>
            <option value="prek_5">Pre-K through 5</option>
            <option value="k8">K-8</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px]" style={{ color: MUTED }}>
          Enrollment (optional)
          <input
            type="number"
            value={candidate.enrollment}
            onChange={(e) => onChange({ ...candidate, enrollment: e.target.value })}
            className="rounded border px-2 py-1 text-[12px]"
            style={{ borderColor: BORDER, color: NAVY }}
            placeholder="540"
          />
        </label>
        <div className="flex items-end justify-end gap-2">
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="rounded border px-2 py-1 text-[11px]"
              style={{ borderColor: BORDER, color: MUTED }}
            >
              Remove
            </button>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={status === "loading"}
            className="inline-flex items-center gap-1 rounded px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
            style={{ background: BLUE }}
          >
            {status === "loading" && <Loader2 size={11} className="animate-spin" />}
            {status === "loading" ? "Analyzing…" : "Analyze"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-[11px]" style={{ color: "#a3142b" }}>
          {error}
        </p>
      )}

      {/* One-liner summary — auto-generated from live pillar values */}
      {recomputed && (
        <p className="mt-3 text-[12px]" style={{ color: NAVY }}>
          {summarizePillars(recomputed.pillars)}
        </p>
      )}

      {/* Drive-time schematic (concentric rings) */}
      {recomputed && <DriveTimeSchematic place={result?.place} />}

      {/* Six metric tiles — live from compute-sas signals */}
      {recomputed && <MetricTiles signals={result?.signals} />}

      {/* Pillar bars */}
      {recomputed && (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <div
              className="text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: MUTED }}
            >
              Sub-scores
            </div>
            <button
              type="button"
              onClick={() => setShowFormulas((v) => !v)}
              className="text-[11px] font-semibold"
              style={{ color: BLUE }}
            >
              {showFormulas ? "Hide formulas" : "Show all formulas"}
            </button>
          </div>
          <PillarBar label="School Profile" weight={0.25} value={recomputed.pillars.schoolProfile} showFormula={showFormulas} />
          <PillarBar
            label="Neighborhood Affluence"
            weight={0.25}
            value={recomputed.pillars.affluence}
            showFormula={showFormulas}
          />
          <PillarBar label="Family Density" weight={0.2} value={recomputed.pillars.familyDensity} showFormula={showFormulas} />
          <PillarBar label="School Ecosystem" weight={0.15} value={recomputed.pillars.ecosystem} showFormula={showFormulas} />
          <PillarBar label="Accessibility" weight={0.15} value={recomputed.pillars.accessibility} showFormula={showFormulas} />
          {showFormulas && (
            <p className="pt-1 text-[10px]" style={{ color: MUTED }}>
              Composite = sum of weighted contributions = <strong>{recomputed.composite}</strong>
            </p>
          )}
          {result?.place && (
            <p className="pt-1 text-[10px]" style={{ color: MUTED }}>
              Geocoded: {result.place}
            </p>
          )}
        </div>
      )}

      {/* Brett's decision controls — only meaningful once we have a score */}
      {recomputed && (
        <SiteDecisionControls
          address={candidate.address}
          schoolName={candidate.schoolName}
          defaultVerdict={defaultVerdictFromScore(recomputed.composite)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers: summary line, schematic map, metric tiles
// ---------------------------------------------------------------------------

function summarizePillars(p: {
  schoolProfile: number;
  affluence: number;
  familyDensity: number;
  ecosystem: number;
  accessibility: number;
}): string {
  const LABEL: Record<keyof typeof p, string> = {
    schoolProfile: "school profile",
    affluence: "affluence",
    familyDensity: "family density",
    ecosystem: "ecosystem",
    accessibility: "accessibility",
  };
  const strengths = (Object.keys(p) as (keyof typeof p)[]).filter((k) => p[k] >= 80).map((k) => LABEL[k]);
  const weaknesses = (Object.keys(p) as (keyof typeof p)[]).filter((k) => p[k] < 50).map((k) => LABEL[k]);
  const parts: string[] = [];
  if (strengths.length) parts.push(`Strong on ${strengths.join(", ")}.`);
  if (weaknesses.length) parts.push(`Weak on ${weaknesses.join(", ")}.`);
  if (!parts.length) parts.push("Average across all pillars.");
  return parts.join(" ");
}

function DriveTimeSchematic({ place }: { place?: string }) {
  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between text-[11px]" style={{ color: BLUE }}>
        <span className="font-semibold">10-min · 15-min drive rings</span>
        <span
          className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
          style={{ backgroundColor: "#ffe9c2", color: "#7a5800" }}
          title="Schematic — real Mapbox tiles land in a follow-up"
        >
          Map
        </span>
      </div>
      <div
        className="relative overflow-hidden rounded-md border"
        style={{ borderColor: BORDER, backgroundColor: SOFT, height: 110 }}
      >
        <svg viewBox="0 0 200 110" className="h-full w-full">
          <circle cx="100" cy="55" r="48" fill="none" stroke={BLUE} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="100" cy="55" r="30" fill="none" stroke={BLUE} strokeOpacity="0.7" strokeWidth="1.2" />
          <circle cx="100" cy="55" r="4" fill={BLUE} />
        </svg>
        <div
          className="absolute bottom-1 left-2 rounded bg-white/85 px-1.5 py-0.5 text-[9px] font-semibold"
          style={{ color: NAVY }}
        >
          10 · 15 min drive
        </div>
      </div>
      {place && (
        <p className="mt-1 text-[10px]" style={{ color: MUTED }}>
          Centered on {place}
        </p>
      )}
    </div>
  );
}

function Tile({ label, value, dash, dashTip }: { label: string; value?: string; dash?: boolean; dashTip?: string }) {
  return (
    <div
      className="rounded border px-2 py-1.5"
      style={{ borderColor: BORDER, backgroundColor: dash ? "#f7faff" : "white" }}
      title={dash ? dashTip : undefined}
    >
      <div className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
        {label}
      </div>
      <div
        className="text-[13px] font-bold tabular-nums"
        style={{ color: dash ? MUTED : NAVY }}
      >
        {dash ? "—" : value ?? "—"}
      </div>
    </div>
  );
}

function fmtMoney(n?: number) {
  if (n == null || !Number.isFinite(n)) return undefined;
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${Math.round(n)}`;
}
function fmtPct(n?: number) {
  if (n == null || !Number.isFinite(n)) return undefined;
  const v = n <= 1 ? n * 100 : n;
  return `${Math.round(v)}%`;
}
function fmtCount(n?: number) {
  if (n == null || !Number.isFinite(n)) return undefined;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `${Math.round(n)}`;
}

function MetricTiles({ signals }: { signals?: SiteScoreSignals }) {
  const acs10 = signals?.acs10 ?? {};
  const acs15 = signals?.acs15 ?? {};
  return (
    <div className="mt-3 grid grid-cols-3 gap-1.5">
      <Tile label="Median HHI · 10m" value={fmtMoney(acs10.medianHhi)} />
      <Tile label="HH >$150k · 10m" value={fmtPct(acs10.pctAbove150k)} />
      <Tile label="Kids 5-12 · 10m" value={fmtCount(acs10.children5to12)} />
      <Tile label="Drive to hwy" dash dashTip="Accessibility v0.2 — highway distance not yet wired" />
      <Tile label="Parking" dash dashTip="Manual field — not yet wired" />
      <Tile label="Pop · 15m" value={fmtCount(acs15.totalPop)} />
    </div>
  );
}

function PillarBar({
  label,
  weight,
  value,
  showFormula,
}: {
  label: string;
  weight: number;
  value: number;
  showFormula?: boolean;
}) {
  const contribution = +(weight * value).toFixed(1);
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px]">
        <span style={{ color: MUTED }}>
          {label} <span className="text-[9px]">({Math.round(weight * 100)}%)</span>
        </span>
        <span className="font-bold tabular-nums" style={{ color: NAVY }}>
          {value}
        </span>
      </div>
      <div
        className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: "#eef2f7" }}
      >
        <div
          className="h-full"
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            backgroundColor:
              value >= SITE_RECOMMEND_THRESHOLDS.recommend
                ? "#1d6b32"
                : value >= SITE_RECOMMEND_THRESHOLDS.worthALook
                ? "#925100"
                : "#a3142b",
          }}
        />
      </div>
      {showFormula && (
        <div className="mt-0.5 text-[10px]" style={{ color: MUTED }}>
          {weight.toFixed(2)} × {value} = <strong style={{ color: NAVY }}>{contribution}</strong> pts
        </div>
      )}
    </div>
  );
}


// ---------------------------------------------------------------------------
// Empty add-slot
// ---------------------------------------------------------------------------

function EmptySlot({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors hover:border-[var(--add-hover)] hover:bg-[#f7faff]"
      style={
        {
          borderColor: BORDER,
          color: MUTED,
          minHeight: 540,
          ["--add-hover" as string]: BLUE,
        } as React.CSSProperties
      }
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: SOFT, color: BLUE }}
      >
        <Plus size={18} />
      </div>
      <div className="mt-2 text-[12px] font-semibold" style={{ color: NAVY }}>
        Add candidate site
      </div>
      <p className="mt-1 max-w-[180px] text-[11px]">
        Add a school + address; the live engine scores it. Up to 4 candidates side-by-side.
      </p>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Calibration gate (real numbers)
// ---------------------------------------------------------------------------

function CalibrationGateBanner({
  trinityScore,
  leafScore,
  trinityLoading,
  leafLoading,
}: {
  trinityScore: number | null;
  leafScore: number | null;
  trinityLoading: boolean;
  leafLoading: boolean;
}) {
  if (trinityLoading || leafLoading || trinityScore == null || leafScore == null) {
    return (
      <div
        className="mb-3 flex items-start gap-2 rounded-md border px-3 py-2 text-[12px]"
        style={{ backgroundColor: "#eef2f7", borderColor: BORDER, color: MUTED }}
        role="status"
      >
        <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin" />
        <div>
          <strong>Computing calibration gate…</strong> Running Trinity Christian Academy vs LeafSpring Plano through the live engine.
        </div>
      </div>
    );
  }
  const delta = trinityScore - leafScore;
  const pass = delta >= 20;
  return (
    <div
      className="mb-3 flex items-start gap-2 rounded-md border px-3 py-2 text-[12px]"
      style={{
        backgroundColor: pass ? "#e3f3e7" : "#fce7ec",
        borderColor: pass ? "#1d6b32" : "#a3142b",
        color: pass ? "#155724" : "#a3142b",
      }}
      role="status"
    >
      {pass ? (
        <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
      ) : (
        <XCircle size={16} className="mt-0.5 shrink-0" />
      )}
      <div>
        <strong>Calibration gate: {pass ? "✓ PASS" : "✗ FAIL"}</strong> — Live engine: Trinity ({trinityScore}) vs LeafSpring ({leafScore}). Gap{" "}
        {delta.toFixed(1)} pt {pass ? "≥" : "<"} 20 pt required.{" "}
        <span className="opacity-80">
          SOW Item 2 requires LeafSpring to score materially lower than Trinity. If this fails, the model weights are reworked before rollout.
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Winner banner + Decision summary (read live)
// ---------------------------------------------------------------------------

interface ScoredCandidate {
  candidate: Candidate;
  result: SiteScoreResult | null;
  composite: number | null;
}

function WinnerBanner({
  winner,
  winnerDecision,
}: {
  winner?: ScoredCandidate;
  winnerDecision?: { verdict: SiteVerdict };
}) {
  if (!winner || winner.composite == null) {
    return (
      <div
        className="mb-3 rounded-md border px-3 py-2 text-[12px]"
        style={{ backgroundColor: "#fff8d9", borderColor: "#925100", color: "#7a5800" }}
      >
        <strong>No winner selected.</strong> Mark one analyzed candidate as ★ Winner to enable the
        decision pack export.
      </div>
    );
  }
  const v = winnerDecision?.verdict ?? "undecided";
  const verdictLabel = VERDICT_STYLE[v].label;
  return (
    <div
      className="mb-3 flex items-center gap-2 rounded-md border px-3 py-2 text-[12px]"
      style={{ backgroundColor: "#e3f3e7", borderColor: "#1d6b32", color: "#155724" }}
    >
      <Star size={14} fill="#1d6b32" />
      <div>
        <strong>★ Winner:</strong> {winner.candidate.schoolName} — Site Analysis Score (SAO){" "}
        <strong className="tabular-nums">{winner.composite}</strong> · Brett/Sam's verdict:{" "}
        <strong>{verdictLabel}</strong>
      </div>
    </div>
  );
}

function DecisionSummary({
  scored,
  byAddress,
}: {
  scored: ScoredCandidate[];
  byAddress: Map<string, { verdict: SiteVerdict; is_winner: boolean; notes: string }>;
}) {
  return (
    <section className="mb-6 rounded-lg border bg-white p-4" style={{ borderColor: BORDER }}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[13px] font-bold" style={{ color: NAVY }}>
          Decision summary
        </h3>
        <span className="text-[10px] uppercase tracking-wide" style={{ color: MUTED }}>
          Goes into the decision pack export
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ color: MUTED }}>
              <th className="py-1 text-left font-semibold">Site</th>
              <th className="py-1 text-right font-semibold">Score</th>
              <th className="py-1 text-left font-semibold">Brett/Sam's verdict</th>
              <th className="py-1 text-left font-semibold">Winner</th>
              <th className="py-1 text-left font-semibold">Note</th>
            </tr>
          </thead>
          <tbody>
            {scored.map((s) => {
              const d = byAddress.get(s.candidate.address);
              const v = (d?.verdict ?? "undecided") as SiteVerdict;
              const vs = VERDICT_STYLE[v];
              return (
                <tr
                  key={s.candidate.id}
                  style={{ borderTop: `1px solid ${BORDER}`, color: NAVY }}
                >
                  <td className="py-1.5 pr-2">
                    {s.candidate.schoolName || <em style={{ color: MUTED }}>Unnamed</em>}
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums font-bold">
                    {s.composite != null ? s.composite : <span style={{ color: MUTED }}>—</span>}
                  </td>
                  <td className="py-1.5 pr-2">
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{ backgroundColor: vs.bg, color: vs.fg }}
                    >
                      {vs.label}
                    </span>
                  </td>
                  <td className="py-1.5 pr-2">
                    {d?.is_winner ? (
                      <Star size={12} fill="#1d6b32" color="#1d6b32" />
                    ) : (
                      <span style={{ color: MUTED }}>—</span>
                    )}
                  </td>
                  <td
                    className="py-1.5 pr-2"
                    style={{ color: d?.notes ? NAVY : MUTED }}
                  >
                    {d?.notes || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SiteAnalysis() {
  const [candidates, setCandidates] = useState<Candidate[]>([
    TRINITY_CANDIDATE,
    LEAFSPRING_CANDIDATE,
  ]);
  // Per-candidate live engine result; mirrors the candidates array by id.
  const [results, setResults] = useState<Record<string, SiteScoreResult | null>>({});
  const { byAddress } = useSiteDecisions();

  const updateCandidate = (id: string, next: Candidate) => {
    setCandidates((prev) => prev.map((c) => (c.id === id ? next : c)));
  };
  const removeCandidate = (id: string) => {
    setCandidates((prev) => prev.filter((c) => c.id !== id));
    setResults((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };
  const addCandidate = () => {
    if (candidates.length >= 4) return;
    setCandidates((prev) => [
      ...prev,
      {
        id: `candidate-${Date.now()}`,
        schoolName: "",
        address: "",
        schoolType: "private_elementary",
        gradeBand: "k5_k6",
        enrollment: "",
      },
    ]);
  };
  const setResultFor = (id: string, result: SiteScoreResult | null) => {
    setResults((prev) => (prev[id] === result ? prev : { ...prev, [id]: result }));
  };

  const scored: ScoredCandidate[] = useMemo(
    () =>
      candidates.map((c) => {
        const result = results[c.id] ?? null;
        return {
          candidate: c,
          result,
          composite: result ? siteComposite(result.pillars) : null,
        };
      }),
    [candidates, results],
  );

  const trinityScored = scored.find((s) => s.candidate.calibrationRole === "trinity");
  const leafScored = scored.find((s) => s.candidate.calibrationRole === "leafspring");

  const winner = useMemo(
    () => scored.find((s) => byAddress.get(s.candidate.address)?.is_winner),
    [scored, byAddress],
  );
  const winnerDecision = winner ? byAddress.get(winner.candidate.address) : undefined;
  const canExport = !!(winner && winner.composite != null);

  const emptySlots = Math.max(0, 4 - candidates.length);

  const handleExport = () => {
    const exportRows: ExportCandidate[] = scored
      .filter((s) => s.result)
      .map((s) => {
        const recomputed = recomputeSiteScores(s.result!.pillars);
        return {
          schoolName: s.candidate.schoolName,
          address: s.candidate.address,
          pillars: recomputed.pillars,
          composite: recomputed.composite,
        };
      });
    exportSiteDecisionPack(exportRows, byAddress);
  };

  return (
    <>
      <PageHeader
        title="Site Analysis"
        subtitle="Phase 2 · Feature 1B — Per-site opportunity scoring with side-by-side comparison up to 4 candidates."
        hideJourneyBar
      />

      <Feature1BStatus />

      {SAS_ENGINE_LIVE && <LiveEngineCard />}

      {/* Formula + thresholds — single, no "Austin metro" wording */}
      <section className="mb-4 rounded-lg border bg-white p-4" style={{ borderColor: BORDER }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-black" style={{ color: NAVY }}>
              Site Analysis Score (SAO)
            </h2>
            <p className="mt-1 text-[12px]" style={{ color: MUTED }}>
              SAO = 0.25 × School Profile + 0.25 × Neighborhood Affluence + 0.20 × Family Density +
              0.15 × School Ecosystem + 0.15 × Accessibility.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={!canExport}
            title={
              canExport
                ? "Open a branded decision pack with verdicts, winner, and notes — print or save as PDF"
                : "Mark a winner first to enable the decision pack"
            }
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            style={{ borderColor: BLUE, color: BLUE, backgroundColor: "#fff" }}
          >
            <Download size={12} />
            Export decision pack
          </button>
        </div>

        <div
          className="mt-3 rounded-md p-2 text-[11px]"
          style={{ backgroundColor: "#f7faff" }}
        >
          <strong style={{ color: NAVY }}>Decision points on this page:</strong>
          <ol className="ml-4 mt-0.5 list-decimal" style={{ color: NAVY }}>
            <li>Confirm the calibration gate holds: LeafSpring scores materially below Trinity.</li>
            <li>
              Per site: <strong>Recommend / Worth a look / Don't recommend</strong> (overrides the threshold default and drives the top pill).
            </li>
            <li>
              Across the compared set: pick exactly one <strong>Winner</strong> ★ — the site Brett/Sam is committing to.
            </li>
            <li>
              Capture <strong>notes</strong> on each card explaining the verdict — they go into the export pack.
            </li>
          </ol>
        </div>

        <div
          className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md p-2 text-[11px]"
          style={{ backgroundColor: SOFT }}
        >
          <span className="whitespace-nowrap font-semibold" style={{ color: NAVY }}>
            Thresholds:
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: "#1d6b32" }}
            />
            <span style={{ color: NAVY }}>
              ≥{SITE_RECOMMEND_THRESHOLDS.recommend} Recommend
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: "#925100" }}
            />
            <span style={{ color: NAVY }}>
              {SITE_RECOMMEND_THRESHOLDS.worthALook}–
              {SITE_RECOMMEND_THRESHOLDS.recommend - 1} Worth a look
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: "#a3142b" }}
            />
            <span style={{ color: NAVY }}>
              &lt;{SITE_RECOMMEND_THRESHOLDS.worthALook} Don't recommend
            </span>
          </span>
        </div>
      </section>

      <CalibrationGateBanner
        trinityScore={trinityScored?.composite ?? null}
        leafScore={leafScored?.composite ?? null}
        trinityLoading={!!trinityScored && trinityScored.result == null}
        leafLoading={!!leafScored && leafScored.result == null}
      />
      <WinnerBanner winner={winner} winnerDecision={winnerDecision} />

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {candidates.map((c) => (
          <CandidateCard
            key={c.id}
            candidate={c}
            autoRun={!!c.calibrationRole}
            onChange={(next) => updateCandidate(c.id, next)}
            onRemove={c.calibrationRole ? undefined : () => removeCandidate(c.id)}
            onResult={(r) => setResultFor(c.id, r)}
          />
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <EmptySlot key={`empty-${i}`} onAdd={addCandidate} />
        ))}
      </section>

      <DecisionSummary scored={scored} byAddress={byAddress} />

      <footer
        className="flex items-center gap-2 rounded-lg border bg-white p-3 text-[11px]"
        style={{ borderColor: BORDER, color: MUTED }}
      >
        <FileText size={14} />
        Formulas, sub-score weights, and the LeafSpring &lt; Trinity calibration gate are locked in
        <code className="rounded bg-[#f7faff] px-1 py-px text-[#174be8]">
          .lovable/phase-2/phase-2-sow.md
        </code>
        Item 2 (Feature 1B). Cards now call the live `compute-sas` engine — Mapbox geocode, ACS
        sampling, school ecosystem, and the SAS composite.
      </footer>
    </>
  );
}
