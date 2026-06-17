import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, BarChart3, ChevronDown, ChevronUp, Download, FileText, MapPin } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { DemoBanner } from "@/components/phase2-demo/DemoBanner";
import { LiveCityDeepDive } from "@/components/phase2-demo/LiveCityDeepDive";
import { LowConfidenceBadge } from "@/components/phase2-demo/LowConfidenceBadge";
import { SampleDataBadge } from "@/components/phase2-demo/SampleDataBadge";
import { ShortlistTable, type LiveOverlay } from "@/components/phase2-demo/ShortlistTable";
import { Slider } from "@/components/ui/slider";
import { useLiveMvs } from "@/lib/mvs/useLiveMvs";
import {
  sanAntonioMarketValidationDemo,
  MARKET_BALANCE_ACTIVE_BAND,
  MARKET_BALANCE_BANDS,
  QA_QUEUE_FLAGGED_COUNT,
  SCRAPE_CADENCE,
  SHORTLIST_DEMO,
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
  const data = sanAntonioMarketValidationDemo;
  const subs = data.subScores;
  const [activeCityId, setActiveCityId] = useState<string>("san-antonio-tx");
  const activeRow = SHORTLIST_DEMO.find((r) => r.id === activeCityId) ?? SHORTLIST_DEMO[0];
  const isAnchor = activeCityId === "san-antonio-tx";

  // Phase 5 Turn 5.1 — live overlay for Austin only. When more cities flip
  // to mvs_data_source='live', extend this by adding more useLiveMvs hooks
  // (or refactor into a multi-city loader). Static demo path is untouched
  // for every city not in this overlay map.
  const austinLive = useLiveMvs("Austin, TX");
  const isAustinLive = austinLive.flag?.mvs_data_source === "live";
  const liveOverlays = useMemo<Map<string, LiveOverlay>>(() => {
    const m = new Map<string, LiveOverlay>();
    if (isAustinLive && austinLive.result) {
      const r = austinLive.result;
      m.set("austin-tx", {
        composite: r.mvs,
        pricing: r.scores.pricingAcceptance,
        absorption: r.scores.marketAbsorption,
        scaledOperator: r.scores.scaledOperator,
        diversity: r.scores.enrichmentDiversity,
        depth: r.scores.marketDepth,
        balance: r.scores.marketBalance,
        lowConfidence: austinLive.flag?.low_confidence_badge ?? false,
      });
    }
    return m;
  }, [isAustinLive, austinLive.result, austinLive.flag]);

  const isActiveLive = liveOverlays.has(activeCityId);



  // 1A-LOV-5 — Sellout curve from sample weeks (% sold_out + waitlist).
  const weekLabels = data.premiumProviders[0]?.sampleWeeks.map((w) => w.label) ?? [];
  const selloutCurve = weekLabels.map((_, idx) => {
    const total = data.premiumProviders.length;
    const hot = data.premiumProviders.filter((p) => {
      const s = p.sampleWeeks[idx]?.status;
      return s === "sold_out" || s === "waitlist";
    }).length;
    return total ? Math.round((hot / total) * 100) : 0;
  });

  // 1A-LOV-3 — Scaled Operator two-number diagnostic.
  const scaledDiagnostic = (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-md border p-2" style={{ borderColor: BORDER, backgroundColor: "#e3f3e7" }}>
        <div className="text-[9px] uppercase tracking-wide" style={{ color: "#1d6b32" }}>
          Operator validation
        </div>
        <div className="text-[18px] font-black tabular-nums" style={{ color: "#1d6b32" }}>
          5 <span className="text-[11px] font-semibold" style={{ color: MUTED }}>/ 8</span>
        </div>
        <div className="text-[10px]" style={{ color: MUTED }}>National operators present (lifts score)</div>
      </div>
      <div className="rounded-md border p-2" style={{ borderColor: BORDER, backgroundColor: "#fce7ec" }}>
        <div className="text-[9px] uppercase tracking-wide" style={{ color: "#a3142b" }}>
          Direct competitor load
        </div>
        <div className="text-[18px] font-black tabular-nums" style={{ color: "#a3142b" }}>
          2.1 <span className="text-[11px] font-semibold" style={{ color: MUTED }}>/ 10k kids 5–12</span>
        </div>
        <div className="text-[10px]" style={{ color: MUTED }}>Saturation drag (suppresses score)</div>
      </div>
    </div>
  );

  // 1A-LOV-5 — Sellout curve sparkline (Market Absorption).
  const maxSellout = Math.max(1, ...selloutCurve);
  const absorptionCurve = (
    <div className="rounded-md border p-2" style={{ borderColor: BORDER }}>
      <div className="mb-1 flex items-center justify-between text-[10px]" style={{ color: MUTED }}>
        <span>Sellout curve · Wk 1–5</span>
        <span className="font-semibold tabular-nums" style={{ color: NAVY }}>
          {selloutCurve[selloutCurve.length - 1] ?? 0}% Wk{selloutCurve.length}
        </span>
      </div>
      <div className="flex h-10 items-end gap-1">
        {selloutCurve.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{
              height: `${(v / maxSellout) * 100}%`,
              backgroundColor: v >= 60 ? "#a3142b" : v >= 30 ? "#925100" : "#1d6b32",
              opacity: 0.85,
            }}
            title={`${weekLabels[i] ?? `Wk ${i + 1}`}: ${v}% sold_out+waitlist`}
          />
        ))}
      </div>
    </div>
  );

  // 1A-LOV-4 — Market Balance band chips.
  const balanceBands = (
    <div className="flex flex-wrap gap-1">
      {MARKET_BALANCE_BANDS.map((b) => {
        const active = b.key === MARKET_BALANCE_ACTIVE_BAND;
        return (
          <span
            key={b.key}
            className={CHIP}
            style={{
              backgroundColor: active ? b.bg : "#fff",
              color: active ? b.fg : MUTED,
              border: `1px solid ${active ? b.bg : BORDER}`,
              fontWeight: active ? 700 : 500,
            }}
            title={`${b.label} · Coverage Ratio ${b.range}`}
          >
            {active && "●  "}
            {b.label} <span className="ml-1 opacity-70">{b.range}</span>
          </span>
        );
      })}
    </div>
  );


  return (
    <>
      <PageHeader
        title="Market Validation"
        subtitle="Phase 2 · Feature 1A — Market Validation Score (MVS) across the v1 city shortlist."
        hideJourneyBar
      />

      <DemoBanner />

      <section className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3" style={{ borderColor: BORDER }}>
        <div className="min-w-0">
          <h2 className="text-[13px] font-bold" style={{ color: NAVY }}>
            Austin calibration preview
          </h2>
          <p className="mt-0.5 text-[12px]" style={{ color: MUTED }}>
            Austin is not part of the demo shortlist below. Use the separate read-only preview for the live Austin pipeline output.
          </p>
        </div>
        <Link
          to="/mvs-preview"
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-semibold"
          style={{ borderColor: BLUE, color: BLUE, backgroundColor: SOFT }}
        >
          <BarChart3 size={14} />
          Open Austin MVS preview
        </Link>
      </section>

      {/* v1.1 — Decision-capture shortlist table (replaces the chip rail) */}
      <ShortlistTable
        rows={SHORTLIST_DEMO}
        activeCityId={activeCityId}
        onSelectCity={setActiveCityId}
      />

      {/* Decision points — what is Brett actually deciding on this page? */}
      <section className="mb-4 rounded-lg border p-3" style={{ borderColor: BORDER, backgroundColor: SOFT }}>
        <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: NAVY }}>
          Decision points on this page
        </h3>
        <ol className="ml-4 list-decimal space-y-0.5 text-[12px]" style={{ color: NAVY }}>
          <li>For each city: <strong>Pursue / Hold / Drop</strong> using the table above (Brett/Sam's call, persists per user).</li>
          <li>Across the shortlist: which 5–10 cities graduate to 1B site analysis (use the Pursue filter, then Export CSV).</li>
          <li>Per city: is the absorption signal believable (check the deep-dive sellout curve below)?</li>
          <li>Per city: is the market balance band reason enough to override a borderline Premium Enrichment Score?</li>
        </ol>
      </section>

      {/* Active city deep-dive panel */}
      {!isAnchor && (
        <div className="mb-3 rounded-md border p-2 text-[11px]" style={{ borderColor: BORDER, backgroundColor: "#fff1d6", color: "#925100" }}>
          Deep-dive below shows <strong>San Antonio, TX</strong> (the demo anchor). {activeRow.city}, {activeRow.state} wires up
          to the Manus pipeline in Week 3; the table above already carries that city's verdict.
        </div>
      )}

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
          <div className="flex w-[280px] shrink-0 flex-col items-end gap-2">
            <div className="text-right">
              <div className="text-[42px] font-black leading-none tabular-nums" style={{ color: NAVY }}>
                {data.composite}
              </div>
              <div className="mt-1 whitespace-nowrap text-[10px] uppercase tracking-wide" style={{ color: MUTED }}>
                Market Validation Score (MVS)
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
          Market Validation Score (MVS) ={"\n"}
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
          bottomSlot={absorptionCurve}
        />
        <SubScoreCard
          title="Scaled Operator"
          subtitle="Validated vs saturated by national operators?"
          weight={subs.scaledOperator.weight}
          value={subs.scaledOperator.value}
          signals={subs.scaledOperator.signals}
          formula={subs.scaledOperator.formula}
          confidence={subs.scaledOperator.confidence}
          topSlot={scaledDiagnostic}
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
          topSlot={balanceBands}
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
