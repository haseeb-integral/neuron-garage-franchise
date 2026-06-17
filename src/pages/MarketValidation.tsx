import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, BarChart3, ChevronDown, ChevronUp, Download, FileText, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { renderMvsBriefPdfBlob } from "@/lib/mvsBrief/MvsBriefDocument";
import { buildSampleBriefArgs } from "@/lib/mvsBrief/sampleBriefAdapter";

import { PageHeader } from "@/components/PageHeader";

import { LiveCityDeepDive } from "@/components/phase2-demo/LiveCityDeepDive";
import { LowConfidenceBadge } from "@/components/phase2-demo/LowConfidenceBadge";
import { PipelineStatusStrip, RunPipelineButton } from "@/components/phase2-demo/RunPipelineButton";
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
  const [exporting, setExporting] = useState(false);

  const handleExportSamplePdf = async () => {
    setExporting(true);
    try {
      const args = buildSampleBriefArgs(activeRow);
      const blob = await renderMvsBriefPdfBlob(args);
      const today = new Date().toISOString().slice(0, 10);
      const slug = activeRow.city.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mvs-brief-${slug}-${today}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("MVS brief PDF downloaded");
    } catch (err) {
      console.error("MVS brief PDF failed", err);
      toast.error(`PDF export failed: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setExporting(false);
    }
  };

  // Phase 7 — live overlay for every Tier A city flagged mvs_data_source='live'.
  // Hooks are called at fixed positions (one per Tier A city), so React's
  // rules-of-hooks invariant is preserved. Sample rows are untouched for
  // cities whose flag is still 'sample'.
  const austinLive       = useLiveMvs("Austin, TX");
  const newYorkLive      = useLiveMvs("New York, NY");
  const houstonLive      = useLiveMvs("Houston, TX");
  const chicagoLive      = useLiveMvs("Chicago, IL");
  const bostonLive       = useLiveMvs("Boston, MA");
  const sanAntonioLive   = useLiveMvs("San Antonio, TX");
  const philadelphiaLive = useLiveMvs("Philadelphia, PA");
  const losAngelesLive   = useLiveMvs("Los Angeles, CA");

  const liveOverlays = useMemo<Map<string, LiveOverlay>>(() => {
    const m = new Map<string, LiveOverlay>();
    const entries: { rowId: string; bundle: ReturnType<typeof useLiveMvs> }[] = [
      { rowId: "austin-tx",       bundle: austinLive },
      { rowId: "new-york-ny",     bundle: newYorkLive },
      { rowId: "houston-tx",      bundle: houstonLive },
      { rowId: "chicago-il",      bundle: chicagoLive },
      { rowId: "boston-ma",       bundle: bostonLive },
      { rowId: "san-antonio-tx",  bundle: sanAntonioLive },
      { rowId: "philadelphia-pa", bundle: philadelphiaLive },
      { rowId: "los-angeles-ca",  bundle: losAngelesLive },
    ];
    for (const { rowId, bundle } of entries) {
      // Show live overlay for any city that has been *run* (has a result),
      // not only cities flipped to live. Keeps "click city → see that city's
      // detail" consistent; flip-to-live still controls what the rest of the
      // app reads, but the deep-dive on this page follows the active row.
      if (bundle.result) {
        const r = bundle.result;
        m.set(rowId, {
          composite: r.mvs,
          pricing: r.scores.pricingAcceptance,
          absorption: r.scores.marketAbsorption,
          scaledOperator: r.scores.scaledOperator,
          diversity: r.scores.enrichmentDiversity,
          depth: r.scores.marketDepth,
          balance: r.scores.marketBalance,
          lowConfidence: bundle.flag?.low_confidence_badge ?? false,
        });
      }
    }
    return m;
  }, [
    austinLive, newYorkLive, houstonLive, chicagoLive,
    bostonLive, sanAntonioLive, philadelphiaLive, losAngelesLive,
  ]);

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



      <section className="mb-5 flex flex-wrap items-center justify-end gap-2">
        <Link
          to="/market-validation/rollout"
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold text-white"
          style={{ backgroundColor: BLUE }}
        >
          Tier A Rollout →
        </Link>
      </section>


      {/* v1.1 — Decision-capture shortlist table (replaces the chip rail) */}
      <ShortlistTable
        rows={SHORTLIST_DEMO}
        activeCityId={activeCityId}
        onSelectCity={setActiveCityId}
        liveOverlays={liveOverlays}
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

      {/* Live deep-dive for the active city. Always renders — no demo fallback. */}
      <LiveCityDeepDive
        cityKey={`${activeRow.city}, ${activeRow.state}`}
        cityDisplay={activeRow.city}
        stateDisplay={activeRow.state}
      />



      <footer
        className="flex items-center gap-2 rounded-lg border bg-white p-3 text-[11px]"
        style={{ borderColor: BORDER, color: MUTED }}
      >
        <FileText size={14} />
        Formulas, sub-score weights, and acceptance criteria are locked in
        <code className="rounded bg-[#f7faff] px-1 py-px text-[#174be8]">.lovable/phase-2/phase-2-sow.md</code>
        Item 1 (Feature 1A). Pipeline-backed read for each Tier A city.
      </footer>
    </>
  );
}
