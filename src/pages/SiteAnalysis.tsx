import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  Loader2,
  MapPin,
  Plus,
  Star,
} from "lucide-react";


import { PageHeader } from "@/components/PageHeader";
import { LiveEngineCard, SAS_ENGINE_LIVE } from "@/components/site-analysis/LiveEngineCard";

import { SiteDecisionControls } from "@/components/phase2-demo/SiteDecisionControls";

import { IsochroneMap } from "@/components/site-analysis/IsochroneMap";
import { supabase } from "@/integrations/supabase/client";
import { useSiteDecisions, type SiteVerdict } from "@/hooks/useSiteDecisions";
import { type SiteScoreResult, type SiteScoreSignals } from "@/hooks/useSiteScore";
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
  id: "trinity-episcopal-westlake",
  schoolName: "Trinity Episcopal School",
  address: "4011 Bee Caves Rd, Austin, TX 78746",
  schoolType: "private_elementary",
  gradeBand: "k5_k6",
  enrollment: "580",
  calibrationRole: "trinity",
};

const LEAFSPRING_CANDIDATE: Candidate = {
  id: "leafspring-cedar-park",
  schoolName: "LeafSpring School at Cedar Park — closed 2023 (negative anchor)",
  address: "11651 W Parmer Ln, Cedar Park, TX 78613",
  schoolType: "daycare",
  gradeBand: "other",
  enrollment: "150",
  calibrationRole: "leafspring",
};

// ---------------------------------------------------------------------------
// CandidateCard — DISPLAY-ONLY.
//
// All inputs come from the parent (the Live Engine card or a hard-coded
// anchor preset). The card does not own an engine call. Its props carry the
// already-computed result. Re-run / Remove are parent callbacks. This is what
// guarantees "one calibrated number everywhere": every surface shows the
// engine result object that was last written into the slot — no card-local
// re-computation, no card-local input form.
// ---------------------------------------------------------------------------

const SCHOOL_TYPE_LABEL: Record<SchoolType, string> = {
  private_elementary: "Private elementary",
  public_elementary: "Public elementary",
  charter_elementary: "Charter elementary",
  montessori: "Montessori",
  daycare: "Daycare",
  other_k8: "Other K-8",
  other: "Other",
};
const GRADE_BAND_LABEL: Record<GradeBand, string> = {
  k5_k6: "K-5 / K-6",
  prek_5: "Pre-K through 5",
  k8: "K-8",
  other: "Other",
};

type SlotStatus = "idle" | "loading" | "ready" | "error";

interface SlotState extends Candidate {
  status: SlotStatus;
  result: SiteScoreResult | null;
  error: string | null;
}

interface CardProps {
  slot: SlotState;
  onRerun: () => void;
  onRemove?: () => void;
}

interface CardPropsExt extends CardProps { onReplace?: () => void; }

function CandidateCard({ slot, onRerun, onRemove, onReplace }: CardPropsExt) {
  const { byAddress } = useSiteDecisions();
  const decision = byAddress.get(slot.address);
  const userVerdict: SiteVerdict | undefined =
    decision && decision.verdict !== "undecided" ? decision.verdict : undefined;
  const isWinner = decision?.is_winner ?? false;
  const [showFormulas, setShowFormulas] = useState(false);

  const recomputed = slot.result ? recomputeSiteScores(slot.result.pillars) : null;
  const composite = recomputed?.composite ?? null;
  const scoreTier = composite != null ? tierBadge(composite) : null;
  const suggestedTier: SiteVerdict | undefined =
    composite != null ? defaultVerdictFromScore(composite) : undefined;
  // Pill shown next to score: ONLY user-selected verdict. If the user hasn't
  // decided yet, we show a neutral score-tier hint (small, muted) — never
  // surface "Don't recommend" as if it were a decision the user made.
  const userPill = userVerdict ? VERDICT_STYLE[userVerdict] : null;

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
          <div className="flex items-start gap-1.5">
            <MapPin size={14} style={{ color: BLUE, marginTop: 3 }} className="shrink-0" />
            <h3
              className="text-[13px] font-bold leading-snug break-words"
              style={{ color: NAVY }}
              title={slot.schoolName || "Unnamed candidate"}
            >
              {slot.schoolName || "New candidate"}
            </h3>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {isWinner && (
              <span
                className="inline-flex items-center whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                style={{ backgroundColor: "#1d6b32", color: "#fff" }}
              >
                <Star size={9} className="mr-0.5" fill="#fff" /> Winner
              </span>
            )}
          </div>
          {slot.address && (
            <p className="mt-1 text-[11px] break-words" style={{ color: MUTED }}>
              {slot.address}
            </p>
          )}
          <p className="mt-1 text-[10px]" style={{ color: MUTED }}>
            {SCHOOL_TYPE_LABEL[slot.schoolType]} · {GRADE_BAND_LABEL[slot.gradeBand]}
            {slot.enrollment ? ` · enrollment ${slot.enrollment}` : ""}
          </p>
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
              {userPill ? (
                <span
                  className="inline-flex items-center whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                  style={{ backgroundColor: userPill.bg, color: userPill.fg }}
                  title="Your decision"
                >
                  {userPill.label}
                </span>
              ) : scoreTier ? (
                <span
                  className="inline-flex items-center whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                  style={{ borderColor: scoreTier.fg, color: scoreTier.fg, backgroundColor: "#fff" }}
                  title="Score-based tier suggestion. Confirm below to make it your decision."
                >
                  Suggested: {scoreTier.label}
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-[10px] uppercase tracking-wide" style={{ color: MUTED }}>
              {slot.status === "loading" ? "Computing…" : slot.status === "error" ? "Error" : "No score yet"}
            </span>
          )}
        </div>
      </div>

      {/* Re-run / Replace / Remove */}
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onRerun}
          disabled={slot.status === "loading"}
          className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-semibold disabled:opacity-50"
          style={{ borderColor: BORDER, color: BLUE }}
          title="Re-run the live engine with these exact inputs"
        >
          {slot.status === "loading" && <Loader2 size={10} className="animate-spin" />}
          {slot.status === "loading" ? "Running…" : "↻ Re-run"}
        </button>
        {onReplace && (
          <button
            type="button"
            onClick={onReplace}
            className="rounded border px-2 py-0.5 text-[10px]"
            style={{ borderColor: BORDER, color: BLUE }}
            title="Replace this card with a new computation from the Live Engine above"
          >
            ⇄ Replace
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded border px-2 py-0.5 text-[10px]"
            style={{ borderColor: BORDER, color: MUTED }}
          >
            ✕ Remove
          </button>
        )}
      </div>

      {slot.error && (
        <p className="mt-2 rounded border px-2 py-1 text-[11px]" style={{ color: "#a3142b", borderColor: "#f5c6cd", backgroundColor: "#fdf2f4" }}>
          Engine error: {slot.error}. Click ↻ Re-run to retry.
        </p>
      )}

      {/* One-liner summary — auto-generated from live pillar values */}
      {recomputed && (
        <p className="mt-3 text-[12px]" style={{ color: NAVY }}>
          {summarizePillars(recomputed.pillars)}
        </p>
      )}

      {/* Drive-time isochrone map (real Mapbox tiles) */}
      {recomputed && slot.result?.geo && (
        <IsochroneMap
          center={slot.result.geo}
          iso10={slot.result.iso10 ?? null}
          iso15={slot.result.iso15 ?? null}
          place={slot.result.place}
        />
      )}

      {/* Six metric tiles — live from compute-sas signals */}
      {recomputed && <MetricTiles signals={slot.result?.signals} />}

      {/* Pillar bars */}
      {recomputed && (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
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
          <PillarBar label="School Profile" weight={0.25} value={recomputed.pillars.schoolProfile} showFormula={showFormulas} detail={`f(type=${SCHOOL_TYPE_LABEL[slot.schoolType]}, grade=${GRADE_BAND_LABEL[slot.gradeBand]}, enroll=${slot.enrollment || "—"}) = ${recomputed.pillars.schoolProfile}`} />
          <PillarBar label="Neighborhood Affluence" weight={0.25} value={recomputed.pillars.affluence} showFormula={showFormulas} detail={`0.6 × medianHHI_norm(${fmtMoney(slot.result?.signals?.acs10?.medianHhi) ?? "—"}) + 0.4 × pctAbove150k_norm(${fmtPct(slot.result?.signals?.acs10?.pctAbove150k) ?? "—"}) = ${recomputed.pillars.affluence}`} />
          <PillarBar label="Family Density" weight={0.2} value={recomputed.pillars.familyDensity} showFormula={showFormulas} detail={`children5-12 / totalPop × scale → ${fmtCount(slot.result?.signals?.acs15?.children5to12)} / ${fmtCount(slot.result?.signals?.acs15?.totalPop)} = ${recomputed.pillars.familyDensity}`} />
          <PillarBar label="School Ecosystem" weight={0.15} value={recomputed.pillars.ecosystem} showFormula={showFormulas} detail={`elementaryCount(${slot.result?.signals?.ecosystem?.elementaryCount ?? "—"}) + privateCount(${slot.result?.signals?.ecosystem?.privateCount ?? "—"}) weighted by nearbyStudentPop = ${recomputed.pillars.ecosystem}`} />
          <PillarBar label="Accessibility" weight={0.15} value={recomputed.pillars.accessibility} showFormula={showFormulas} detail={(() => { const hwy = slot.result?.signals?.accessibility?.highwayDistanceMi; const road = slot.result?.signals?.accessibility?.roadDistanceMi; const pop = slot.result?.signals?.acs15?.totalPop; const hwyStr = hwy == null ? "—" : `${hwy.toFixed(1)}mi`; const roadStr = road == null ? "—" : `${road.toFixed(1)}mi`; return `0.3 × roadFactor(${roadStr}) + 0.3 × hwyFactor(${hwyStr}) + 0.4 × popReachable_norm(${fmtCount(pop) ?? "—"}) = ${recomputed.pillars.accessibility}`; })()} />
          {showFormulas && (
            <p className="pt-1 text-[10px]" style={{ color: MUTED }}>
              Composite = sum of weighted contributions = <strong>{recomputed.composite}</strong>
            </p>
          )}
        </div>
      )}

      {/* Decision controls — no auto-default; user must select */}
      {recomputed && (
        <SiteDecisionControls
          address={slot.address}
          schoolName={slot.schoolName}
          suggestedTier={suggestedTier}
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

// (DriveTimeSchematic was removed in v0.4 — replaced by the real Mapbox
// IsochroneMap component imported above.)

function Tile({ label, value, dash, dashTip, badge }: { label: string; value?: string; dash?: boolean; dashTip?: string; badge?: string }) {
  return (
    <div
      className="rounded border px-2 py-1.5"
      style={{ borderColor: BORDER, backgroundColor: dash ? "#f7faff" : "white" }}
      title={dash ? dashTip : undefined}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
          {label}
        </div>
        {badge && (
          <span className="rounded-full px-1 py-px text-[8px] font-bold uppercase" style={{ backgroundColor: "#dde7ff", color: BLUE }}>
            {badge}
          </span>
        )}
      </div>
      <div className="text-[13px] font-bold tabular-nums" style={{ color: dash ? MUTED : NAVY }}>
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
  const hwyMi = signals?.accessibility?.highwayDistanceMi;
  return (
    <div className="mt-3 grid grid-cols-3 gap-1.5">
      <Tile label="Median HHI · 10m" value={fmtMoney(acs10.medianHhi)} />
      <Tile label="HH >$150k · 10m" value={fmtPct(acs10.pctAbove150k)} />
      <Tile label="Kids 5-12 · 10m" value={fmtCount(acs10.children5to12)} />
      <Tile
        label="Drive to hwy"
        value={hwyMi != null ? `${hwyMi.toFixed(1)} mi` : undefined}
        dash={hwyMi == null}
        dashTip="No motorway/trunk found within 12 mi — Accessibility scored via fallback"
      />
      <Tile label="Pop · 15m" value={fmtCount(acs15.totalPop)} />
    </div>
  );
}

function PillarBar({
  label,
  weight,
  value,
  showFormula,
  detail,
}: {
  label: string;
  weight: number;
  value: number;
  showFormula?: boolean;
  detail?: string;
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
        <div className="mt-0.5 space-y-0.5 text-[10px]" style={{ color: MUTED }}>
          {detail && <div>{detail}</div>}
          <div>
            {weight.toFixed(2)} × {value} = <strong style={{ color: NAVY }}>{contribution}</strong> pts
          </div>
        </div>
      )}
    </div>
  );
}



// ---------------------------------------------------------------------------
// Empty add-slot
// ---------------------------------------------------------------------------

function EmptySlot() {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center"
      style={{ borderColor: BORDER, color: MUTED, minHeight: 540 }}
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: SOFT, color: BLUE }}
      >
        <Plus size={18} />
      </div>
      <div className="mt-2 text-[12px] font-semibold" style={{ color: NAVY }}>
        Empty slot
      </div>
      <p className="mt-1 max-w-[200px] text-[11px]">
        Compute a site in the <strong>Live Site Analysis Engine</strong> above, then click
        <strong> Save to slot</strong> to fill this card.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calibration gate (qualitative — per Sam brief v2.2 p.12 / SOW v2.2 p.509)
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
          <strong>Computing calibration anchors…</strong> Running Trinity Episcopal School (Westlake, Austin) vs LeafSpring Cedar Park (Austin area) through the live engine.
        </div>
      </div>
    );
  }
  const delta = trinityScore - leafScore;
  const trinityHigher = delta > 0;
  return (
    <div
      className="mb-3 flex items-start gap-2 rounded-md border px-3 py-2 text-[12px]"
      style={{ backgroundColor: SOFT, borderColor: BLUE, color: NAVY }}
      role="status"
    >
      <CheckCircle2 size={16} className="mt-0.5 shrink-0" style={{ color: BLUE }} />
      <div>
        <strong>Calibration anchors (qualitative criterion):</strong> Live engine —
        Trinity <strong>{trinityScore}</strong> vs LeafSpring <strong>{leafScore}</strong>{" "}
        (gap {delta >= 0 ? "+" : ""}{delta.toFixed(2)} pt, Trinity {trinityHigher ? "higher" : "lower"}).{" "}
        <span className="opacity-80">
          Per Sam's brief v2.2 p.12 / SOW v2.2 p.509, the pass test is qualitative: <em>"LeafSpring scores materially lower than Trinity."</em>
          No numeric threshold is client-specified. Awaiting Brett's call on whether v0.3 is accepted, a second anchor pair is added, or a reweight is authorized.
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
        <strong>★ Winner:</strong> {winner.candidate.schoolName} — Site Analysis Score (SAS){" "}
        <strong className="tabular-nums">{winner.composite}</strong> · Decision:{" "}
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
              <th className="py-1 text-left font-semibold">Decision</th>
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
  // Slots hold the *frozen* inputs + the last engine result. There is no
  // per-card input form anymore: the only way to feed inputs into the engine
  // is via the Live Engine card above and the "Save to slot" button.
  const [slots, setSlots] = useState<SlotState[]>([]);
  const [pendingReplaceId, setPendingReplaceId] = useState<string | null>(null);
  const { byAddress } = useSiteDecisions();

  const patchSlot = useCallback((id: string, patch: Partial<SlotState>) => {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const runSlot = useCallback(
    async (id: string, opts?: { preferCache?: boolean }) => {
      const slot = slots.find((s) => s.id === id);
      if (!slot) return;
      if (!slot.address.trim() || !slot.schoolName.trim()) {
        patchSlot(id, { status: "error", error: "School name and address are required." });
        return;
      }
      patchSlot(id, { status: "loading", error: null });

      // Exact-input cache lookup — avoid an expensive live recompute
      // (Mapbox geocode + isochrones + Census + Urban Institute + OSM) when
      // a recent ready row already matches address + type + enrollment + grade.
      if (opts?.preferCache) {
        const enrollmentNum = slot.enrollment ? Number(slot.enrollment) : null;
        const { data: cached } = await supabase
          .from("site_analyses")
          .select(
            "id,school_profile_score,affluence_score,family_density_score,ecosystem_score,accessibility_score,sas_score,signals,latitude,longitude",
          )
          .eq("status", "ready")
          .eq("address", slot.address.trim())
          .eq("school_type", slot.schoolType)
          .eq("grade_band", slot.gradeBand)
          .eq("enrollment", enrollmentNum as number)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (
          cached &&
          cached.school_profile_score != null &&
          cached.affluence_score != null &&
          cached.family_density_score != null &&
          cached.ecosystem_score != null &&
          cached.accessibility_score != null
        ) {
          const signals = (cached.signals ?? {}) as SiteScoreSignals;
          const result: SiteScoreResult = {
            sas: Number(cached.sas_score ?? 0),
            pillars: {
              schoolProfile: Number(cached.school_profile_score),
              affluence: Number(cached.affluence_score),
              familyDensity: Number(cached.family_density_score),
              ecosystem: Number(cached.ecosystem_score),
              accessibility: Number(cached.accessibility_score),
            },
            signals,
            geo:
              cached.latitude != null && cached.longitude != null
                ? { lat: Number(cached.latitude), lng: Number(cached.longitude) }
                : undefined,
          };
          patchSlot(id, { status: "ready", result, error: null });
          return;
        }
      }

      try {
        const { data, error } = await supabase.functions.invoke("compute-sas", {
          body: {
            address: slot.address.trim(),
            school_name: slot.schoolName.trim(),
            school_type: slot.schoolType,
            enrollment: slot.enrollment ? Number(slot.enrollment) : null,
            grade_band: slot.gradeBand,
          },
        });
        if (error) throw error;
        if ((data as { status?: string })?.status === "failed") {
          throw new Error((data as { error?: string }).error ?? "Engine failed");
        }
        patchSlot(id, { status: "ready", result: data as SiteScoreResult, error: null });
      } catch (e) {
        const msg = (e as Error).message ?? "Engine call failed";
        patchSlot(id, { status: "error", error: msg });
      }
    },
    [slots, patchSlot],
  );

  // Hydrate from the user's most recent ready site_analyses rows (up to 4).
  // No anchor seeding — comparison cards always belong to the user. Anchors
  // live in the separate calibration panel below the Live Engine.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("site_analyses")
        .select(
          "id,address,school_name,school_type,enrollment,grade_band,latitude,longitude,school_profile_score,affluence_score,family_density_score,ecosystem_score,accessibility_score,sas_score,signals,created_at",
        )
        .eq("status", "ready")
        .order("created_at", { ascending: false })
        .limit(20);
      if (cancelled || error || !data) return;

      const seen = new Set<string>();
      const extras: SlotState[] = [];
      for (const row of data) {
        if (!row.address || seen.has(row.address)) continue;
        if (
          row.school_profile_score == null ||
          row.affluence_score == null ||
          row.family_density_score == null ||
          row.ecosystem_score == null ||
          row.accessibility_score == null
        ) continue;
        const signals = (row.signals ?? {}) as SiteScoreSignals;
        const result: SiteScoreResult = {
          sas: Number(row.sas_score ?? 0),
          pillars: {
            schoolProfile: Number(row.school_profile_score),
            affluence: Number(row.affluence_score),
            familyDensity: Number(row.family_density_score),
            ecosystem: Number(row.ecosystem_score),
            accessibility: Number(row.accessibility_score),
          },
          signals,
          geo:
            row.latitude != null && row.longitude != null
              ? { lat: Number(row.latitude), lng: Number(row.longitude) }
              : undefined,
        };
        seen.add(row.address);
        extras.push({
          id: `persisted-${row.id}`,
          schoolName: row.school_name ?? "Saved candidate",
          address: row.address,
          schoolType: (row.school_type as SchoolType) ?? "private_elementary",
          gradeBand: (row.grade_band as GradeBand) ?? "k5_k6",
          enrollment: row.enrollment != null ? String(row.enrollment) : "",
          status: "ready",
          result,
          error: null,
        });
        if (extras.length >= 4) break;
      }

      // Hydrate isochrones for displayed analyses so cached cards show drive-time polygons.
      const analysisIds = extras
        .map((e) => e.id.startsWith("persisted-") ? e.id.replace("persisted-", "") : null)
        .filter((v): v is string => !!v);
      if (analysisIds.length) {
        const { data: isos } = await supabase
          .from("site_analysis_isochrones")
          .select("analysis_id,minutes,geojson")
          .in("analysis_id", analysisIds);
        const byId = new Map<string, { iso10?: GeoJSON.Polygon; iso15?: GeoJSON.Polygon }>();
        (isos ?? []).forEach((r) => {
          const e = byId.get(r.analysis_id) ?? {};
          if (r.minutes === 10) e.iso10 = r.geojson as unknown as GeoJSON.Polygon;
          if (r.minutes === 15) e.iso15 = r.geojson as unknown as GeoJSON.Polygon;
          byId.set(r.analysis_id, e);
        });
        for (const e of extras) {
          const aid = e.id.replace("persisted-", "");
          const iso = byId.get(aid);
          if (iso && e.result) {
            e.result = { ...e.result, iso10: iso.iso10, iso15: iso.iso15 };
          }
        }
      }

      if (cancelled) return;
      setSlots(extras);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeSlot = (id: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== id));
  };

  // Save a freshly-computed Live Engine result into a slot. If pendingReplaceId
  // is set, overwrite that slot in place; otherwise append a new one (max 4).
  const saveResultToSlot = (input: {
    schoolName: string;
    address: string;
    schoolType: SchoolType;
    gradeBand: GradeBand;
    enrollment: string;
  }, result: SiteScoreResult) => {
    setSlots((prev) => {
      if (pendingReplaceId) {
        return prev.map((s) =>
          s.id === pendingReplaceId
            ? { ...s, ...input, status: "ready", result, error: null }
            : s,
        );
      }
      if (prev.length >= 4) return prev;
      const id = `slot-${Date.now()}`;
      return [
        ...prev,
        { id, ...input, status: "ready", result, error: null },
      ];
    });
    setPendingReplaceId(null);
  };


  const scored: ScoredCandidate[] = useMemo(
    () =>
      slots.map((s) => ({
        candidate: s,
        result: s.result,
        composite: s.result ? siteComposite(s.result.pillars) : null,
      })),
    [slots],
  );



  const winner = useMemo(
    () => scored.find((s) => byAddress.get(s.candidate.address)?.is_winner),
    [scored, byAddress],
  );
  const winnerDecision = winner ? byAddress.get(winner.candidate.address) : undefined;
  const canExport = !!(winner && winner.composite != null);

  const emptySlots = Math.max(0, 4 - slots.length);

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
        subtitle="Score up to 4 candidate sites side by side and pick the one to commit to."
        hideJourneyBar
      />

      {SAS_ENGINE_LIVE && (
        <LiveEngineCard
          canSave={slots.length < 4 || !!pendingReplaceId}
          replaceTargetLabel={
            pendingReplaceId
              ? slots.find((s) => s.id === pendingReplaceId)?.schoolName || "selected slot"
              : null
          }
          onCancelReplace={() => setPendingReplaceId(null)}
          onSaveToSlot={(input, result) => saveResultToSlot(input, result as SiteScoreResult)}
        />
      )}

      {/* Formula + thresholds */}
      <section className="mb-4 rounded-lg border bg-white p-4" style={{ borderColor: BORDER }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-black" style={{ color: NAVY }}>
              Site Analysis Score (SAS)
            </h2>
            <p className="mt-1 text-[12px]" style={{ color: MUTED }}>
              SAS = 0.25 × School Profile + 0.25 × Neighborhood Affluence + 0.20 × Family Density +
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
          className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md p-2 text-[11px]"
          style={{ backgroundColor: SOFT }}
        >
          <span className="whitespace-nowrap font-semibold" style={{ color: NAVY }}>
            Score tiers:
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#1d6b32" }} />
            <span style={{ color: NAVY }}>≥{SITE_RECOMMEND_THRESHOLDS.recommend} Recommend</span>
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#925100" }} />
            <span style={{ color: NAVY }}>
              {SITE_RECOMMEND_THRESHOLDS.worthALook}–{SITE_RECOMMEND_THRESHOLDS.recommend - 1} Worth a look
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#a3142b" }} />
            <span style={{ color: NAVY }}>&lt;{SITE_RECOMMEND_THRESHOLDS.worthALook} Don't recommend</span>
          </span>
          <span className="text-[10px]" style={{ color: MUTED }}>
            Tiers are suggestions. Your <strong>Decision</strong> on each card is what ships in the export.
          </span>
        </div>
      </section>

      <WinnerBanner winner={winner} winnerDecision={winnerDecision} />

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {slots.map((s) => (
          <CandidateCard
            key={s.id}
            slot={s}
            onRerun={() => runSlot(s.id)}
            onRemove={() => removeSlot(s.id)}
            onReplace={() => {
              setPendingReplaceId(s.id);
              if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <EmptySlot key={`empty-${i}`} />
        ))}
      </section>

      <DecisionSummary scored={scored} byAddress={byAddress} />
    </>
  );
}

