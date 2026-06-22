import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ChevronDown, ChevronUp, Download, FileText, Loader2, MapPin, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { PageHeader } from "@/components/PageHeader";

import { LiveCityDeepDive } from "@/components/phase2-demo/LiveCityDeepDive";
import { LowConfidenceBadge } from "@/components/phase2-demo/LowConfidenceBadge";

import { SampleDataBadge } from "@/components/phase2-demo/SampleDataBadge";
import { ShortlistTable, type LiveOverlay } from "@/components/phase2-demo/ShortlistTable";
import { Slider } from "@/components/ui/slider";
import { useLiveMvs, invalidateAllMvs, MVS_QUERY_KEY } from "@/lib/mvs/useLiveMvs";
import {
  sanAntonioMarketValidationDemo,
  MARKET_BALANCE_ACTIVE_BAND,
  MARKET_BALANCE_BANDS,
  QA_QUEUE_FLAGGED_COUNT,
  SCRAPE_CADENCE,
  SHORTLIST_DEMO,
  type AbsorptionStatus,
  type ConfidenceLevel,
  type ShortlistRow,
} from "@/data/phase2DemoData";
import { useShortlistAdditions } from "@/lib/mvs/useShortlistAdditions";
import { AddCityDialog } from "@/components/phase2-demo/AddCityDialog";

const NAVY = "#07142f";
const MUTED = "#526078";
const BORDER = "#eef2f7";
const SOFT = "#f7faff";
const BLUE = "#174be8";

function RefreshAllButton() {
  const [busy, setBusy] = useState(false);
  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("mvs-refresh-all", { body: {} });
      if (error) {
        toast.error("Failed to start refresh", { description: error.message });
        return;
      }
      const triggered = (data?.triggered ?? []).length;
      const skipped = (data?.skipped ?? []).length;
      toast.success(`Pipeline kicked off for ${triggered} city${triggered === 1 ? "" : "ies"}`, {
        description: skipped > 0
          ? `${skipped} skipped (already running). Watch the scoring console for progress.`
          : "Watch the scoring console for per-city progress (~1–2 min each).",
      });
    } catch (e) {
      toast.error("Refresh failed", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      title="Re-run the extractor pipeline for every Tier A city that already has live data."
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold disabled:opacity-60"
      style={{ borderColor: BLUE, color: BLUE, backgroundColor: "#fff" }}
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
      Re-run pipeline (all live cities)
    </button>
  );
}



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
  const { rows: additions, addCity } = useShortlistAdditions();

  // Merge built-in shortlist + manager-added cities. Added cities start at 0
  // and get filled in once their pipeline run finishes on the Scoring Console.
  const allShortlistRows = useMemo<ShortlistRow[]>(() => {
    const extras: ShortlistRow[] = additions.map((a) => ({
      id: `${a.city.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${a.state.toLowerCase()}`,
      city: a.city,
      state: a.state,
      composite: 0,
      tier: "Not yet scored",
      pricing: 0,
      absorption: 0,
      scaledOperator: 0,
      diversity: 0,
      depth: 0,
      balanceBand: "Balanced",
    }));
    // Dedupe by id — demo rows win over additions that slug to the same id
    // (e.g. an addition for "New York / NY" collides with the demo NYC row).
    const seen = new Set<string>();
    const out: ShortlistRow[] = [];
    for (const r of [...SHORTLIST_DEMO, ...extras]) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      out.push(r);
    }
    return out;
  }, [additions]);

  const [activeCityId, setActiveCityId] = useState<string>(
    () => (typeof window !== "undefined" && localStorage.getItem("mvs-active-city")) || "san-antonio-tx"
  );
  useEffect(() => {
    try { localStorage.setItem("mvs-active-city", activeCityId); } catch { /* ignore */ }
  }, [activeCityId]);
  const activeRow = allShortlistRows.find((r) => r.id === activeCityId) ?? allShortlistRows[0];
  const isAnchor = activeCityId === "san-antonio-tx";


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
  const indianapolisLive = useLiveMvs("Indianapolis, IN");

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
      { rowId: "indianapolis-in", bundle: indianapolisLive },
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
    indianapolisLive,
  ]);

  // Boston calibration gate — warn if Boston's composite isn't in the top
  // quartile of the live Tier A set. Quietly skips when <6 cities have run.
  const bostonCalibration = useMemo(() => {
    const composites: { id: string; composite: number }[] = [];
    for (const [id, ov] of liveOverlays.entries()) {
      if (typeof ov.composite === "number" && Number.isFinite(ov.composite)) {
        composites.push({ id, composite: ov.composite });
      }
    }
    const boston = composites.find((c) => c.id === "boston-ma");
    if (!boston || composites.length < 6) return null;
    const sorted = [...composites].sort((a, b) => b.composite - a.composite);
    const rank = sorted.findIndex((c) => c.id === "boston-ma") + 1;
    const cutoffIdx = Math.max(0, Math.ceil(sorted.length / 4) - 1);
    const cutoff = sorted[cutoffIdx].composite;
    const pass = boston.composite >= cutoff;
    return {
      pass,
      rank,
      total: sorted.length,
      bostonScore: boston.composite,
      cutoff,
    };
  }, [liveOverlays]);

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
        subtitle="Score and rank candidate cities for Neuron Garage expansion using live market data."
        hideJourneyBar
      />

      <section className="mb-5 rounded-lg border p-4" style={{ borderColor: "#dbe6ff", backgroundColor: "#f5f8ff" }}>
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: BLUE }}>
          What this feature does
        </div>
        <p className="text-[12px] leading-relaxed" style={{ color: NAVY }}>
          Market Validation scores each candidate expansion city on a 0–100 composite using live data
          (camp providers, pricing, weekly absorption, operator presence, enrichment depth). It surfaces
          the strongest markets so you can decide which cities advance to site-level analysis.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border bg-white p-3" style={{ borderColor: BORDER }}>
            <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: NAVY }}>
              1 · Review &amp; decide (this page)
            </div>
            <ul className="ml-4 mt-1 list-disc space-y-0.5 text-[12px]" style={{ color: NAVY }}>
              <li>Pick a city in the shortlist below to see its deep-dive.</li>
              <li>Mark each city <strong>Pursue / Hold / Drop</strong>.</li>
              <li>Export the shortlist as CSV or download a per-city PDF brief.</li>
            </ul>
          </div>
          <div className="rounded-md border bg-white p-3" style={{ borderColor: BORDER }}>
            <div className="flex items-start justify-between gap-2">
              <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: NAVY }}>
                2 · (Re)score cities
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <RefreshAllButton />
                <Link
                  to="/market-validation/rollout"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold text-white"
                  style={{ backgroundColor: BLUE }}
                >
                  Open scoring console →
                </Link>
                <Link
                  to="/mvs-qa-queue"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold"
                  style={{ borderColor: BLUE, color: BLUE, backgroundColor: "#fff" }}
                >
                  Review QA queue
                  {QA_QUEUE_FLAGGED_COUNT > 0 && (
                    <span
                      className="inline-flex min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                      style={{ backgroundColor: "#a3142b" }}
                    >
                      {QA_QUEUE_FLAGGED_COUNT}
                    </span>
                  )}
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
            <p className="mt-1 text-[12px]" style={{ color: NAVY }}>
              The composite scores below come from a live data pipeline. To add a new city or refresh
              an existing one's score, open the scoring console and click <strong>Run</strong> on that
              city (≈1–2 min per city). Results flow back into the table here automatically.
            </p>
            <p className="mt-1 text-[11px]" style={{ color: MUTED }}>
              QA queue = manager review of low-confidence week extractions flagged by the pipeline.
            </p>
          </div>

        </div>
      </section>

      <ScoresCacheIndicator
        bundles={[
          austinLive, newYorkLive, houstonLive, chicagoLive, bostonLive,
          sanAntonioLive, philadelphiaLive, losAngelesLive, indianapolisLive,
        ]}
      />

      {/* v1.1 — Decision-capture shortlist table (replaces the chip rail) */}
      {bostonCalibration && !bostonCalibration.pass && (
        <div
          className="mb-3 rounded-md border px-3 py-2 text-[12px]"
          style={{ borderColor: "#f3c2cb", backgroundColor: "#fdecef", color: "#7a1226" }}
          role="alert"
        >
          <strong>⚠ Boston calibration check failed.</strong>{" "}
          Boston composite <strong>{bostonCalibration.bostonScore.toFixed(0)}</strong> ranks{" "}
          <strong>{bostonCalibration.rank} of {bostonCalibration.total}</strong> Tier A cities
          (top-quartile cutoff: <strong>{bostonCalibration.cutoff.toFixed(0)}</strong>). Review
          pillar weights before showing this set to a client.
        </div>
      )}
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[12px] text-[#526078]">
          <strong className="text-[#07142f]">{allShortlistRows.length}</strong> cities in shortlist
          {additions.length > 0 && (
            <span className="ml-1 text-[#8a96aa]">({additions.length} added by you)</span>
          )}
          {bostonCalibration?.pass && (
            <span className="ml-2 text-[#1d6b32]">
              · Boston calibration OK (rank {bostonCalibration.rank}/{bostonCalibration.total})
            </span>
          )}
        </div>
        <AddCityDialog onAdd={addCity} />
      </div>
      <ShortlistTable
        rows={allShortlistRows}
        activeCityId={activeCityId}
        onSelectCity={setActiveCityId}
        liveOverlays={liveOverlays}
      />

      {/* Decision points */}
      <section className="mb-4 rounded-lg border p-3" style={{ borderColor: BORDER, backgroundColor: SOFT }}>
        <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: NAVY }}>
          What to do on this page
        </h3>
        <ol className="ml-4 list-decimal space-y-0.5 text-[12px]" style={{ color: NAVY }}>
          <li>Review each city and mark it <strong>Pursue, Hold, or Drop</strong>.</li>
          <li>Filter to <strong>Pursue</strong> cities and <strong>Export CSV</strong> — those are your finalists for the next phase.</li>
          <li>Check the sellout curve in the deep-dive to confirm demand is real and sustained, not a blip.</li>
          <li>Use the market balance band as a tie-breaker: a city with too many competitors may be riskier than its score suggests.</li>
        </ol>
      </section>

      {/* Live deep-dive for the active city */}
      <LiveCityDeepDive
        cityKey={`${activeRow.city}, ${activeRow.state}`}
        cityDisplay={activeRow.city}
        stateDisplay={activeRow.state}
      />

      <footer
        className="mt-4 flex items-center gap-2 rounded-lg border bg-white p-3 text-[11px]"
        style={{ borderColor: BORDER, color: MUTED }}
      >
        <FileText size={14} />
        Composite scores are recomputed live from the underlying provider, pricing, and absorption data each time the page loads.
      </footer>

    </>
  );
}
