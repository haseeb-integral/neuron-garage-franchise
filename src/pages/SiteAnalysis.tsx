import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  Download,
  Info,
  Loader2,
  MapPin,
  Plus,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSavedSites, type SavedSiteRow } from "@/hooks/useSavedSites";
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
  montessori_elementary: "Montessori elementary",
  montessori_preschool: "Montessori pre-school",
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
  /** Run timestamp of the underlying site_analyses row (ISO). */
  analysisCreatedAt?: string;
  /** True when this slot's result was rehydrated from a Saved Sites snapshot (no live recompute). */
  fromSnapshot?: boolean;
  /** Saved snapshot timestamp (ISO) shown next to the "Saved snapshot" label. */
  snapshotCreatedAt?: string;
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
  savedMatch?: SavedSiteRow | null;
}

const RUN_FMT = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
function formatRunTime(iso: string) {
  try {
    return RUN_FMT.format(new Date(iso));
  } catch {
    return iso;
  }
}

function WhyDifferentChip({
  slot,
  composite,
  savedMatch,
}: {
  slot: SlotState;
  composite: number | null;
  savedMatch: SavedSiteRow;
}) {
  const snap = savedMatch.snapshot_json ?? {};
  const savedComposite =
    snap.pillars ? recomputeSiteScores(snap.pillars).composite : snap.composite ?? null;
  const savedType = (savedMatch.site_type ?? "") as SchoolType;
  const savedGrade = (savedMatch.grade_band ?? "") as GradeBand;
  const savedEnroll = savedMatch.enrollment != null ? String(savedMatch.enrollment) : "";

  const diffs: { label: string; card: string; saved: string }[] = [];
  if (savedType && savedType !== slot.schoolType) {
    diffs.push({
      label: "School type",
      card: SCHOOL_TYPE_LABEL[slot.schoolType] ?? String(slot.schoolType),
      saved: SCHOOL_TYPE_LABEL[savedType] ?? String(savedType),
    });
  }
  if (savedGrade && savedGrade !== slot.gradeBand) {
    diffs.push({
      label: "Grade band",
      card: GRADE_BAND_LABEL[slot.gradeBand] ?? String(slot.gradeBand),
      saved: GRADE_BAND_LABEL[savedGrade] ?? String(savedGrade),
    });
  }
  if (savedEnroll !== slot.enrollment) {
    diffs.push({
      label: "Enrollment",
      card: slot.enrollment || "—",
      saved: savedEnroll || "—",
    });
  }
  if (composite != null && savedComposite != null && composite !== savedComposite) {
    diffs.push({
      label: "Composite",
      card: String(composite),
      saved: String(savedComposite),
    });
  }
  if (slot.analysisCreatedAt) {
    diffs.push({
      label: "Run date",
      card: formatRunTime(slot.analysisCreatedAt),
      saved: formatRunTime(savedMatch.created_at),
    });
  }

  if (diffs.length === 0) return null;

  const cardPillars = slot.result?.pillars;
  const savedPillars = snap.pillars;
  const pillarRows: { label: string; card: string; saved: string }[] = [];
  if (cardPillars && savedPillars) {
    const keys: [keyof typeof cardPillars, string][] = [
      ["schoolProfile", "School profile"],
      ["affluence", "Affluence"],
      ["familyDensity", "Family density"],
      ["ecosystem", "Ecosystem"],
      ["accessibility", "Accessibility"],
    ];
    for (const [k, label] of keys) {
      const a = Number(cardPillars[k]);
      const b = Number(savedPillars[k]);
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      if (Math.abs(a - b) >= 0.01) {
        pillarRows.push({ label, card: a.toFixed(2), saved: b.toFixed(2) });
      }
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="mt-1 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
          style={{ borderColor: "#f0c869", backgroundColor: "#fff8d9", color: "#7a5800" }}
          title="The saved snapshot for this address used different inputs"
        >
          Why different from saved?
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3 text-[11px]">
        <div className="font-bold" style={{ color: "#07142f" }}>
          Card vs saved snapshot
        </div>
        <div className="mt-0.5" style={{ color: "#526078" }}>
          Same address, different run. Inputs and formula version change the score.
        </div>
        <table className="mt-2 w-full">
          <thead>
            <tr style={{ color: "#526078" }}>
              <th className="py-1 text-left font-semibold">Field</th>
              <th className="py-1 text-right font-semibold">Card</th>
              <th className="py-1 text-right font-semibold">Saved</th>
            </tr>
          </thead>
          <tbody>
            {diffs.map((d) => (
              <tr key={d.label} className="border-t" style={{ borderColor: "#eef2f7" }}>
                <td className="py-1" style={{ color: "#07142f" }}>{d.label}</td>
                <td className="py-1 text-right tabular-nums" style={{ color: "#07142f" }}>{d.card}</td>
                <td className="py-1 text-right tabular-nums" style={{ color: "#526078" }}>{d.saved}</td>
              </tr>
            ))}
            {pillarRows.length > 0 && (
              <>
                <tr>
                  <td colSpan={3} className="pt-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#526078" }}>
                    Pillar differences
                  </td>
                </tr>
                {pillarRows.map((d) => (
                  <tr key={d.label} className="border-t" style={{ borderColor: "#eef2f7" }}>
                    <td className="py-1" style={{ color: "#07142f" }}>{d.label}</td>
                    <td className="py-1 text-right tabular-nums" style={{ color: "#07142f" }}>{d.card}</td>
                    <td className="py-1 text-right tabular-nums" style={{ color: "#526078" }}>{d.saved}</td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
        <p className="mt-2 text-[10px]" style={{ color: "#526078" }}>
          To see the saved score on the card, click <strong>Load into card</strong> in Saved Sites.
        </p>
      </PopoverContent>
    </Popover>
  );
}

function CandidateCard({ slot, onRerun, onRemove, onReplace, bookmark, savedMatch }: CardPropsExt) {
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
          <p className="mt-1 text-[10px]" style={{ color: MUTED, wordBreak: "break-word" }}>
            {SCHOOL_TYPE_LABEL[slot.schoolType]} · {GRADE_BAND_LABEL[slot.gradeBand]}
            {slot.enrollment ? ` · enroll ${slot.enrollment}` : ""}
            {slot.analysisCreatedAt ? ` · run ${formatRunTime(slot.analysisCreatedAt)}` : ""}
          </p>
          {slot.fromSnapshot && slot.snapshotCreatedAt ? (
            <p className="mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: "#fef3c7", color: "#92400e" }} title="This score was loaded from Saved Sites. Click Re-run for a fresh live computation.">
              Saved snapshot · {formatRunTime(slot.snapshotCreatedAt)}
            </p>
          ) : null}
          {savedMatch && slot.result && !slot.fromSnapshot ? (
            <WhyDifferentChip slot={slot} composite={composite} savedMatch={savedMatch} />
          ) : null}
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
              {recomputed && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-[10px] font-semibold underline"
                      style={{ color: BLUE }}
                      title="See how the composite is weighted"
                    >
                      <Info size={10} /> Show formula
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-72 text-[11px]" style={{ color: NAVY }}>
                    <div className="mb-2 font-bold uppercase tracking-wide" style={{ fontSize: 10, color: MUTED }}>
                      Composite formula
                    </div>
                    <p className="mb-2" style={{ color: MUTED }}>
                      Each sub-score (0–100) is multiplied by its weight, then added up.
                    </p>
                    <table className="w-full tabular-nums">
                      <thead>
                        <tr style={{ color: MUTED }}>
                          <th className="text-left font-semibold">Pillar</th>
                          <th className="text-right font-semibold">Weight</th>
                          <th className="text-right font-semibold">Score</th>
                          <th className="text-right font-semibold">Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: "School Profile", w: 0.25, v: recomputed.pillars.schoolProfile },
                          { label: "Neighborhood Affluence", w: 0.25, v: recomputed.pillars.affluence },
                          { label: "Family Density", w: 0.20, v: recomputed.pillars.familyDensity },
                          { label: "School Ecosystem", w: 0.15, v: recomputed.pillars.ecosystem },
                          { label: "Accessibility", w: 0.15, v: recomputed.pillars.accessibility },
                        ].map((row) => (
                          <tr key={row.label}>
                            <td className="py-0.5">{row.label}</td>
                            <td className="py-0.5 text-right">{Math.round(row.w * 100)}%</td>
                            <td className="py-0.5 text-right">{row.v}</td>
                            <td className="py-0.5 text-right font-semibold">{(row.w * row.v).toFixed(1)}</td>
                          </tr>
                        ))}
                        <tr style={{ borderTop: `1px solid ${BORDER}` }}>
                          <td className="pt-1 font-bold" colSpan={3}>Composite</td>
                          <td className="pt-1 text-right font-bold" style={{ color: NAVY }}>{recomputed.composite}</td>
                        </tr>
                      </tbody>
                    </table>
                  </PopoverContent>
                </Popover>
              )}
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
          <PillarBar label="School Profile" weight={0.25} value={recomputed.pillars.schoolProfile} showFormula={showFormulas} detail={`f(type=${SCHOOL_TYPE_LABEL[slot.schoolType]}, grade=${GRADE_BAND_LABEL[slot.gradeBand]}, enroll=${slot.enrollment || "—"}) = ${recomputed.pillars.schoolProfile}`} tip="How good the host school is for a camp. Looks at school type (public/private/charter), grade band (elementary is best), and how many students go there. Bigger, elementary schools score higher." />
          <PillarBar label="Neighborhood Affluence" weight={0.25} value={recomputed.pillars.affluence} showFormula={showFormulas} detail={`0.6 × medianHHI_norm(${fmtMoney(slot.result?.signals?.acs10?.medianHhi)}) + 0.4 × pctAbove150k_norm(${fmtPct(slot.result?.signals?.acs10?.pctAbove150k)}) = ${recomputed.pillars.affluence}`} tip="How much money families near the school make. Combines median household income with the share of homes earning over $150k. Wealthier areas can afford premium camp prices." />
          <PillarBar label="Family Density" weight={0.2} value={recomputed.pillars.familyDensity} showFormula={showFormulas} detail={`children5-12 / totalPop × scale → ${fmtCount(slot.result?.signals?.acs15?.children5to12)} / ${fmtCount(slot.result?.signals?.acs15?.totalPop)} = ${recomputed.pillars.familyDensity}`} tip="How many kids aged 5–12 live near the school, compared to the total population. More kids in the area means more potential campers." />
          <PillarBar label="School Ecosystem" weight={0.15} value={recomputed.pillars.ecosystem} showFormula={showFormulas} detail={`elementaryCount(${slot.result?.signals?.ecosystem?.elementaryCount ?? "—"}) + privateCount(${slot.result?.signals?.ecosystem?.privateCount ?? "—"}) weighted by nearbyStudentPop = ${recomputed.pillars.ecosystem}`} tip="How many other elementary and private schools sit near this site. More nearby schools mean a bigger pool of families we can reach, not just the host school." />
          <PillarBar label="Accessibility" weight={0.15} value={recomputed.pillars.accessibility} showFormula={showFormulas} detail={`0.3 × roadFactor(${fmtMi(slot.result?.signals?.accessibility?.roadDistanceMi)}) + 0.3 × hwyFactor(${fmtMi(slot.result?.signals?.accessibility?.highwayDistanceMi)}) + 0.4 × popReachable_norm(${fmtCount(slot.result?.signals?.acs15?.totalPop)}) = ${recomputed.pillars.accessibility}`} tip="How easy it is for parents to reach the site. Looks at distance to major roads, distance to a highway, and how many people live in an easy drive. Closer to roads and more people nearby scores higher." />

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
      <Tile label="HH >$200k · 10m" value={fmtPct(acs10.pctAbove200k)} source={prov?.affluence} />
      <Tile label="HH >$200k · 10m (count)" value={fmtCount(acs10.hhAbove200k)} source={prov?.affluence} />
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
  tip,
}: {
  label: string;
  weight: number;
  value: number;
  showFormula?: boolean;
  detail?: string;
  tip?: string;
}) {
  const contribution = +(weight * value).toFixed(1);
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="inline-flex items-center gap-1" style={{ color: MUTED }}>
          {label} <span className="text-[9px]">({Math.round(weight * 100)}%)</span>
          {tip && (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`What does ${label} measure?`}
                    className="inline-flex items-center text-[#8a95a8] hover:text-[#07142f] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#07142f] rounded"
                  >
                    <Info size={11} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[260px] text-[11px] leading-relaxed">
                  {tip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
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

function EmptySlot({
  onLoadFromSaved,
  onComputeNew,
}: {
  onLoadFromSaved: () => void;
  onComputeNew: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center"
      style={{ borderColor: BORDER, color: MUTED, minHeight: 540 }}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Add a site to this slot"
            className="flex h-9 w-9 items-center justify-center rounded-full transition hover:brightness-95"
            style={{ backgroundColor: SOFT, color: BLUE }}
          >
            <Plus size={18} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="center" className="w-56 p-1">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onLoadFromSaved();
            }}
            className="block w-full rounded px-3 py-2 text-left text-[12px] font-medium hover:bg-slate-100"
            style={{ color: NAVY }}
          >
            Load from saved sites
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onComputeNew();
            }}
            className="block w-full rounded px-3 py-2 text-left text-[12px] font-medium hover:bg-slate-100"
            style={{ color: NAVY }}
          >
            Compute a new site
          </button>
        </PopoverContent>
      </Popover>
      <div className="mt-2 text-[12px] font-semibold" style={{ color: NAVY }}>
        Empty slot
      </div>
      <p className="mt-1 max-w-[200px] text-[11px]">
        Click <strong>+</strong> to load a saved site or compute a new one in the
        <strong> Live Site Analysis Engine</strong> above.
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
  const [slots, setSlots] = useState<SlotState[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.sessionStorage.getItem("sas_slots_v1");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as SlotState[]) : [];
    } catch {
      return [];
    }
  });
  // Persist current slots to sessionStorage so tab navigation (e.g. MVS → SAS)
  // does not wipe the user's loaded cards. Cleared on tab close.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem("sas_slots_v1", JSON.stringify(slots));
    } catch {
      // Quota or serialization error — ignore; slots stay in memory.
    }
  }, [slots]);
  // Mirror of `slots` for use inside callbacks that need the latest value
  // without re-creating themselves on every slot change (fixes stale-closure
  // bugs where runSlot would silently return because the just-added slot
  // wasn't yet visible in its captured `slots`).
  const slotsRef = useRef<SlotState[]>([]);
  useEffect(() => { slotsRef.current = slots; }, [slots]);
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

  // Stuck-card watchdog. If a slot stays in "loading" for more than 120s
  // (e.g. page refreshed mid-run, or compute-sas hung silently), flip it
  // to "error" with a clear message so the user isn't stranded on a
  // spinner forever. The 90s timeout inside runSlot covers live runs;
  // this covers everything else (normalize, stale state, etc).
  const loadingStartedAtRef = useRef<Record<string, number>>({});
  useEffect(() => {
    const now = Date.now();
    const tracked = loadingStartedAtRef.current;
    const liveIds = new Set<string>();
    for (const s of slots) {
      if (s.status === "loading") {
        liveIds.add(s.id);
        if (tracked[s.id] == null) tracked[s.id] = now;
      }
    }
    for (const id of Object.keys(tracked)) {
      if (!liveIds.has(id)) delete tracked[id];
    }
    if (liveIds.size === 0) return;
    const timer = setInterval(() => {
      const t = Date.now();
      for (const id of Object.keys(loadingStartedAtRef.current)) {
        if (t - loadingStartedAtRef.current[id] > 120_000) {
          delete loadingStartedAtRef.current[id];
          patchSlot(id, {
            status: "error",
            error: "This run got stuck. Click Re-run, or load again from Saved Sites.",
          });
        }
      }
    }, 10_000);
    return () => clearInterval(timer);
  }, [slots, patchSlot]);

  const runSlot = useCallback(
    async (id: string, opts?: { preferCache?: boolean }) => {
      const slot = slotsRef.current.find((s) => s.id === id);
      if (!slot) {
        console.warn("[SiteAnalysis] runSlot called with unknown slot id:", id);
        return;
      }
      if (!slot.address.trim() || !slot.schoolName.trim()) {
        patchSlot(id, { status: "error", error: "School name and address are required." });
        return;
      }
      patchSlot(id, { status: "loading", error: null, fromSnapshot: false });

      // Exact-input cache lookup — avoid an expensive live recompute
      // (Mapbox geocode + isochrones + Census + Urban Institute + OSM) when
      // a recent ready row already matches address + type + enrollment + grade.
      if (opts?.preferCache) {
        const enrollmentNum = slot.enrollment ? Number(slot.enrollment) : null;
        const { data: cached } = await supabase
          .from("site_analyses")
          .select(
            "id,school_profile_score,affluence_score,family_density_score,ecosystem_score,accessibility_score,sas_score,signals,latitude,longitude,created_at",
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
          patchSlot(id, { status: "ready", result, error: null, analysisId: cached.id, analysisCreatedAt: (cached as { created_at?: string }).created_at, fromSnapshot: false });
          // If the user is restoring a previously-hidden card, drop it from
          // the hidden list so refresh keeps it visible.
          unhideAnalysisId(cached.id);
          unhideAddress(slot.address.trim());
          return;
        }
      }


      try {
        // Hard timeout so a hung edge function can't leave the card spinning
        // forever. compute-sas typically finishes well under 60s.
        const TIMEOUT_MS = 90_000;
        const invokePromise = supabase.functions.invoke("compute-sas", {
          body: {
            address: slot.address.trim(),
            school_name: slot.schoolName.trim(),
            school_type: slot.schoolType,
            enrollment: slot.enrollment ? Number(slot.enrollment) : null,
            grade_band: slot.gradeBand,
          },
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Engine timed out after ${TIMEOUT_MS / 1000}s — try Re-run.`)), TIMEOUT_MS),
        );
        const { data, error } = await Promise.race([invokePromise, timeoutPromise]) as Awaited<typeof invokePromise>;
        if (error) throw error;
        if ((data as { status?: string })?.status === "failed") {
          throw new Error((data as { error?: string }).error ?? "Engine failed");
        }
        const analysisId = (data as { analysis_id?: string }).analysis_id;
        patchSlot(id, { status: "ready", result: data as SiteScoreResult, error: null, analysisId, analysisCreatedAt: new Date().toISOString(), fromSnapshot: false });
        // Re-running an address that was previously hidden brings it back.
        if (analysisId) unhideAnalysisId(analysisId);
        unhideAddress(slot.address.trim());
      } catch (e) {
        const msg = (e as Error).message ?? "Engine call failed";
        patchSlot(id, { status: "error", error: msg });
      }
    },
    [patchSlot, unhideAnalysisId, unhideAddress],
  );

  // No auto-hydrate from site_analyses on refresh. Old analysis history was
  // refilling the cards (e.g. Trinity + LeafSpring kept coming back after the
  // user removed them). Cards now only appear when the user explicitly:
  //  - runs a new score in the Live Engine card and clicks "Add as card", or
  //  - loads a site from the Saved Sites drawer, or
  //  - clicks Re-run on an existing card.
  // Refresh = 4 empty slots unless the user already added something this session.


  const removeSlot = (id: string) => {
    const target = slots.find((s) => s.id === id);
    setSlots((prev) => prev.filter((s) => s.id !== id));
    // Soft-hide across refresh + devices. Hide BOTH the exact analysis row and
    // the address. There can be many ready site_analyses rows for the same
    // address. If we only hide the newest row, refresh can bring back an older
    // row and make the removed card appear again.
    const aid =
      target?.analysisId ??
      (id.startsWith("persisted-") ? id.replace("persisted-", "") : null);
    const addressKey = target?.address ? `addr:${target.address}` : null;
    const keysToHide = [aid, addressKey].filter((v): v is string => Boolean(v));
    if (keysToHide.length === 0) return;
    if (aid) hideAnalysisId(aid);
    if (target?.address) hideAddress(target.address);
    // Persist immediately so a fast refresh cannot cancel the debounced write.
    if (user) {
      const nextHidden = Array.from(new Set([...hiddenIds, ...keysToHide]));
      const sig = JSON.stringify([...nextHidden].sort());
      lastPersistedRef.current = sig;
      void supabase
        .from("profiles")
        .update({ sas_hidden_ids: nextHidden })
        .eq("id", user.id);
    }
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





  // Load a previously-saved site back into a card slot. Shows the saved
  // snapshot instantly (no auto re-run) — user can click "Re-run" to refresh.
  const handleLoadSavedSite = useCallback(
    async (row: SavedSiteRow) => {
      const inputs = row.inputs_json;
      const snap = row.snapshot_json ?? {};
      // Build a SiteScoreResult from the saved snapshot so the card renders
      // immediately. The map/isochrones won't be present (they aren't stored
      // in the snapshot) — user can click Re-run to fetch fresh.
      // Prefer signals stored inline with the snapshot. For older saves that
      // don't include signals, fall back to the most recent cached row in
      // site_analyses for the same lat/lng/site_type so the metric tiles and
      // map render instead of showing empty boxes.
      let hydratedSignals: SiteScoreSignals | undefined =
        (snap as { signals?: SiteScoreSignals }).signals ?? undefined;
      let hydratedIso10: GeoJSON.Polygon | undefined;
      let hydratedIso15: GeoJSON.Polygon | undefined;
      let cachedAnalysisId: string | null = null;
      if (row.lat != null && row.lng != null && row.site_type) {
        try {
          const { data: cached } = await supabase
            .from("site_analyses")
            .select("id,signals,latitude,longitude,school_type,created_at")
            .eq("status", "ready")
            .eq("school_type", row.site_type)
            .eq("latitude", Number(row.lat))
            .eq("longitude", Number(row.lng))
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (cached?.id) cachedAnalysisId = cached.id as string;
          if (!hydratedSignals && cached?.signals) {
            hydratedSignals = cached.signals as SiteScoreSignals;
          }
        } catch {
          // Non-fatal — card still shows pillars/composite.
        }
      }
      if (cachedAnalysisId) {
        try {
          const { data: isoRows } = await supabase
            .from("site_analysis_isochrones")
            .select("minutes,geojson")
            .eq("analysis_id", cachedAnalysisId)
            .in("minutes", [10, 15]);
          for (const r of isoRows ?? []) {
            const poly = r.geojson as unknown as GeoJSON.Polygon;
            if (r.minutes === 10) hydratedIso10 = poly;
            else if (r.minutes === 15) hydratedIso15 = poly;
          }
        } catch {
          // Non-fatal — map will fall back to pin-only.
        }
      }

      const snapshotResult: SiteScoreResult | null = snap.pillars
        ? {
            sas: Number(snap.composite ?? 0),
            pillars: snap.pillars,
            signals: hydratedSignals,
            iso10: hydratedIso10,
            iso15: hydratedIso15,
            geo:
              row.lat != null && row.lng != null
                ? { lat: Number(row.lat), lng: Number(row.lng) }
                : undefined,
          }
        : null;

      const baseSlot = {
        schoolName: inputs.schoolName,
        address: inputs.address,
        schoolType: inputs.schoolType,
        gradeBand: inputs.gradeBand,
        enrollment: inputs.enrollment,
        status: (snapshotResult ? "ready" : "idle") as SlotStatus,
        result: snapshotResult,
        error: null,
        fromSnapshot: snapshotResult != null,
        snapshotCreatedAt: row.created_at,
        analysisCreatedAt: undefined,
        analysisId: undefined,
      };

      setSlots((prev) => {
        if (pendingReplaceId) {
          return prev.map((s) =>
            s.id === pendingReplaceId ? { ...s, ...baseSlot } : s,
          );
        }
        if (prev.length >= 4) {
          toast.error("All 4 slots are full. Remove one first.");
          return prev;
        }
        return [
          ...prev,
          { id: `loaded-${Date.now()}`, ...baseSlot },
        ];
      });
      setPendingReplaceId(null);
      if (!snapshotResult) {
        toast.error("Saved snapshot is empty — click Re-run to compute a fresh score.");
      }
    },
    [pendingReplaceId],
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
              signals: slot.result.signals ?? undefined,
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
        <div id="sas-live-engine">
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
        </div>
      )}

      {/* Formula + thresholds */}
      <section className="mb-4 rounded-lg border bg-white p-4" style={{ borderColor: BORDER }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1" />

          <div className="flex flex-col items-end gap-1 ml-auto">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border-[1.5px] px-3.5 py-2 text-[13px] font-bold transition hover:bg-[#eef4ff]"
                style={{ borderColor: BLUE, color: BLUE, backgroundColor: "#fff" }}
                title="Open Saved Sites drawer"
              >
                <Bookmark size={15} style={{ color: BLUE }} />
                Saved Sites
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                  style={{ backgroundColor: BLUE, color: "#fff" }}
                >
                  {savedSites.rows.length}
                </span>
              </button>
              <div className="inline-flex items-stretch rounded-lg border-[1.5px] overflow-hidden" style={{ borderColor: BLUE }}>
                <button
                  type="button"
                  onClick={() => handleExport()}
                  disabled={!canExport || exporting}
                  title={
                    canExport
                      ? "Export every visible card. Un-scored cards appear as '—' with a 'Not yet scored' pill."
                      : "Add at least one candidate to enable export"
                  }
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-[13px] font-bold transition hover:bg-[#eef4ff] disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ color: BLUE, backgroundColor: "#fff" }}
                >
                  {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                  {exporting ? "Generating PDF…" : "Export Site Report (PDF)"}
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      disabled={!canExport || exporting}
                      title="Export one specific site"
                      className="inline-flex items-center px-2 py-2 border-l-[1.5px] transition hover:bg-[#eef4ff] disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ borderColor: BLUE, color: BLUE, backgroundColor: "#fff" }}
                    >
                      <ChevronDown size={16} />
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
          // Match any saved row by address (regardless of inputs) so the card can
          // explain why its score differs from the saved snapshot.
          const savedMatch =
            s.address
              ? savedSites.rows.find(
                  (r) => r.address && r.address.trim() === s.address.trim(),
                ) ?? null
              : null;
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
              savedMatch={savedMatch}
            />
          );
        })}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <EmptySlot
            key={`empty-${i}`}
            onLoadFromSaved={() => setDrawerOpen(true)}
            onComputeNew={() => {
              if (typeof window === "undefined") return;
              const el = document.getElementById("sas-live-engine");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              else window.scrollTo({ top: 0, behavior: "smooth" });
              setTimeout(() => {
                const input = document.getElementById("sas-address-input") as HTMLInputElement | null;
                input?.focus();
              }, 400);
            }}
          />
        ))}
      </section>

      <DecisionSummary scored={scored} byAddress={byAddress} />
    </>
  );
}

