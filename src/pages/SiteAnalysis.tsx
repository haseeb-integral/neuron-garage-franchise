import { useState } from "react";
import { ChevronDown, ChevronUp, Download, FileText, MapPin, Plus } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { DemoBanner } from "@/components/phase2-demo/DemoBanner";
import { SampleDataBadge } from "@/components/phase2-demo/SampleDataBadge";
import {
  austinSiteAnalysisDemo,
  SITE_RECOMMEND_THRESHOLDS,
  type SiteAnalysisDemoSite,
} from "@/data/phase2DemoData";

const NAVY = "#07142f";
const MUTED = "#526078";
const BORDER = "#eef2f7";
const SOFT = "#f7faff";
const BLUE = "#174be8";

function tierBadge(score: number) {
  if (score >= SITE_RECOMMEND_THRESHOLDS.recommend) return { bg: "#e3f3e7", fg: "#1d6b32", label: "Recommend" };
  if (score >= SITE_RECOMMEND_THRESHOLDS.worthALook) return { bg: "#fff8d9", fg: "#7a5800", label: "Worth a look" };
  return { bg: "#fce7ec", fg: "#a3142b", label: "Do not recommend" };
}

function IsochronePlaceholder() {
  return (
    <div
      className="relative flex h-40 items-center justify-center overflow-hidden rounded-md"
      style={{ background: `radial-gradient(circle at center, ${SOFT} 0%, #eef2f7 100%)` }}
      aria-label="Drive-time isochrone demo placeholder"
    >
      <div className="absolute rounded-full" style={{ width: 150, height: 150, border: `1.5px dashed ${BLUE}`, opacity: 0.45 }} />
      <div className="absolute rounded-full" style={{ width: 90, height: 90, border: `2px solid ${BLUE}`, opacity: 0.7 }} />
      <div className="absolute rounded-full" style={{ width: 14, height: 14, backgroundColor: BLUE, boxShadow: "0 0 0 4px rgba(23,75,232,0.15)" }} />
      <span className="absolute bottom-2 left-2 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-semibold" style={{ color: NAVY }}>
        10-min · 15-min drive-time
      </span>
      <span className="absolute right-2 top-2">
        <SampleDataBadge label="Map placeholder" />
      </span>
    </div>
  );
}

interface RowProps {
  label: string;
  value: number;
  weight: number;
  formula: string;
}

function SubScoreRow({ label, value, weight, formula }: RowProps) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <div className="flex items-baseline justify-between text-[12px]">
        <span style={{ color: MUTED }}>
          {label}
          <span className="ml-1 text-[10px]" style={{ color: MUTED }}>
            ({Math.round(weight * 100)}%)
          </span>
        </span>
        <span className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-0.5 text-[10px] font-semibold"
            style={{ color: BLUE }}
            title={open ? "Hide formula" : "Show formula"}
          >
            {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            ƒ
          </button>
          <span className="font-bold" style={{ color: NAVY }}>
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
        <pre
          className="mt-1.5 whitespace-pre-wrap rounded-md p-2 text-[10px] leading-snug"
          style={{ backgroundColor: SOFT, color: NAVY, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
        >
          {formula}
        </pre>
      )}
    </li>
  );
}

function SiteCard({ site }: { site: SiteAnalysisDemoSite }) {
  const tier = tierBadge(site.composite);
  const s = site.subScores;
  const rows: RowProps[] = [
    { label: "School Profile", value: s.schoolProfile.value, weight: s.schoolProfile.weight, formula: s.schoolProfile.formula },
    { label: "Neighborhood Affluence", value: s.neighborhoodAffluence.value, weight: s.neighborhoodAffluence.weight, formula: s.neighborhoodAffluence.formula },
    { label: "Family Density", value: s.familyDensity.value, weight: s.familyDensity.weight, formula: s.familyDensity.formula },
    { label: "School Ecosystem", value: s.schoolEcosystem.value, weight: s.schoolEcosystem.weight, formula: s.schoolEcosystem.formula },
    { label: "Accessibility", value: s.accessibility.value, weight: s.accessibility.weight, formula: s.accessibility.formula },
  ];

  return (
    <div className="flex flex-col rounded-lg border bg-white p-4" style={{ borderColor: BORDER }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MapPin size={14} style={{ color: BLUE }} />
            <h3 className="truncate text-[14px] font-bold" style={{ color: NAVY }}>
              {site.schoolName}
            </h3>
          </div>
          <p className="mt-0.5 text-[11px]" style={{ color: MUTED }}>
            {site.address}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]" style={{ color: MUTED }}>
            <span className="rounded-full bg-[#eef2f7] px-1.5 py-0.5 font-semibold">{site.schoolType}</span>
            <span className="rounded-full bg-[#eef2f7] px-1.5 py-0.5 font-semibold">Enr. {site.enrollment}</span>
            <span
              className="rounded-full px-1.5 py-0.5 font-semibold"
              style={{
                backgroundColor: site.gradeAlignment.includes("✓") ? "#e3f3e7" : "#fce7ec",
                color: site.gradeAlignment.includes("✓") ? "#1d6b32" : "#a3142b",
              }}
            >
              {site.gradeAlignment}
            </span>
            <SampleDataBadge />
          </div>
        </div>
        <div className="text-right">
          <div className="text-[28px] font-black leading-none" style={{ color: NAVY }}>
            {site.composite}
          </div>
          <span
            className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ backgroundColor: tier.bg, color: tier.fg }}
          >
            {tier.label}
          </span>
        </div>
      </div>

      <p className="mt-2 text-[12px] leading-snug" style={{ color: NAVY }}>
        {site.verdict}
      </p>

      <div className="mt-3">
        <IsochronePlaceholder />
        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-md p-2" style={{ backgroundColor: SOFT }}>
            <div className="text-[9px] uppercase tracking-wide" style={{ color: MUTED }}>Median HHI · 10 min</div>
            <div className="font-bold" style={{ color: NAVY }}>{site.isochroneCallouts.medianHHI10min}</div>
          </div>
          <div className="rounded-md p-2" style={{ backgroundColor: SOFT }}>
            <div className="text-[9px] uppercase tracking-wide" style={{ color: MUTED }}>% HH &gt;$150k · 10 min</div>
            <div className="font-bold" style={{ color: NAVY }}>{site.isochroneCallouts.pctOver150k10min}</div>
          </div>
          <div className="rounded-md p-2" style={{ backgroundColor: SOFT }}>
            <div className="text-[9px] uppercase tracking-wide" style={{ color: MUTED }}>% Dual-Income · 10 min</div>
            <div className="font-bold" style={{ color: NAVY }}>{site.isochroneCallouts.pctDualIncome10min}</div>
          </div>
          <div className="rounded-md p-2" style={{ backgroundColor: SOFT }}>
            <div className="text-[9px] uppercase tracking-wide" style={{ color: MUTED }}>Families w/ kids 5–12 · 10 min</div>
            <div className="font-bold" style={{ color: NAVY }}>{site.isochroneCallouts.familiesWithKids5to12Within10min}</div>
          </div>
          <div className="rounded-md p-2" style={{ backgroundColor: SOFT }}>
            <div className="text-[9px] uppercase tracking-wide" style={{ color: MUTED }}>Kids 5–12 · 10 min</div>
            <div className="font-bold" style={{ color: NAVY }}>{site.isochroneCallouts.children5to12Within10min}</div>
          </div>
          <div className="rounded-md p-2" style={{ backgroundColor: SOFT }}>
            <div className="text-[9px] uppercase tracking-wide" style={{ color: MUTED }}>Kids 5–12 · 15 min</div>
            <div className="font-bold" style={{ color: NAVY }}>{site.isochroneCallouts.children5to12Within15min}</div>
          </div>
        </div>
      </div>

      <ul className="mt-3 space-y-1.5">
        {rows.map((r) => (
          <SubScoreRow key={r.label} {...r} />
        ))}
      </ul>
    </div>
  );
}

function EmptySlot() {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center"
      style={{ borderColor: BORDER, color: MUTED, minHeight: 240 }}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: SOFT, color: BLUE }}>
        <Plus size={18} />
      </div>
      <div className="mt-2 text-[12px] font-semibold">Add candidate site</div>
      <p className="mt-1 max-w-[180px] text-[11px]">Up to 4 sites compared side-by-side. Disabled in demo.</p>
      <SampleDataBadge label="Empty slot" />
    </div>
  );
}

export default function SiteAnalysis() {
  const { filled, emptySlots } = austinSiteAnalysisDemo;

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

      <section className="mb-5 rounded-lg border bg-white p-5" style={{ borderColor: BORDER }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-black" style={{ color: NAVY }}>
              Side-by-side compare — Austin metro
            </h2>
            <p className="mt-0.5 text-[12px]" style={{ color: MUTED }}>
              Site Opportunity Score = 0.25 × School Profile + 0.25 × Neighborhood Affluence + 0.20 ×
              Family Density + 0.15 × School Ecosystem + 0.15 × Accessibility.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SampleDataBadge label="Compare strip · 2 of 4" />
            <button
              type="button"
              disabled
              title="Coming Week 3 — branded PDF report per SOW Item 2"
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold"
              style={{ borderColor: BORDER, color: MUTED, backgroundColor: SOFT }}
            >
              <Download size={12} />
              Export PDF
              <span className="rounded-full bg-white px-1 py-px text-[9px]" style={{ color: BLUE }}>Week 3</span>
            </button>
          </div>
        </div>

        {/* Threshold legend */}
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md p-2 text-[11px]" style={{ backgroundColor: SOFT }}>
          <span className="font-semibold" style={{ color: NAVY }}>Recommend thresholds:</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#1d6b32" }} />
            <span style={{ color: NAVY }}>≥{SITE_RECOMMEND_THRESHOLDS.recommend} Recommend</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#925100" }} />
            <span style={{ color: NAVY }}>{SITE_RECOMMEND_THRESHOLDS.worthALook}–{SITE_RECOMMEND_THRESHOLDS.recommend - 1} Worth a look</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#a3142b" }} />
            <span style={{ color: NAVY }}>&lt;{SITE_RECOMMEND_THRESHOLDS.worthALook} Do not recommend</span>
          </span>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {filled.map((site) => (
          <SiteCard key={site.id} site={site} />
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <EmptySlot key={i} />
        ))}
      </section>

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
