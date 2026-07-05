import { useCallback, useEffect, useMemo, useState } from "react";
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
import { SHORTLIST_SEED, type ShortlistRow } from "@/lib/mvs/shortlistSeed";
import { useShortlistAdditions } from "@/lib/mvs/useShortlistAdditions";
import { AddCityDialog } from "@/components/phase2-demo/AddCityDialog";
import { ExportAllValidatedButton } from "@/components/phase2-demo/ExportAllValidatedButton";

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

/**
 * Small status strip — shows the wall-clock time when this page's MVS scores
 * were last computed from the database, plus a "Refresh scores" button that
 * re-reads from the database without re-running the pipeline. Cache lives
 * inside React Query (see useLiveMvs), so on return visits scores show
 * instantly from the last visit rather than re-fetching all 63 rows.
 */
function ScoresCacheIndicator({
  bundles,
}: {
  bundles: { cachedAt: number | null; loading: boolean }[];
}) {
  const queryClient = useQueryClient();
  const [, setTick] = useState(0);
  // Re-render every 30s so the "as of" timestamp stays fresh.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const newestCachedAt = bundles.reduce<number | null>((acc, b) => {
    if (!b.cachedAt) return acc;
    if (acc == null || b.cachedAt > acc) return b.cachedAt;
    return acc;
  }, null);
  const anyLoading = bundles.some((b) => b.loading);

  const isFetching = queryClient.isFetching({ queryKey: [MVS_QUERY_KEY] }) > 0;

  const label = (() => {
    if (anyLoading && !newestCachedAt) return "Computing scores…";
    if (!newestCachedAt) return "No cached scores yet";
    const ageMs = Date.now() - newestCachedAt;
    if (ageMs < 60_000) return "Scores as of just now";
    const mins = Math.round(ageMs / 60_000);
    if (mins < 60) return `Scores as of ${mins} min ago`;
    const hrs = Math.round(mins / 60);
    return `Scores as of ${hrs}h ago`;
  })();

  return (
    <div
      className="mb-3 flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-[11px]"
      style={{ borderColor: BORDER, backgroundColor: SOFT, color: MUTED }}
    >
      <span>
        {label}
        {newestCachedAt && (
          <span className="ml-1 text-[10px]">
            ({new Date(newestCachedAt).toLocaleTimeString()})
          </span>
        )}
      </span>
      <span className="text-[10px]">
        · Same math, just remembered between visits. Auto-refreshes after pipeline runs, overrides,
        and QA resolutions.
      </span>
      <button
        type="button"
        onClick={() => invalidateAllMvs(queryClient)}
        disabled={isFetching}
        className="ml-auto inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold disabled:opacity-60"
        style={{ borderColor: BLUE, color: BLUE, backgroundColor: "#fff" }}
        title="Re-read scores from the database. Does not re-run the pipeline."
      >
        {isFetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        Refresh scores
      </button>
    </div>
  );
}



// Dead helpers (STATUS_STYLE, OVERLAP_STYLE, SubScoreCard, etc.) were
// removed in the no-fake-numbers cleanup — the live deep-dive is rendered
// Invisible per-row probe: calls useLiveMvs for one city and reports the
// overlay + cache stats up to the parent. Mounting one of these per shortlist
// row gives us stable hook order (one hook per component instance) while
// keeping the city list fully dynamic — manager-added cities work too.
function LiveOverlayProbe({
  rowId,
  cityKey,
  onOverlay,
  onBundle,
}: {
  rowId: string;
  cityKey: string;
  onOverlay: (rowId: string, overlay: LiveOverlay | null) => void;
  onBundle: (rowId: string, stats: { cachedAt: number | null; loading: boolean }) => void;
}) {
  const bundle = useLiveMvs(cityKey);
  const r = bundle.result;
  const composite = r?.mvs ?? null;
  const pricing = r?.scores.pricingAcceptance ?? null;
  const scaledOperator = r?.scores.scaledOperator ?? null;
  const diversity = r?.scores.enrichmentDiversity ?? null;
  const depth = r?.scores.marketDepth ?? null;
  const balance = r?.scores.marketBalance ?? null;
  const enrichmentThinMarket =
    typeof r?.inputs.enrichmentDiversity?.premiumProviderCount === "number" &&
    r.inputs.enrichmentDiversity.premiumProviderCount < 4;

  useEffect(() => {
    if (r) {
      onOverlay(rowId, {
        composite,
        pricing,
        scaledOperator,
        diversity,
        depth,
        balance,
        // low_confidence_badge was tied to a retired signal (no_reg_page_pct);
        // force false to stop the false warning.
        lowConfidence: false,
        enrichmentThinMarket,
      });
    } else {
      onOverlay(rowId, null);
    }
  }, [rowId, r, composite, pricing, scaledOperator, diversity, depth, balance, enrichmentThinMarket, onOverlay]);

  useEffect(() => {
    onBundle(rowId, { cachedAt: bundle.cachedAt, loading: bundle.loading });
  }, [rowId, bundle.cachedAt, bundle.loading, onBundle]);

  return null;
}



export default function MarketValidation() {
  const { rows: additions, addCity } = useShortlistAdditions();

  // Merge built-in shortlist seed + manager-added cities. Every row carries
  // only id/city/state. Scores come from `liveOverlays`; cities without a
  // live result render as "Not yet scored" — no fake fallback numbers.
  const allShortlistRows = useMemo<ShortlistRow[]>(() => {
    const extras: ShortlistRow[] = additions.map((a) => ({
      id: `${a.city.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${a.state.toLowerCase()}`,
      city: a.city,
      state: a.state,
    }));
    // Dedupe by id — seed cities take precedence over user additions that
    // would slug to the same id (e.g. an addition for "New York, NY").
    const seen = new Set<string>();
    const out: ShortlistRow[] = [];
    for (const r of [...SHORTLIST_SEED, ...extras]) {
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


  // Phase 8 fix — drive live overlays from the actual shortlist rows (not a
  // hardcoded list). Each shortlist row mounts one <LiveOverlayProbe> which
  // calls useLiveMvs for its city and reports the overlay + cache stats up.
  // This lets manager-added cities (San Diego, Denver, …) show their live
  // scores in the table instead of staying "Not yet scored" forever.
  const [overlays, setOverlays] = useState<Map<string, LiveOverlay>>(new Map());
  const [bundleStats, setBundleStats] = useState<
    Map<string, { cachedAt: number | null; loading: boolean }>
  >(new Map());

  const handleOverlay = useCallback((rowId: string, overlay: LiveOverlay | null) => {
    setOverlays((prev) => {
      const existing = prev.get(rowId);
      if (!overlay && !existing) return prev;
      if (
        overlay &&
        existing &&
        existing.composite === overlay.composite &&
        existing.pricing === overlay.pricing &&
        existing.scaledOperator === overlay.scaledOperator &&
        existing.diversity === overlay.diversity &&
        existing.depth === overlay.depth &&
        existing.balance === overlay.balance &&
        existing.lowConfidence === overlay.lowConfidence &&
        existing.enrichmentThinMarket === overlay.enrichmentThinMarket
      ) {
        return prev;
      }
      const next = new Map(prev);
      if (overlay) next.set(rowId, overlay);
      else next.delete(rowId);
      return next;
    });
  }, []);

  const handleBundle = useCallback(
    (rowId: string, stats: { cachedAt: number | null; loading: boolean }) => {
      setBundleStats((prev) => {
        const existing = prev.get(rowId);
        if (existing && existing.cachedAt === stats.cachedAt && existing.loading === stats.loading) {
          return prev;
        }
        const next = new Map(prev);
        next.set(rowId, stats);
        return next;
      });
    },
    []
  );

  const bundleStatsList = useMemo(() => Array.from(bundleStats.values()), [bundleStats]);

  // Removed dead helpers in the no-fake-numbers cleanup: `isActiveLive`,
  // hardcoded `scaledDiagnostic` ("5 / 8", "2.1") and `balanceBands` chips
  // were defined but never rendered. The live deep-dive below derives every
  // number from the pipeline result.


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
          (camp providers, pricing, operator presence, enrichment depth). It surfaces
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
                {/* QA queue link removed — Market Absorption pillar retired, weeks pipeline no longer runs. */}
              </div>
            </div>
            <p className="mt-1 text-[12px]" style={{ color: NAVY }}>
              The composite scores below come from a live data pipeline. To add a new city or refresh
              an existing one's score, open the scoring console and click <strong>Run</strong> on that
              city (≈1–2 min per city). Results flow back into the table here automatically.
            </p>

          </div>

        </div>
      </section>

      <ScoresCacheIndicator bundles={bundleStatsList} />

      {/* v1.1 — Decision-capture shortlist table (replaces the chip rail) */}
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[12px] text-[#526078]">
          <strong className="text-[#07142f]">{allShortlistRows.length}</strong> cities in shortlist
          {additions.length > 0 && (
            <span className="ml-1 text-[#8a96aa]">({additions.length} added by you)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ExportAllValidatedButton />
          <AddCityDialog onAdd={addCity} />
        </div>
      </div>

      {/* Invisible probes — one per shortlist row. Each calls useLiveMvs for
          its city and pushes the overlay + cache stats up to the parent. */}
      {allShortlistRows.map((r) => (
        <LiveOverlayProbe
          key={r.id}
          rowId={r.id}
          cityKey={`${r.city}, ${r.state}`}
          onOverlay={handleOverlay}
          onBundle={handleBundle}
        />
      ))}

      <ShortlistTable
        rows={allShortlistRows}
        activeCityId={activeCityId}
        onSelectCity={setActiveCityId}
        liveOverlays={overlays}
      />


      {/* Decision points */}
      <section className="mb-4 rounded-lg border p-3" style={{ borderColor: BORDER, backgroundColor: SOFT }}>
        <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: NAVY }}>
          What to do on this page
        </h3>
        <ol className="ml-4 list-decimal space-y-0.5 text-[12px]" style={{ color: NAVY }}>
          <li>Review each city and mark it <strong>Pursue, Hold, or Drop</strong>.</li>
          <li>Filter to <strong>Pursue</strong> cities and <strong>Export CSV</strong> — those are your finalists for the next phase.</li>
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
        Composite scores are recomputed live from the underlying provider and pricing data each time the page loads.
      </footer>

    </>
  );
}
