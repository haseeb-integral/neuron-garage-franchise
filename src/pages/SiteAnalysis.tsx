import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, Download, FileText, MapPin, Plus, Search, Star, XCircle } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { AddCandidateSiteModal } from "@/components/phase2-demo/AddCandidateSiteModal";
import { DemoBanner } from "@/components/phase2-demo/DemoBanner";
import { SampleDataBadge } from "@/components/phase2-demo/SampleDataBadge";
import { SiteDecisionControls } from "@/components/phase2-demo/SiteDecisionControls";
import { useSiteDecisions, type SiteVerdict } from "@/hooks/useSiteDecisions";
import { exportSiteDecisionPack } from "@/lib/decisionsExport";
import {
  austinSiteAnalysisDemo,
  SCHOOL_PROFILE_FACTORS,
  SITE_ACCESSIBILITY_CALLOUTS,
  SITE_RECOMMEND_THRESHOLDS,
  type SiteAnalysisDemoSite,
} from "@/data/phase2DemoData";

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

// Shared chip class — every meta pill uses identical geometry.
const CHIP =
  "inline-flex items-center whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold";

function tierBadge(score: number) {
  if (score >= SITE_RECOMMEND_THRESHOLDS.recommend) return { bg: "#e3f3e7", fg: "#1d6b32", label: "Recommend" };
  if (score >= SITE_RECOMMEND_THRESHOLDS.worthALook) return { bg: "#fff8d9", fg: "#7a5800", label: "Worth a look" };
  return { bg: "#fce7ec", fg: "#a3142b", label: "Don't recommend" };
}

function shortGradeAlignment(full: string) {
  // Input like "Matches NG 5–12 ✓" or "Daycare PK–K · misaligned vs NG 5–12 ✗"
  const ok = full.includes("✓");
  const match = full.match(/(PK–K|K–\d+|\d+–\d+|PK–\d+)/);
  const range = match?.[1] ?? (ok ? "5–12" : "PK–K");
  return { short: `${range} ${ok ? "✓" : "✗"}`, ok };
}

function IsochronePlaceholder() {
  return (
    <div
      className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-md"
      style={{ background: `radial-gradient(circle at center, ${SOFT} 0%, #eef2f7 100%)` }}
      aria-label="Drive-time isochrone demo placeholder"
    >
      <div className="absolute rounded-full" style={{ width: 130, height: 130, border: `1.5px dashed ${BLUE}`, opacity: 0.45 }} />
      <div className="absolute rounded-full" style={{ width: 80, height: 80, border: `2px solid ${BLUE}`, opacity: 0.7 }} />
      <div className="absolute rounded-full" style={{ width: 12, height: 12, backgroundColor: BLUE, boxShadow: "0 0 0 4px rgba(23,75,232,0.15)" }} />
      <span className={`absolute bottom-2 left-2 ${CHIP} bg-white/90`} style={{ color: NAVY }}>
        10 · 15 min drive
      </span>
      <span className="absolute right-2 top-2">
        <SampleDataBadge label="Map" />
      </span>
    </div>
  );
}

interface RowProps {
  label: string;
  value: number;
  weight: number;
  formula: string;
  open: boolean;
  onToggle: () => void;
  extra?: React.ReactNode;
}

function SubScoreRow({ label, value, weight, formula, open, onToggle, extra }: RowProps) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-2 text-[12px]">
        <span className="truncate" style={{ color: MUTED }}>
          {label}
          <span className="ml-1 text-[10px]" style={{ color: MUTED }}>
            ({Math.round(weight * 100)}%)
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-0.5 text-[10px] font-semibold"
            style={{ color: BLUE }}
            title={open ? "Hide formula" : "Show formula"}
          >
            {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            ƒ
          </button>
          <span className="font-bold tabular-nums" style={{ color: NAVY }}>
            {value}
          </span>
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "#eef2f7" }}>
        <div
          className="h-full"
          style={{
            width: `${value}%`,
            backgroundColor:
              value >= SITE_RECOMMEND_THRESHOLDS.recommend
                ? "#1d6b32"
                : value >= SITE_RECOMMEND_THRESHOLDS.worthALook
                ? "#925100"
                : "#a3142b",
          }}
        />
      </div>
      {open && (
        <>
          <pre
            className="mt-1.5 whitespace-pre-wrap rounded-md p-2 text-[11px] leading-snug"
            style={{ backgroundColor: SOFT, color: NAVY, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
          >
            {formula}
          </pre>
          {extra && <div className="mt-1.5">{extra}</div>}
        </>
      )}
    </li>
  );
}

function SchoolProfileFactors() {
  return (
    <div className="rounded-md border p-2 text-[10px]" style={{ borderColor: BORDER, backgroundColor: "#fff" }}>
      <div className="mb-1 font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
        School profile factors
      </div>
      <div className="mb-1.5">
        <div className="mb-0.5 font-semibold" style={{ color: NAVY }}>school_type_factor</div>
        <div className="flex flex-wrap gap-1">
          {SCHOOL_PROFILE_FACTORS.schoolType.map((r) => (
            <span key={r.type} className="rounded px-1.5 py-0.5" style={{ backgroundColor: SOFT, color: NAVY }}>
              {r.type} <span className="font-bold tabular-nums">{r.factor}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="mb-1.5">
        <div className="font-semibold" style={{ color: NAVY }}>
          enrollment normalize: <span className="tabular-nums">{SCHOOL_PROFILE_FACTORS.enrollmentRange}</span>
        </div>
      </div>
      <div>
        <div className="mb-0.5 font-semibold" style={{ color: NAVY }}>grade_alignment_factor</div>
        <div className="flex flex-wrap gap-1">
          {SCHOOL_PROFILE_FACTORS.gradeAlignment.map((r) => (
            <span key={r.label} className="rounded px-1.5 py-0.5" style={{ backgroundColor: SOFT, color: NAVY }}>
              {r.label} <span className="font-bold tabular-nums">{r.factor}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}


function SiteCard({ site }: { site: SiteAnalysisDemoSite }) {
  const { byAddress } = useSiteDecisions();
  const decision = byAddress.get(site.address);
  const brettVerdict: SiteVerdict | undefined =
    decision && decision.verdict !== "undecided" ? decision.verdict : undefined;
  const scoreTier = tierBadge(site.composite);
  const pill = brettVerdict ? VERDICT_STYLE[brettVerdict] : scoreTier;
  const pillSource = brettVerdict ? "Brett/Sam's call" : "auto from score";
  const isWinner = decision?.is_winner ?? false;

  const grade = shortGradeAlignment(site.gradeAlignment);
  const s = site.subScores;
  const access = SITE_ACCESSIBILITY_CALLOUTS[site.id];
  const rowDefs = [
    { label: "School Profile", value: s.schoolProfile.value, weight: s.schoolProfile.weight, formula: s.schoolProfile.formula, extra: <SchoolProfileFactors /> as React.ReactNode },
    { label: "Neighborhood Affluence", value: s.neighborhoodAffluence.value, weight: s.neighborhoodAffluence.weight, formula: s.neighborhoodAffluence.formula, extra: undefined as React.ReactNode },
    { label: "Family Density", value: s.familyDensity.value, weight: s.familyDensity.weight, formula: s.familyDensity.formula, extra: undefined as React.ReactNode },
    { label: "School Ecosystem", value: s.schoolEcosystem.value, weight: s.schoolEcosystem.weight, formula: s.schoolEcosystem.formula, extra: undefined as React.ReactNode },
    { label: "Accessibility", value: s.accessibility.value, weight: s.accessibility.weight, formula: s.accessibility.formula, extra: undefined as React.ReactNode },
  ];
  const [openSet, setOpenSet] = useState<Set<string>>(new Set());
  const allOpen = openSet.size === rowDefs.length;
  const toggle = (label: string) =>
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  const toggleAll = () =>
    setOpenSet(allOpen ? new Set() : new Set(rowDefs.map((r) => r.label)));

  return (
    <div
      className="flex flex-col rounded-lg border bg-white p-4"
      style={{
        borderColor: isWinner ? "#1d6b32" : BORDER,
        borderWidth: isWinner ? 2 : 1,
        minHeight: 560,
      }}
    >
      {/* Header band */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <MapPin size={14} style={{ color: BLUE }} className="shrink-0" />
            <h3 className="truncate text-[13px] font-bold" style={{ color: NAVY }} title={site.schoolName}>
              {site.schoolName}
            </h3>
            {isWinner && (
              <span
                className={`${CHIP} font-bold`}
                style={{ backgroundColor: "#1d6b32", color: "#fff" }}
                title="Marked as the winner across the compared set"
              >
                <Star size={9} className="mr-0.5" fill="#fff" /> Winner
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-1 text-[11px]" style={{ color: MUTED }} title={site.address}>
            {site.address}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <span className={CHIP} style={{ backgroundColor: "#eef2f7", color: MUTED }}>{site.schoolType}</span>
            <span className={CHIP} style={{ backgroundColor: "#eef2f7", color: MUTED }}>Enr. {site.enrollment}</span>
            <span
              className={CHIP}
              style={{
                backgroundColor: grade.ok ? "#e3f3e7" : "#fce7ec",
                color: grade.ok ? "#1d6b32" : "#a3142b",
              }}
              title={site.gradeAlignment}
            >
              {grade.short}
            </span>
            <SampleDataBadge />
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="text-[28px] font-black leading-none tabular-nums" style={{ color: NAVY }}>
            {site.composite}
          </div>
          <span
            className={`${CHIP} font-bold`}
            style={{ backgroundColor: pill.bg, color: pill.fg }}
            title={`${pill.label} — ${pillSource}`}
          >
            {pill.label}
          </span>
          <span className="text-[9px] uppercase tracking-wide" style={{ color: MUTED }}>
            {pillSource}
          </span>
        </div>
      </div>


      {/* Verdict band */}
      <p
        className="mt-2 line-clamp-3 text-[12px] leading-snug"
        style={{ color: NAVY, minHeight: 52 }}
        title={site.verdict}
      >
        {site.verdict}
      </p>

      {/* Isochrone band */}
      <div className="mt-3">
        <div className="mb-1 flex flex-wrap items-center gap-1">
          <span
            className={CHIP}
            style={{ backgroundColor: SOFT, color: BLUE }}
            title="Per SOW Item 2: drive-time isochrones weighted 10-min 60% / 15-min 40%."
          >
            10-min 60% · 15-min 40%
          </span>
          <span className={CHIP} style={{ backgroundColor: "#eef2f7", color: MUTED }}>
            Drive-time
          </span>
        </div>
        <IsochronePlaceholder />
      </div>

      {/* Callout grid — 3×2 (demographics + accessibility) */}
      <div className="mt-2 grid grid-cols-3 gap-1.5 text-[11px]">
        <div className="rounded-md p-1.5" style={{ backgroundColor: SOFT }}>
          <div className="text-[9px] uppercase tracking-wide" style={{ color: MUTED }}>Median HHI · 10m</div>
          <div className="truncate font-bold tabular-nums" style={{ color: NAVY }}>{site.isochroneCallouts.medianHHI10min}</div>
        </div>
        <div className="rounded-md p-1.5" style={{ backgroundColor: SOFT }}>
          <div className="text-[9px] uppercase tracking-wide" style={{ color: MUTED }}>HH &gt;$150k · 10m</div>
          <div className="truncate font-bold tabular-nums" style={{ color: NAVY }}>{site.isochroneCallouts.pctOver150k10min}</div>
        </div>
        <div className="rounded-md p-1.5" style={{ backgroundColor: SOFT }}>
          <div className="text-[9px] uppercase tracking-wide" style={{ color: MUTED }}>Kids 5–12 · 10m</div>
          <div className="truncate font-bold tabular-nums" style={{ color: NAVY }}>{site.isochroneCallouts.children5to12Within10min}</div>
        </div>
        <div className="rounded-md p-1.5" style={{ backgroundColor: "#eef6ff" }} title="Accessibility — distance to highway entrance.">
          <div className="text-[9px] uppercase tracking-wide" style={{ color: MUTED }}>Drive to hwy</div>
          <div className="truncate font-bold" style={{ color: NAVY }}>{access?.driveToHighway ?? "—"}</div>
        </div>
        <div className="rounded-md p-1.5" style={{ backgroundColor: "#eef6ff" }} title="Accessibility — est. parking capacity on site.">
          <div className="text-[9px] uppercase tracking-wide" style={{ color: MUTED }}>Parking</div>
          <div className="truncate font-bold" style={{ color: NAVY }}>{access?.parkingSpaces ?? "—"}</div>
        </div>
        <div className="rounded-md p-1.5" style={{ backgroundColor: "#eef6ff" }} title="Accessibility — total population reachable within 15-min drive.">
          <div className="text-[9px] uppercase tracking-wide" style={{ color: MUTED }}>Pop · 15m</div>
          <div className="truncate font-bold tabular-nums" style={{ color: NAVY }}>{access?.popReachable15min ?? "—"}</div>
        </div>
      </div>


      {/* Sub-score list — scrolls internally so formula drawers don't break grid */}
      <div className="mt-3 flex flex-1 flex-col">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
            Sub-scores
          </span>
          <button
            type="button"
            onClick={toggleAll}
            className="text-[10px] font-semibold"
            style={{ color: BLUE }}
          >
            {allOpen ? "Hide all formulas" : "Show all formulas"}
          </button>
        </div>
        <ul
          className="space-y-1.5 overflow-y-auto pr-1"
          style={{ maxHeight: 180 }}
        >
          {rowDefs.map((r) => (
            <SubScoreRow
              key={r.label}
              {...r}
              open={openSet.has(r.label)}
              onToggle={() => toggle(r.label)}
            />
          ))}
        </ul>
      </div>

      {/* v1.1 — Decision capture */}
      <SiteDecisionControls
        address={site.address}
        schoolName={site.schoolName}
        defaultVerdict={defaultVerdictFromScore(site.composite)}
      />
    </div>
  );
}

function defaultVerdictFromScore(score: number): SiteVerdict {
  if (score >= SITE_RECOMMEND_THRESHOLDS.recommend) return "recommend";
  if (score >= SITE_RECOMMEND_THRESHOLDS.worthALook) return "worth_a_look";
  return "dont_recommend";
}

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
          minHeight: 560,
          ["--add-hover" as string]: BLUE,
        } as React.CSSProperties
      }
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: SOFT, color: BLUE }}>
        <Plus size={18} />
      </div>
      <div className="mt-2 text-[12px] font-semibold" style={{ color: NAVY }}>Add candidate site</div>
      <p className="mt-1 max-w-[180px] text-[11px]">Sample-scored locally. Up to 4 sites compared side-by-side.</p>
      <div className="mt-2"><SampleDataBadge label="Demo only" /></div>
    </button>
  );
}

function CalibrationGateBanner({ sites }: { sites: SiteAnalysisDemoSite[] }) {
  const trinity = sites.find((s) => /trinity/i.test(s.schoolName));
  const leaf = sites.find((s) => /leafspring/i.test(s.schoolName));
  if (!trinity || !leaf) return null;
  const delta = trinity.composite - leaf.composite;
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
      {pass ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />}
      <div>
        <strong>Calibration gate: {pass ? "✓ PASS" : "✗ FAIL"}</strong> — LeafSpring ({leaf.composite}) is{" "}
        {delta} {delta === 1 ? "point" : "points"} below Trinity ({trinity.composite}).{" "}
        <span className="opacity-80">
          SOW Item 2 requires LeafSpring to score materially lower than Trinity (≥20 pt gap). If this
          fails on real data, the weights are reworked before rollout.
        </span>
      </div>
    </div>
  );
}

function WinnerBanner({
  winnerSite,
  winnerDecision,
}: {
  winnerSite?: SiteAnalysisDemoSite;
  winnerDecision?: { verdict: SiteVerdict };
}) {
  if (!winnerSite) {
    return (
      <div
        className="mb-3 rounded-md border px-3 py-2 text-[12px]"
        style={{ backgroundColor: "#fff8d9", borderColor: "#925100", color: "#7a5800" }}
      >
        <strong>No winner selected.</strong> Pick exactly one site as the ★ Winner to enable the
        decision pack export and capture which address Brett/Sam is committing to.
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
        <strong>★ Winner:</strong> {winnerSite.schoolName} — Site Opportunity{" "}
        <strong className="tabular-nums">{winnerSite.composite}</strong> · Brett/Sam's verdict:{" "}
        <strong>{verdictLabel}</strong>
      </div>
    </div>
  );
}

function DecisionSummary({
  sites,
  byAddress,
}: {
  sites: SiteAnalysisDemoSite[];
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
            {sites.map((s) => {
              const d = byAddress.get(s.address);
              const v = (d?.verdict ?? "undecided") as SiteVerdict;
              const vs = VERDICT_STYLE[v];
              return (
                <tr key={s.id} style={{ borderTop: `1px solid ${BORDER}`, color: NAVY }}>
                  <td className="py-1.5 pr-2">{s.schoolName}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums font-bold">{s.composite}</td>
                  <td className="py-1.5 pr-2">
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{ backgroundColor: vs.bg, color: vs.fg }}
                    >
                      {vs.label}
                    </span>
                  </td>
                  <td className="py-1.5 pr-2">
                    {d?.is_winner ? <Star size={12} fill="#1d6b32" color="#1d6b32" /> : <span style={{ color: MUTED }}>—</span>}
                  </td>
                  <td className="py-1.5 pr-2" style={{ color: d?.notes ? NAVY : MUTED }}>
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

export default function SiteAnalysis() {
  const [filled, setFilled] = useState<SiteAnalysisDemoSite[]>(austinSiteAnalysisDemo.filled);
  const [modalOpen, setModalOpen] = useState(false);
  const { byAddress } = useSiteDecisions();

  const emptySlots = Math.max(0, 4 - filled.length);
  const winnerSite = useMemo(
    () => filled.find((s) => byAddress.get(s.address)?.is_winner),
    [filled, byAddress],
  );
  const winnerDecision = winnerSite ? byAddress.get(winnerSite.address) : undefined;
  const canExport = !!winnerSite;

  return (
    <>
      <PageHeader
        title="Site Analysis"
        subtitle="Phase 2 · Feature 1B — Per-site opportunity scoring with side-by-side comparison up to 4 candidates."
        hideJourneyBar
      />

      <DemoBanner
        note="Calibration anchors shown: Trinity (positive — operating NG site) vs LeafSpring (negative — closed 2023, far from customer base). The locked acceptance gate: LeafSpring must score materially lower than Trinity."
      />

      {/* Analyze a site — static input form (1B-LOV-1) */}
      <section className="mb-4 rounded-lg border bg-white p-4" style={{ borderColor: BORDER }}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-bold" style={{ color: NAVY }}>
            Analyze a site
          </h3>
          <SampleDataBadge label="Inputs not wired" />
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <label className="flex flex-col gap-1 text-[11px]" style={{ color: MUTED }}>
            School name *
            <input
              type="text"
              disabled
              placeholder="e.g. Trinity Episcopal School"
              className="rounded-md border px-2 py-1.5 text-[12px] disabled:bg-[#f7faff]"
              style={{ borderColor: BORDER, color: NAVY }}
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px]" style={{ color: MUTED }}>
            Address *
            <input
              type="text"
              disabled
              placeholder="3901 Bee Caves Rd, Austin, TX 78746"
              className="rounded-md border px-2 py-1.5 text-[12px] disabled:bg-[#f7faff]"
              style={{ borderColor: BORDER, color: NAVY }}
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px]" style={{ color: MUTED }}>
            School type (optional)
            <select
              disabled
              className="rounded-md border px-2 py-1.5 text-[12px] disabled:bg-[#f7faff]"
              style={{ borderColor: BORDER, color: NAVY }}
            >
              <option>Private elementary</option>
              <option>Public elementary</option>
              <option>Charter elementary</option>
              <option>Montessori</option>
              <option>Other K-8</option>
              <option>Other</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px]" style={{ color: MUTED }}>
            Enrollment (optional)
            <input
              type="number"
              disabled
              placeholder="540"
              className="rounded-md border px-2 py-1.5 text-[12px] disabled:bg-[#f7faff]"
              style={{ borderColor: BORDER, color: NAVY }}
            />
          </label>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[11px]" style={{ color: MUTED }}>
            Demo — production input not wired. Use the <strong>"+ Add candidate site"</strong> slot below to add a sample-scored site and walk the decision flow.
          </p>
          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold"
            style={{ backgroundColor: SOFT, color: MUTED, border: `1px solid ${BORDER}` }}
          >
            <Search size={12} />
            Analyze site
          </button>
        </div>
      </section>


      <section className="mb-5 rounded-lg border bg-white p-5" style={{ borderColor: BORDER }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 max-w-2xl">
            <h2 className="text-[18px] font-black" style={{ color: NAVY }}>
              Side-by-side compare — Austin metro
            </h2>
            <p className="mt-1 text-[12px]" style={{ color: MUTED }}>
              Site Opportunity Score = 0.25 × School Profile + 0.25 × Neighborhood Affluence + 0.20 ×
              Family Density + 0.15 × School Ecosystem + 0.15 × Accessibility.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <SampleDataBadge label={`${filled.length} of 4 slots`} />
            <button
              type="button"
              onClick={() => exportSiteDecisionPack(filled, byAddress)}
              disabled={!canExport}
              title={
                canExport
                  ? "Open a branded decision pack with Brett/Sam's verdict, winner, and notes — print or save as PDF"
                  : "Mark a winner first to enable the decision pack"
              }
              className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              style={{ borderColor: BLUE, color: BLUE, backgroundColor: "#fff" }}
            >
              <Download size={12} />
              Export decision pack
            </button>
          </div>
        </div>

        {/* Decision points */}
        <div className="mt-3 rounded-md p-2 text-[11px]" style={{ backgroundColor: "#f7faff" }}>
          <strong style={{ color: NAVY }}>Decision points on this page:</strong>
          <ol className="ml-4 mt-0.5 list-decimal" style={{ color: NAVY }}>
            <li>Confirm the calibration gate holds: LeafSpring scores materially below Trinity.</li>
            <li>Per site: <strong>Recommend / Worth a look / Don't recommend</strong> (overrides the threshold default and drives the top pill).</li>
            <li>Across the compared set: pick exactly one <strong>Winner</strong> ★ — that's the site Brett/Sam is committing to.</li>
            <li>Capture <strong>notes</strong> on each card explaining the verdict — they go into the export pack.</li>
          </ol>
        </div>

        {/* Threshold legend */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md p-2 text-[11px]" style={{ backgroundColor: SOFT }}>
          <span className="whitespace-nowrap font-semibold" style={{ color: NAVY }}>Thresholds:</span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#1d6b32" }} />
            <span style={{ color: NAVY }}>≥{SITE_RECOMMEND_THRESHOLDS.recommend} Recommend</span>
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#925100" }} />
            <span style={{ color: NAVY }}>{SITE_RECOMMEND_THRESHOLDS.worthALook}–{SITE_RECOMMEND_THRESHOLDS.recommend - 1} Worth a look</span>
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#a3142b" }} />
            <span style={{ color: NAVY }}>&lt;{SITE_RECOMMEND_THRESHOLDS.worthALook} Don't recommend</span>
          </span>
        </div>
      </section>

      <CalibrationGateBanner sites={filled} />
      <WinnerBanner winnerSite={winnerSite} winnerDecision={winnerDecision} />

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {filled.map((site) => (
          <SiteCard key={site.id} site={site} />
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <EmptySlot key={i} onAdd={() => setModalOpen(true)} />
        ))}
      </section>

      <DecisionSummary sites={filled} byAddress={byAddress} />

      <AddCandidateSiteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={(site) => setFilled((prev) => (prev.length >= 4 ? prev : [...prev, site]))}
      />

      <footer
        className="flex items-center gap-2 rounded-lg border bg-white p-3 text-[11px]"
        style={{ borderColor: BORDER, color: MUTED }}
      >
        <FileText size={14} />
        Formulas, sub-score weights, and the LeafSpring &lt; Trinity calibration gate are locked in
        <code className="rounded bg-[#f7faff] px-1 py-px text-[#174be8]">.lovable/phase-2/phase-2-sow.md</code>
        Item 2 (Feature 1B). This page renders sample data only — Week 3 wires it to Mapbox/HERE isochrones,
        Census ACS, and NCES.
      </footer>

    </>
  );
}
