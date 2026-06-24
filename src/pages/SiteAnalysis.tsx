import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  Download,
  Loader2,
  MapPin,
  Plus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSavedSites, type SavedSiteInputs } from "@/hooks/useSavedSites";
import { SavedSitesDrawer } from "@/components/site-analysis/SavedSitesDrawer";
import { useAuth } from "@/contexts/AuthContext";


import { PageHeader } from "@/components/PageHeader";
import { LiveEngineCard, SAS_ENGINE_LIVE } from "@/components/site-analysis/LiveEngineCard";

import { SiteDecisionControls } from "@/components/phase2-demo/SiteDecisionControls";

import { IsochroneMap } from "@/components/site-analysis/IsochroneMap";
import { supabase } from "@/integrations/supabase/client";
import { useSiteDecisions, type SiteVerdict } from "@/hooks/useSiteDecisions";
import { type SiteScoreResult, type SiteScoreSignals } from "@/hooks/useSiteScore";
import type { SitePackCandidate } from "@/lib/sitePack/SitePackDocument";
import { fetchMapPng } from "@/lib/sitePack/fetchMapPng";
import { buildStaticUrl } from "@/components/site-analysis/IsochroneMap";
import { fmtMoney, fmtPct, fmtCount, fmtMi } from "@/lib/sas/formatters";
import type { SourceMeta } from "@/lib/sas/sources";
import {
  InfoSource,
  DataSourcesStrip,
  DegradedBanner,
} from "@/components/site-analysis/SourcePopover";
import { useMapboxToken } from "@/hooks/useMapboxToken";
import { toast } from "sonner";
import { SITE_CONFIDENCE_THRESHOLDS } from "@/lib/sas/config";
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
  strong: { bg: "#e3f3e7", fg: "#1d6b32", label: "Strong" },
  high: { bg: "#eaf5ec", fg: "#2f7a3f", label: "High" },
  medium: { bg: "#fff8d9", fg: "#7a5800", label: "Medium" },
  low: { bg: "#fce7ec", fg: "#a3142b", label: "Low" },
  undecided: { bg: "#eef2f7", fg: "#526078", label: "Undecided" },
};

function safeVerdictStyle(v: string) {
  const style = VERDICT_STYLE[v as SiteVerdict];
  return style ?? VERDICT_STYLE.undecided;
}

function tierBadge(score: number) {
  if (score >= SITE_CONFIDENCE_THRESHOLDS.strong)
    return { bg: "#e3f3e7", fg: "#1d6b32", label: "Strong" };
  if (score >= SITE_CONFIDENCE_THRESHOLDS.high)
    return { bg: "#eaf5ec", fg: "#2f7a3f", label: "High" };
  if (score >= SITE_CONFIDENCE_THRESHOLDS.medium)
    return { bg: "#fff8d9", fg: "#7a5800", label: "Medium" };
  return { bg: "#fce7ec", fg: "#a3142b", label: "Low" };
}

function defaultVerdictFromScore(score: number): SiteVerdict {
  if (score >= SITE_CONFIDENCE_THRESHOLDS.strong) return "strong";
  if (score >= SITE_CONFIDENCE_THRESHOLDS.high) return "high";
  if (score >= SITE_CONFIDENCE_THRESHOLDS.medium) return "medium";
  return "low";
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
}


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
  /** site_analyses.id this slot represents, when known. Used for soft-hide. */
  analysisId?: string;
}

interface CardProps {
  slot: SlotState;
  onRerun: () => void;
  onRemove?: () => void;
}

interface BookmarkInfo {
  saved: boolean;
  isMine: boolean;
  savedByLabel: string | null;
  busy: boolean;
  onToggle: () => void;
}

interface CardPropsExt extends CardProps {
  onReplace?: () => void;
  bookmark?: BookmarkInfo;
}

function CandidateCard({ slot, onRerun, onRemove, onReplace, bookmark }: CardPropsExt) {
  const { byAddress } = useSiteDecisions();
  const decision = byAddress.get(slot.address);
  const userVerdict: SiteVerdict | undefined =
    decision && decision.verdict !== "undecided" ? decision.verdict : undefined;
  const [showFormulas, setShowFormulas] = useState(false);

  const recomputed = slot.result ? recomputeSiteScores(slot.result.pillars) : null;
  const composite = recomputed?.composite ?? null;
  const scoreTier = composite != null ? tierBadge(composite) : null;
  const suggestedTier: SiteVerdict | undefined =
    composite != null ? defaultVerdictFromScore(composite) : undefined;
  // Pill shown next to score: ONLY user-selected confidence. If the user hasn't
  // decided yet, we show a neutral score-tier hint (small, muted) — never
  // surface "Low" as if it were a decision the user made.
  const userPill = userVerdict ? safeVerdictStyle(userVerdict) : null;

  return (
    <div
      className="flex flex-col rounded-lg border bg-white p-4"
      style={{
        borderColor: BORDER,
        borderWidth: 1,
        minHeight: 560,
      }}
    >

      {/* Header — fixed height so all 4 cards align */}
      <div className="flex items-start justify-between gap-3" style={{ minHeight: 110 }}>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <MapPin size={14} style={{ color: BLUE, marginTop: 3 }} className="shrink-0" />
            <h3
              className="text-[13px] font-bold leading-snug min-w-0 flex-1"
              style={{
                color: NAVY,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
              title={slot.schoolName || "Unnamed candidate"}
            >
              {slot.schoolName || "New candidate"}
            </h3>
          </div>
          {slot.address && (
            <p
              className="mt-1 text-[11px]"
              style={{
                color: MUTED,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
              title={slot.address}
            >
              {slot.address}
            </p>
          )}
          <p className="mt-1 truncate text-[10px]" style={{ color: MUTED }}>
            {SCHOOL_TYPE_LABEL[slot.schoolType]} · {GRADE_BAND_LABEL[slot.gradeBand]}
            {slot.enrollment ? ` · enrollment ${slot.enrollment}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1" style={{ width: 110 }}>
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
                  className="inline-block max-w-full rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold leading-tight"
                  style={{ backgroundColor: userPill.bg, color: userPill.fg, wordBreak: "break-word" }}
                  title="Your decision"
                >
                  {userPill.label}
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


      {/* Action buttons — single row, right aligned */}
      <div className="mt-2 flex flex-nowrap items-center justify-end gap-1.5">
        {bookmark && slot.result && (
          <button
            type="button"
            onClick={bookmark.onToggle}
            disabled={bookmark.busy}
            className="inline-flex items-center gap-1 whitespace-nowrap rounded border px-2 py-1 text-[11px] font-semibold leading-none disabled:opacity-50"
            style={{
              borderColor: bookmark.saved ? BLUE : BORDER,
              color: bookmark.saved ? BLUE : MUTED,
              backgroundColor: bookmark.saved ? "#eef2ff" : "#fff",
            }}
            title={
              bookmark.saved
                ? `Saved${bookmark.savedByLabel ? ` by ${bookmark.savedByLabel}` : ""} · click to remove`
                : "Save to Saved Sites"
            }
          >
            {bookmark.busy ? (
              <Loader2 size={11} className="animate-spin" />
            ) : bookmark.saved ? (
              <BookmarkCheck size={11} />
            ) : (
              <Bookmark size={11} />
            )}
            {bookmark.saved ? "Saved" : "Save"}
          </button>
        )}
        <button
          type="button"
          onClick={onRerun}
          disabled={slot.status === "loading"}
          className="inline-flex items-center gap-1 whitespace-nowrap rounded border px-2 py-1 text-[11px] font-semibold leading-none disabled:opacity-50"
          style={{ borderColor: BORDER, color: BLUE }}
          title="Re-run the live engine with these exact inputs"
        >
          {slot.status === "loading" && <Loader2 size={11} className="animate-spin" />}
          {slot.status === "loading" ? "Running…" : "↻ Re-run"}
        </button>
        {onReplace && (
          <button
            type="button"
            onClick={onReplace}
            className="inline-flex items-center whitespace-nowrap rounded border px-2 py-1 text-[11px] font-semibold leading-none"
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
            className="inline-flex items-center whitespace-nowrap rounded border px-2 py-1 text-[11px] font-semibold leading-none"
            style={{ borderColor: BORDER, color: MUTED }}
            title="Remove this candidate from the comparison"
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

      {/* One-liner summary — fixed height so cards align */}
      {recomputed && (
        <p
          className="mt-3 text-[12px]"
          style={{
            color: NAVY,
            minHeight: 36,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
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

      {/* Source-trust UI: chip strip + degraded banner */}
      {recomputed && <DataSourcesStrip provenance={slot.result?.signals?.provenance} />}
      {recomputed && <DegradedBanner provenance={slot.result?.signals?.provenance} />}

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
          <PillarBar label="Neighborhood Affluence" weight={0.25} value={recomputed.pillars.affluence} showFormula={showFormulas} detail={`0.6 × medianHHI_norm(${fmtMoney(slot.result?.signals?.acs10?.medianHhi)}) + 0.4 × pctAbove150k_norm(${fmtPct(slot.result?.signals?.acs10?.pctAbove150k)}) = ${recomputed.pillars.affluence}`} />
          <PillarBar label="Family Density" weight={0.2} value={recomputed.pillars.familyDensity} showFormula={showFormulas} detail={`children5-12 / totalPop × scale → ${fmtCount(slot.result?.signals?.acs15?.children5to12)} / ${fmtCount(slot.result?.signals?.acs15?.totalPop)} = ${recomputed.pillars.familyDensity}`} />
          <PillarBar label="School Ecosystem" weight={0.15} value={recomputed.pillars.ecosystem} showFormula={showFormulas} detail={`elementaryCount(${slot.result?.signals?.ecosystem?.elementaryCount ?? "—"}) + privateCount(${slot.result?.signals?.ecosystem?.privateCount ?? "—"}) weighted by nearbyStudentPop = ${recomputed.pillars.ecosystem}`} />
          <PillarBar label="Accessibility" weight={0.15} value={recomputed.pillars.accessibility} showFormula={showFormulas} detail={`0.3 × roadFactor(${fmtMi(slot.result?.signals?.accessibility?.roadDistanceMi)}) + 0.3 × hwyFactor(${fmtMi(slot.result?.signals?.accessibility?.highwayDistanceMi)}) + 0.4 × popReachable_norm(${fmtCount(slot.result?.signals?.acs15?.totalPop)}) = ${recomputed.pillars.accessibility}`} />
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

function Tile({
  label,
  value,
  dash,
  dashTip,
  badge,
  source,
}: {
  label: string;
  value?: string;
  dash?: boolean;
  dashTip?: string;
  badge?: string;
  source?: SourceMeta | null;
}) {
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
        <div className="flex items-center gap-1">
          {badge && (
            <span className="rounded-full px-1 py-px text-[8px] font-bold uppercase" style={{ backgroundColor: "#dde7ff", color: BLUE }}>
              {badge}
            </span>
          )}
          {source && <InfoSource source={source} />}
        </div>
      </div>
      <div className="text-[13px] font-bold tabular-nums" style={{ color: dash ? MUTED : NAVY }}>
        {dash ? "—" : value ?? "—"}
      </div>
    </div>
  );
}

// Formatters now imported from @/lib/sas/formatters (top of file) so the
// page and the PDF brief render every value identically.



function MetricTiles({ signals }: { signals?: SiteScoreSignals }) {
  const acs10 = signals?.acs10 ?? {};
  const acs15 = signals?.acs15 ?? {};
  const hwyMi = signals?.accessibility?.highwayDistanceMi;
  const roadMi = signals?.accessibility?.roadDistanceMi;
  const prov = signals?.provenance;
  return (
    <div className="mt-3 grid grid-cols-3 gap-1.5">
      <Tile label="Median HHI · 10m" value={fmtMoney(acs10.medianHhi)} source={prov?.affluence} />
      <Tile label="Median HHI · 15m" value={fmtMoney(acs15.medianHhi)} source={prov?.affluence} />
      <Tile label="HH >$150k · 10m" value={fmtPct(acs10.pctAbove150k)} source={prov?.affluence} />
      <Tile label="Kids 5-12 · 10m" value={fmtCount(acs10.children5to12, "children")} source={prov?.familyDensity} />
      <Tile label="Pop · 15m" value={fmtCount(acs15.totalPop, "people")} source={prov?.popReachable} />
      <Tile
        label="Drive to hwy"
        value={fmtMi(hwyMi)}
        dash={hwyMi == null}
        dashTip="No motorway/trunk found within 12 mi — Accessibility scored via fallback"
        source={prov?.accessibilityHwy ?? prov?.accessibility}
      />
      <Tile
        label="Drive to road"
        value={fmtMi(roadMi)}
        dash={roadMi == null}
        source={prov?.accessibilityRoad ?? prov?.accessibility}
      />
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
              value >= SITE_CONFIDENCE_THRESHOLDS.strong
                ? "#1d6b32"
                : value >= SITE_CONFIDENCE_THRESHOLDS.high
                ? "#2f7a3f"
                : value >= SITE_CONFIDENCE_THRESHOLDS.medium
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
// Confidence summary (read live)
// ---------------------------------------------------------------------------

interface ScoredCandidate {
  candidate: Candidate;
  result: SiteScoreResult | null;
  composite: number | null;
}

function DecisionSummary({
  scored,
  byAddress,
}: {
  scored: ScoredCandidate[];
  byAddress: Map<string, { verdict: SiteVerdict; notes: string }>;
}) {
  return (
    <section className="mb-6 rounded-lg border bg-white p-4" style={{ borderColor: BORDER }}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[13px] font-bold" style={{ color: NAVY }}>
          User Confidence summary
        </h3>
        <span className="text-[10px] uppercase tracking-wide" style={{ color: MUTED }}>
          Goes into the site report export
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ color: MUTED }}>
              <th className="py-1 text-left font-semibold">Site</th>
              <th className="py-1 text-right font-semibold">Score</th>
              <th className="py-1 text-left font-semibold">User Confidence</th>
              <th className="py-1 text-left font-semibold">Note</th>
            </tr>
          </thead>
          <tbody>
            {scored.map((s) => {
              const d = byAddress.get(s.candidate.address);
              const v = (d?.verdict ?? "undecided") as SiteVerdict;
              const vs = safeVerdictStyle(v);
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
  const savedSites = useSavedSites();
  const { user } = useAuth();
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [hiddenLoaded, setHiddenLoaded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState<string | null>(null);

  // Load the user's hidden-card list from profiles. Removed SAS cards stay
  // hidden across refreshes and devices until the user re-loads them from the
  // Saved Sites drawer (no API spend to bring them back).
  useEffect(() => {
    if (!user) {
      setHiddenIds([]);
      setHiddenLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("sas_hidden_ids")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setHiddenIds(((data?.sas_hidden_ids as string[] | null) ?? []));
      setHiddenLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Single debounced persist for the whole hidden list. Avoids the race where
  // 4 rapid ✕ clicks fire 4 parallel writes and an older payload wins.
  const lastPersistedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hiddenLoaded || !user) return;
    const next = JSON.stringify([...hiddenIds].sort());
    if (lastPersistedRef.current === null) {
      lastPersistedRef.current = next;
      return;
    }
    if (lastPersistedRef.current === next) return;
    const t = setTimeout(() => {
      lastPersistedRef.current = next;
      void supabase
        .from("profiles")
        .update({ sas_hidden_ids: hiddenIds })
        .eq("id", user.id);
    }, 250);
    return () => clearTimeout(t);
  }, [hiddenIds, hiddenLoaded, user]);

  const hideAnalysisId = useCallback((analysisId: string) => {
    setHiddenIds((prev) => (prev.includes(analysisId) ? prev : [...prev, analysisId]));
  }, []);

  const hideAddress = useCallback((address: string) => {
    const key = `addr:${address}`;
    setHiddenIds((prev) => (prev.includes(key) ? prev : [...prev, key]));
  }, []);

  const unhideAnalysisId = useCallback((analysisId: string) => {
    setHiddenIds((prev) => prev.filter((id) => id !== analysisId));
  }, []);

  const unhideAddress = useCallback((address: string) => {
    const key = `addr:${address}`;
    setHiddenIds((prev) => prev.filter((id) => id !== key));
  }, []);


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
          patchSlot(id, { status: "ready", result, error: null, analysisId: cached.id });
          // If the user is restoring a previously-hidden card, drop it from
          // the hidden list so refresh keeps it visible.
          unhideAnalysisId(cached.id);
          unhideAddress(slot.address.trim());
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
        const analysisId = (data as { analysis_id?: string }).analysis_id;
        patchSlot(id, { status: "ready", result: data as SiteScoreResult, error: null, analysisId });
        // Re-running an address that was previously hidden brings it back.
        if (analysisId) unhideAnalysisId(analysisId);
        unhideAddress(slot.address.trim());
      } catch (e) {
        const msg = (e as Error).message ?? "Engine call failed";
        patchSlot(id, { status: "error", error: msg });
      }
    },
    [slots, patchSlot, unhideAnalysisId],
  );

  // Hydrate from the user's most recent ready site_analyses rows (up to 4).
  // No anchor seeding — comparison cards always belong to the user. Anchors
  // live in the separate calibration panel below the Live Engine.
  useEffect(() => {
    if (!hiddenLoaded) return;
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

      const hiddenSet = new Set(hiddenIds);
      const seen = new Set<string>();
      const extras: SlotState[] = [];
      for (const row of data) {
        if (hiddenSet.has(row.id)) continue;
        if (row.address && hiddenSet.has(`addr:${row.address}`)) continue;
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
          analysisId: row.id,
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

      // No auto-seed. If the user wants Wayside (or anything) back, the Saved
      // Sites drawer has it one click away. Hydration shows only real, non-hidden
      // rows — so removed cards stay removed across refresh.

      setSlots(extras);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiddenLoaded]);

  const removeSlot = (id: string) => {
    const target = slots.find((s) => s.id === id);
    setSlots((prev) => prev.filter((s) => s.id !== id));
    // Soft-hide across refresh + devices. Prefer the analysis id when we have it;
    // fall back to address so seed/loaded cards without an id still stay hidden.
    const aid =
      target?.analysisId ??
      (id.startsWith("persisted-") ? id.replace("persisted-", "") : null);
    if (aid) hideAnalysisId(aid);
    else if (target?.address) hideAddress(target.address);
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



  const canExport = slots.length > 0;


  const emptySlots = Math.max(0, 4 - slots.length);

  const mapboxToken = useMapboxToken();
  const [exporting, setExporting] = useState(false);
  const handleExport = async (singleId?: string) => {
    setExporting(true);
    try {
      // Include EVERY visible card — scored AND un-scored. The brief renders
      // un-scored ones with "—" and a "Not yet scored" pill (Option B).
      const source = singleId ? scored.filter((s) => s.candidate.id === singleId) : scored;
      const candidates: SitePackCandidate[] = await Promise.all(
        source.map(async (s) => {
          if (!s.result) {
            // Un-scored card: pass null pillars/composite, no signals, no map.
            return {
              schoolName: s.candidate.schoolName,
              address: s.candidate.address,
              schoolTypeLabel: SCHOOL_TYPE_LABEL[s.candidate.schoolType],
              gradeBandLabel: GRADE_BAND_LABEL[s.candidate.gradeBand],
              enrollment: s.candidate.enrollment,
              pillars: null,
              composite: null,
              tierLabel: "Not yet scored",
              signals: null,
              decision: byAddress.get(s.candidate.address),
              mapPngDataUrl: null,
            };
          }
          const recomputed = recomputeSiteScores(s.result.pillars);
          const composite = recomputed.composite;
          const tier = tierBadge(composite);
          const center = s.result.geo;
          const mapUrl =
            mapboxToken && center
              ? buildStaticUrl({
                  center,
                  iso10: (s.result.iso10 as GeoJSON.Polygon | null) ?? null,
                  iso15: (s.result.iso15 as GeoJSON.Polygon | null) ?? null,
                  token: mapboxToken,
                })
              : null;
          const mapPng = await fetchMapPng(mapUrl);
          return {
            schoolName: s.candidate.schoolName,
            address: s.candidate.address,
            schoolTypeLabel: SCHOOL_TYPE_LABEL[s.candidate.schoolType],
            gradeBandLabel: GRADE_BAND_LABEL[s.candidate.gradeBand],
            enrollment: s.candidate.enrollment,
            pillars: recomputed.pillars,
            composite,
            tierLabel: tier.label,
            signals: s.result.signals ?? null,
            decision: byAddress.get(s.candidate.address),
            mapPngDataUrl: mapPng,
          };
        }),
      );

      const briefKey = `nrg-sas-brief-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const payload = { candidates, generatedAt: new Date().toISOString() };

      // Primary handoff: stash on `window` so the brief tab can read it via
      // `window.opener`. This avoids the 5 MB localStorage cap that was
      // silently dropping cards when the combined map PNGs got too big.
      const W = window as unknown as {
        __nrgSasBrief?: Map<string, typeof payload>;
      };
      if (!W.__nrgSasBrief) W.__nrgSasBrief = new Map();
      W.__nrgSasBrief.set(briefKey, payload);

      // Best-effort fallback for tab reloads (which clear `window.opener`).
      // If the payload is too big for localStorage we swallow the error —
      // the opener handoff above is the source of truth.
      try {
        localStorage.setItem(briefKey, JSON.stringify(payload));
      } catch (storageErr) {
        console.warn("SAS brief localStorage fallback skipped (too large)", storageErr);
      }

      // IMPORTANT: do NOT pass "noopener" — the brief tab needs window.opener
      // to read the payload Map.
      const win = window.open(`/sas-brief?key=${briefKey}`, "_blank");
      if (win) {
        toast.success(
          `SAS brief opened in a new tab — ${candidates.length} site${candidates.length === 1 ? "" : "s"} included. Cmd/Ctrl + P to save as PDF`,
        );
      } else {
        toast.error("Popup blocked. Allow popups and try again to open the SAS brief.");
      }
    } catch (err) {
      console.error("Site pack PDF export failed", err);
      toast.error(`PDF export failed: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setExporting(false);
    }
  };


  // Normalize all 4 cards to the same Daycare/Other/150 inputs and recompute,
  // so cross-card SAS comparison is apples-to-apples. Uses cache when an exact
  // ready row already exists for those inputs (avoids the expensive live path).
  const [normalizing, setNormalizing] = useState(false);
  const handleNormalize = async () => {
    if (!slots.length) return;
    setNormalizing(true);
    const targets = slots.map((s) => ({
      id: s.id,
      schoolName: s.schoolName,
      address: s.address,
      schoolType: "daycare" as SchoolType,
      gradeBand: "other" as GradeBand,
      enrollment: "150",
    }));
    // Patch inputs immediately so UI reflects the comparison set
    setSlots((prev) =>
      prev.map((s) => {
        const t = targets.find((x) => x.id === s.id)!;
        return { ...s, ...t, status: "loading", error: null };
      }),
    );
    for (const t of targets) {
      // Cache lookup first
      const { data: cached } = await supabase
        .from("site_analyses")
        .select(
          "id,school_profile_score,affluence_score,family_density_score,ecosystem_score,accessibility_score,sas_score,signals,latitude,longitude",
        )
        .eq("status", "ready")
        .eq("address", t.address.trim())
        .eq("school_type", t.schoolType)
        .eq("grade_band", t.gradeBand)
        .eq("enrollment", 150)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      let result: SiteScoreResult | null = null;
      if (cached && cached.school_profile_score != null) {
        result = {
          sas: Number(cached.sas_score ?? 0),
          pillars: {
            schoolProfile: Number(cached.school_profile_score),
            affluence: Number(cached.affluence_score),
            familyDensity: Number(cached.family_density_score),
            ecosystem: Number(cached.ecosystem_score),
            accessibility: Number(cached.accessibility_score),
          },
          signals: (cached.signals ?? {}) as SiteScoreSignals,
          geo:
            cached.latitude != null && cached.longitude != null
              ? { lat: Number(cached.latitude), lng: Number(cached.longitude) }
              : undefined,
        };
      } else {
        try {
          const { data, error } = await supabase.functions.invoke("compute-sas", {
            body: {
              address: t.address.trim(),
              school_name: t.schoolName.trim(),
              school_type: t.schoolType,
              enrollment: 150,
              grade_band: t.gradeBand,
            },
          });
          if (error) throw error;
          if ((data as { status?: string })?.status === "failed") {
            throw new Error((data as { error?: string }).error ?? "Engine failed");
          }
          result = data as SiteScoreResult;
        } catch (e) {
          patchSlot(t.id, { status: "error", error: (e as Error).message });
          continue;
        }
      }
      patchSlot(t.id, { status: "ready", result, error: null });
    }
    setNormalizing(false);
  };



  // Load a previously-saved site back into a card slot, then re-run the engine.
  const handleLoadSavedSite = useCallback(
    async (inputs: SavedSiteInputs) => {
      const newId = `loaded-${Date.now()}`;
      setSlots((prev) => {
        // Replace a pending slot if user clicked Replace, else append (cap 4).
        if (pendingReplaceId) {
          return prev.map((s) =>
            s.id === pendingReplaceId
              ? {
                  ...s,
                  schoolName: inputs.schoolName,
                  address: inputs.address,
                  schoolType: inputs.schoolType,
                  gradeBand: inputs.gradeBand,
                  enrollment: inputs.enrollment,
                  status: "loading",
                  result: null,
                  error: null,
                }
              : s,
          );
        }
        if (prev.length >= 4) {
          toast.error("All 4 slots are full. Remove one first.");
          return prev;
        }
        return [
          ...prev,
          {
            id: newId,
            schoolName: inputs.schoolName,
            address: inputs.address,
            schoolType: inputs.schoolType,
            gradeBand: inputs.gradeBand,
            enrollment: inputs.enrollment,
            status: "loading",
            result: null,
            error: null,
          },
        ];
      });
      setPendingReplaceId(null);
      // The runSlot effect needs the slot to exist; defer by a tick.
      setTimeout(() => {
        runSlot(pendingReplaceId ?? newId, { preferCache: true });
      }, 0);
    },
    [pendingReplaceId, runSlot],
  );

  const handleToggleBookmark = useCallback(
    async (slot: SlotState) => {
      if (!slot.result) return;
      const lat = slot.result.geo?.lat ?? null;
      const lng = slot.result.geo?.lng ?? null;
      const existing = savedSites.findSaved(lat, lng, slot.schoolType);
      setBookmarkBusy(slot.id);
      try {
        if (existing) {
          if (existing.user_id !== savedSites.currentUserId) {
            toast.error(`Saved by ${existing.saver_name ?? "teammate"} — only they can remove it.`);
            return;
          }
          await savedSites.removeSite(existing.id);
          toast.success("Removed from Saved Sites");
        } else {
          const recomputed = recomputeSiteScores(slot.result.pillars);
          await savedSites.addSite(
            {
              schoolName: slot.schoolName,
              address: slot.address,
              schoolType: slot.schoolType,
              gradeBand: slot.gradeBand,
              enrollment: slot.enrollment,
              lat,
              lng,
            },
            {
              pillars: recomputed.pillars,
              composite: recomputed.composite,
            },
          );
          toast.success("Saved to Saved Sites");
        }
      } catch (e) {
        toast.error(`Couldn't update: ${(e as Error).message}`);
      } finally {
        setBookmarkBusy(null);
      }
    },
    [savedSites],
  );


  return (
    <>
      <SavedSitesDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onLoad={handleLoadSavedSite}
        savedSites={savedSites}
      />
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
          <div className="min-w-0 flex-1">
            <div>
              <button
                type="button"
                onClick={handleNormalize}
                disabled={normalizing || slots.length === 0}
                title="Re-score all cards with the same inputs (Daycare · Other · enrollment 150) for an apples-to-apples comparison"
                className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                style={{ borderColor: BORDER, color: NAVY, backgroundColor: "#fff" }}
              >
                {normalizing ? "Normalizing…" : "⇋ Normalize inputs (Daycare · Other · 150)"}
              </button>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 ml-auto">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold"
                style={{ borderColor: BORDER, color: NAVY, backgroundColor: "#fff" }}
                title="Open Saved Sites drawer"
              >
                <Bookmark size={12} style={{ color: BLUE }} />
                Saved Sites
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                  style={{ backgroundColor: "#eef2ff", color: BLUE }}
                >
                  {savedSites.rows.length}
                </span>
              </button>
              <div className="inline-flex items-stretch rounded-md border overflow-hidden" style={{ borderColor: BLUE }}>
                <button
                  type="button"
                  onClick={() => handleExport()}
                  disabled={!canExport || exporting}
                  title={
                    canExport
                      ? "Export every visible card. Un-scored cards appear as '—' with a 'Not yet scored' pill."
                      : "Add at least one candidate to enable export"
                  }
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ color: BLUE, backgroundColor: "#fff" }}
                >
                  {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  {exporting ? "Generating PDF…" : "Export Site Report (PDF)"}
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      disabled={!canExport || exporting}
                      title="Export one specific site"
                      className="inline-flex items-center px-1.5 py-1.5 border-l disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ borderColor: BLUE, color: BLUE, backgroundColor: "#fff" }}
                    >
                      <ChevronDown size={14} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel className="text-[11px]">Download one site</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {slots.map((s) => (
                      <DropdownMenuItem
                        key={s.id}
                        onClick={() => handleExport(s.id)}
                        className="text-[12px] gap-2"
                      >
                        <Download size={12} style={{ color: BLUE }} />
                        <span className="flex-1 truncate">{s.schoolName}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {!canExport && (
              <p className="text-[10px]" style={{ color: MUTED }}>
                Add at least one candidate to enable export.
              </p>
            )}
          </div>
        </div>




        <div
          className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md p-2 text-[11px]"
          style={{ backgroundColor: SOFT }}
        >
          <span className="whitespace-nowrap font-semibold" style={{ color: NAVY }}>
            User Confidence bands:
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#1d6b32" }} />
            <span style={{ color: NAVY }}>≥{SITE_CONFIDENCE_THRESHOLDS.strong} Strong</span>
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#2f7a3f" }} />
            <span style={{ color: NAVY }}>
              {SITE_CONFIDENCE_THRESHOLDS.high}–{SITE_CONFIDENCE_THRESHOLDS.strong - 1} High
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#925100" }} />
            <span style={{ color: NAVY }}>
              {SITE_CONFIDENCE_THRESHOLDS.medium}–{SITE_CONFIDENCE_THRESHOLDS.high - 1} Medium
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#a3142b" }} />
            <span style={{ color: NAVY }}>&lt;{SITE_CONFIDENCE_THRESHOLDS.medium} Low</span>
          </span>
          <span className="text-[10px]" style={{ color: MUTED }}>
            Bands are score-based suggestions. Your <strong>User Confidence</strong> selection on each card is what ships in the export. Final decisions stay with the user.
          </span>
        </div>
      </section>



      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {slots.map((s) => {
          const lat = s.result?.geo?.lat ?? null;
          const lng = s.result?.geo?.lng ?? null;
          const existing = s.result ? savedSites.findSaved(lat, lng, s.schoolType) : null;
          const bookmark = {
            saved: !!existing,
            isMine: existing?.user_id === savedSites.currentUserId,
            savedByLabel:
              existing && existing.user_id !== savedSites.currentUserId
                ? existing.saver_name ?? existing.saver_email ?? "teammate"
                : null,
            busy: bookmarkBusy === s.id,
            onToggle: () => handleToggleBookmark(s),
          };
          return (
            <CandidateCard
              key={s.id}
              slot={s}
              onRerun={() => runSlot(s.id)}
              onRemove={() => removeSlot(s.id)}
              onReplace={() => {
                setPendingReplaceId(s.id);
                if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              bookmark={bookmark}
            />
          );
        })}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <EmptySlot key={`empty-${i}`} />
        ))}
      </section>

      <DecisionSummary scored={scored} byAddress={byAddress} />
    </>
  );
}

