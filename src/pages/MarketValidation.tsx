import { useState } from "react";
import { AlertCircle, ChevronDown, ChevronUp, Download, FileText, MapPin } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { DemoBanner } from "@/components/phase2-demo/DemoBanner";
import { LowConfidenceBadge } from "@/components/phase2-demo/LowConfidenceBadge";
import { SampleDataBadge } from "@/components/phase2-demo/SampleDataBadge";
import { Slider } from "@/components/ui/slider";
import {
  friscoMarketValidationDemo,
  MARKET_BALANCE_ACTIVE_BAND,
  MARKET_BALANCE_BANDS,
  QA_QUEUE_FLAGGED_COUNT,
  SCRAPE_CADENCE,
  type AbsorptionStatus,
  type ConfidenceLevel,
} from "@/data/phase2DemoData";

const NAVY = "#07142f";
const MUTED = "#526078";
const BORDER = "#eef2f7";
const SOFT = "#f7faff";
const BLUE = "#174be8";

const STATUS_STYLE: Record<AbsorptionStatus, { bg: string; fg: string; label: string }> = {
  sold_out: { bg: "#fce7ec", fg: "#a3142b", label: "Sold out" },
  waitlist: { bg: "#fff1d6", fg: "#925100", label: "Waitlist" },
  low_availability: { bg: "#fff8d9", fg: "#7a5800", label: "Low avail." },
  open: { bg: "#e3f3e7", fg: "#1d6b32", label: "Open" },
  unknown: { bg: "#eef2f7", fg: "#526078", label: "Unknown" },
};

const OVERLAP_STYLE: Record<"direct" | "adjacent" | "distant", { bg: string; fg: string }> = {
  direct: { bg: "#fce7ec", fg: "#a3142b" },
  adjacent: { bg: "#fff1d6", fg: "#925100" },
  distant: { bg: "#eef2f7", fg: "#526078" },
};

interface SubScoreCardProps {
  title: string;
  subtitle: string;
  weight: number;
  value: number;
  signals: { label: string; value: string }[];
  formula: string;
  confidence: { level: ConfidenceLevel; note: string };
  topSlot?: React.ReactNode;
  bottomSlot?: React.ReactNode;
}

const CHIP =
  "inline-flex items-center whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold";

function SubScoreCard({ title, subtitle, weight, value, signals, formula, confidence, topSlot, bottomSlot }: SubScoreCardProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col rounded-lg border bg-white p-4" style={{ borderColor: BORDER, minHeight: 280 }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-[13px] font-bold" style={{ color: NAVY }}>
              {title}
            </h3>
            <span className={CHIP} style={{ backgroundColor: SOFT, color: BLUE }}>
              {Math.round(weight * 100)}%
            </span>
            <LowConfidenceBadge level={confidence.level} note={confidence.note} />
          </div>
          <p className="mt-0.5 text-[11px]" style={{ color: MUTED }}>
            {subtitle}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[24px] font-black leading-none tabular-nums" style={{ color: NAVY }}>
            {value}
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wide" style={{ color: MUTED }}>
            / 100
          </div>
        </div>
      </div>

      {/* Weight slider — disabled preview affordance (1A-LOV-2) */}
      <div className="mt-2.5 rounded-md border border-dashed p-2" style={{ borderColor: BORDER }}>
        <div className="mb-1 flex items-center justify-between text-[10px]" style={{ color: MUTED }}>
          <span>Weight</span>
          <span className="font-semibold tabular-nums" style={{ color: NAVY }}>
            {Math.round(weight * 100)}%
          </span>
        </div>
        <Slider
          disabled
          value={[Math.round(weight * 100)]}
          min={5}
          max={40}
          step={1}
          aria-label={`${title} weight`}
        />
        <p className="mt-1 text-[9px]" style={{ color: MUTED }}>
          Static for v1 — re-weightable in v1.1 per SOW Item 1.
        </p>
      </div>

      {topSlot && <div className="mt-3">{topSlot}</div>}

      <ul className="mt-3 space-y-1.5">
        {signals.map((s) => (
          <li key={s.label} className="flex items-baseline justify-between gap-3 text-[12px]">
            <span style={{ color: MUTED }}>{s.label}</span>
            <span className="flex items-center gap-1.5 font-semibold tabular-nums" style={{ color: NAVY }}>
              {s.value}
              <SampleDataBadge />
            </span>
          </li>
        ))}
      </ul>

      {bottomSlot && <div className="mt-3">{bottomSlot}</div>}

      <div className="mt-auto pt-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold"
          style={{ color: BLUE }}
        >
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {open ? "Hide formula" : "Show formula"}
        </button>
        {open && (
          <>
            <pre
              className="mt-2 whitespace-pre-wrap rounded-md p-2 text-[11px] leading-snug"
              style={{ backgroundColor: SOFT, color: NAVY, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
            >
              {formula}
            </pre>
            {confidence.level !== "high" && (
              <p className="mt-2 text-[11px]" style={{ color: MUTED }}>
                <strong style={{ color: NAVY }}>QA note:</strong> {confidence.note}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function MarketValidation() {
  const data = friscoMarketValidationDemo;
  const subs = data.subScores;

  return (
    <>
      <PageHeader
        title="Market Validation"
        subtitle="Phase 2 · Feature 1A — Premium Enrichment Ecosystem scoring across the v1 city shortlist."
        hideJourneyBar
      />

      <DemoBanner />

      {/* Shortlist city selector */}
      <section
        className="mb-4 flex flex-wrap items-center gap-1.5 rounded-lg border bg-white p-3"
        style={{ borderColor: BORDER }}
      >
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
          Shortlist · {data.shortlist.length}
        </span>
        {data.shortlist.map((c) => {
          const isActive = c.active;
          return (
            <button
              key={`${c.city}-${c.state}`}
              type="button"
              disabled={!isActive}
              title={isActive ? `${c.city}, ${c.state} — composite ${c.composite}` : "Demo locked to Frisco — other cities wire up in Week 3"}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed"
              style={{
                borderColor: isActive ? BLUE : BORDER,
                backgroundColor: isActive ? BLUE : "#fff",
                color: isActive ? "#fff" : MUTED,
                opacity: isActive ? 1 : 0.7,
              }}
            >
              {c.city}, {c.state}
              <span
                className="rounded-full px-1 py-px text-[9px] font-bold tabular-nums"
                style={{
                  backgroundColor: isActive ? "rgba(255,255,255,0.22)" : SOFT,
                  color: isActive ? "#fff" : NAVY,
                }}
              >
                {c.composite}
              </span>
            </button>
          );
        })}
      </section>

      {/* Composite card — left stack flush-left, fixed-width right sidebar */}
      <section
        className="mb-5 rounded-lg border bg-white p-5"
        style={{ borderColor: BORDER }}
      >
        <div className="flex flex-wrap items-start gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <MapPin size={16} style={{ color: BLUE }} />
              <h2 className="text-[18px] font-black" style={{ color: NAVY }}>
                {data.city}, {data.state}
              </h2>
              <SampleDataBadge label="Demo city" />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px]" style={{ color: MUTED }}>
              <span>Scrape date {data.scrapeDate}</span>
              <span>·</span>
              <button
                type="button"
                title={`Records with extraction confidence <0.7 route here for 4-button human review per SOW Item 1. Currently ${QA_QUEUE_FLAGGED_COUNT} flagged.`}
                className={`${CHIP} cursor-help`}
                style={{ backgroundColor: "#fff1d6", color: "#925100" }}
              >
                <AlertCircle size={10} className="mr-1" />
                QA queue · {QA_QUEUE_FLAGGED_COUNT} flagged
              </button>
            </div>
            {/* Scrape cadence dots — 1A-LOV-5 */}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wide" style={{ color: MUTED }}>
                Cadence 5x/yr
              </span>
              <div className="flex items-center gap-1.5">
                {SCRAPE_CADENCE.map((dot, i) => (
                  <div key={dot.month} className="flex items-center gap-1.5">
                    <div
                      className="flex flex-col items-center"
                      title={`${dot.label} ${dot.month}${dot.current ? " · current scrape" : ""}`}
                    >
                      <span
                        className="block rounded-full"
                        style={{
                          width: dot.current ? 10 : 6,
                          height: dot.current ? 10 : 6,
                          backgroundColor: dot.current ? BLUE : "#cbd5e1",
                          boxShadow: dot.current ? "0 0 0 3px rgba(23,75,232,0.18)" : "none",
                        }}
                      />
                      <span className="mt-0.5 text-[9px]" style={{ color: dot.current ? NAVY : MUTED }}>
                        {dot.label}
                      </span>
                    </div>
                    {i < SCRAPE_CADENCE.length - 1 && (
                      <span className="block h-px w-4" style={{ backgroundColor: BORDER }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed" style={{ color: NAVY }}>
              {data.verdict}
            </p>

          </div>
          <div className="flex w-[180px] shrink-0 flex-col items-end gap-2">
            <div className="text-right">
              <div className="text-[42px] font-black leading-none tabular-nums" style={{ color: NAVY }}>
                {data.composite}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-wide" style={{ color: MUTED }}>
                PEE Score
              </div>
              <span
                className={`${CHIP} mt-2 font-bold`}
                style={{ backgroundColor: "#e3f3e7", color: "#1d6b32" }}
              >
                Tier: {data.tier}
              </span>
            </div>
            <button
              type="button"
              disabled
              title="Coming Week 3 — branded 12-section PDF report per SOW Item 1"
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold"
              style={{ borderColor: BORDER, color: MUTED, backgroundColor: SOFT }}
            >
              <Download size={12} />
              Export PDF
              <span className={`${CHIP} bg-white`} style={{ color: BLUE }}>
                Week 3
              </span>
            </button>
          </div>
        </div>

        <div
          className="mt-4 rounded-md p-3 text-[11px] leading-snug"
          style={{ backgroundColor: SOFT, color: NAVY, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
        >
          Premium Enrichment Ecosystem Score ={"\n"}
          {"    "}0.20 × Pricing Acceptance{"\n"}
          {"  + "}0.25 × Market Absorption{"  "}← dominant demand-side signal{"\n"}
          {"  + "}0.20 × Scaled Operator{"\n"}
          {"  + "}0.10 × Enrichment Diversity{"\n"}
          {"  + "}0.10 × Market Depth{"\n"}
          {"  + "}0.15 × Market Balance Index
        </div>
      </section>

      {/* Sub-score grid */}
      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SubScoreCard
          title="Pricing Acceptance"
          subtitle="Are families already paying premium pricing?"
          weight={subs.pricingAcceptance.weight}
          value={subs.pricingAcceptance.value}
          signals={subs.pricingAcceptance.signals}
          formula={subs.pricingAcceptance.formula}
          confidence={subs.pricingAcceptance.confidence}
        />
        <SubScoreCard
          title="Market Absorption"
          subtitle="Are premium operators actually selling out?"
          weight={subs.marketAbsorption.weight}
          value={subs.marketAbsorption.value}
          signals={subs.marketAbsorption.signals}
          formula={subs.marketAbsorption.formula}
          confidence={subs.marketAbsorption.confidence}
        />
        <SubScoreCard
          title="Scaled Operator"
          subtitle="Validated vs saturated by national operators?"
          weight={subs.scaledOperator.weight}
          value={subs.scaledOperator.value}
          signals={subs.scaledOperator.signals}
          formula={subs.scaledOperator.formula}
          confidence={subs.scaledOperator.confidence}
        />
        <SubScoreCard
          title="Enrichment Diversity"
          subtitle="Do families invest across multiple categories?"
          weight={subs.enrichmentDiversity.weight}
          value={subs.enrichmentDiversity.value}
          signals={subs.enrichmentDiversity.signals}
          formula={subs.enrichmentDiversity.formula}
          confidence={subs.enrichmentDiversity.confidence}
        />
        <SubScoreCard
          title="Market Depth"
          subtitle="How large is the premium ecosystem?"
          weight={subs.marketDepth.weight}
          value={subs.marketDepth.value}
          signals={subs.marketDepth.signals}
          formula={subs.marketDepth.formula}
          confidence={subs.marketDepth.confidence}
        />
        <SubScoreCard
          title="Market Balance Index"
          subtitle="Is there still room in this market?"
          weight={subs.marketBalance.weight}
          value={subs.marketBalance.value}
          signals={subs.marketBalance.signals}
          formula={subs.marketBalance.formula}
          confidence={subs.marketBalance.confidence}
        />
      </section>

      {/* Premium provider sample table */}
      <section className="mb-6 rounded-lg border bg-white" style={{ borderColor: BORDER }}>
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3" style={{ borderColor: BORDER }}>
          <div>
            <h3 className="text-[14px] font-bold" style={{ color: NAVY }}>
              Premium provider sample
            </h3>
            <p className="text-[11px]" style={{ color: MUTED }}>
              Week-level registration state per provider — the audit trail behind Market Absorption.
            </p>
          </div>
          <SampleDataBadge label="6 of 18 sample rows" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ color: MUTED }}>
                <th className="px-4 py-2 text-left font-semibold">Provider</th>
                <th className="px-4 py-2 text-right font-semibold">$ / wk</th>
                <th className="px-4 py-2 text-center font-semibold">Sites</th>
                <th className="px-4 py-2 text-center font-semibold">Overlap</th>
                <th className="px-4 py-2 text-left font-semibold">Sample weeks (mid-March 2026)</th>
              </tr>
            </thead>
            <tbody>
              {data.premiumProviders.map((p) => (
                <tr key={p.name} className="border-t" style={{ borderColor: BORDER }}>
                  <td className="px-4 py-2.5 font-semibold" style={{ color: NAVY }}>
                    {p.name}
                  </td>
                  <td className="px-4 py-2.5 text-right" style={{ color: NAVY }}>
                    ${p.weeklyPrice}
                  </td>
                  <td className="px-4 py-2.5 text-center" style={{ color: NAVY }}>
                    {p.siteCount}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold capitalize"
                      style={{ backgroundColor: OVERLAP_STYLE[p.overlap].bg, color: OVERLAP_STYLE[p.overlap].fg }}
                    >
                      {p.overlap}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {p.sampleWeeks.map((w) => {
                        const s = STATUS_STYLE[w.status];
                        return (
                          <span
                            key={w.label}
                            className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                            style={{ backgroundColor: s.bg, color: s.fg }}
                            title={w.label}
                          >
                            {s.label}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer
        className="flex items-center gap-2 rounded-lg border bg-white p-3 text-[11px]"
        style={{ borderColor: BORDER, color: MUTED }}
      >
        <FileText size={14} />
        Formulas, sub-score weights, and acceptance criteria are locked in
        <code className="rounded bg-[#f7faff] px-1 py-px text-[#174be8]">.lovable/phase-2/phase-2-sow.md</code>
        Item 1 (Feature 1A). This page renders sample data only — Week 3 wires it to the Manus pipeline.
      </footer>
    </>
  );
}
