import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CityData } from "@/data/cityData";
import { toast } from "sonner";
import { getSignalGeography, GEO_BADGE_CLASS } from "@/lib/signalGeography";
import { calibratePillarForDisplay } from "@/lib/marketView";
import { buildMarketReportPdf } from "./market-report/marketReportPdf";
import type { LiveSignal, MetricCategory, MetricStatus } from "./market-report/marketReportTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  market: CityData;
  categoryScores: Record<string, number>;
  refreshVersion?: number;
  autoDownload?: boolean;
}

const CAT_LABELS: { key: string; dbKey: MetricCategory; label: string }[] = [
  { key: "demand", dbKey: "demand", label: "Demand" },
  { key: "competitiveLandscape", dbKey: "competitive_landscape", label: "Competitive Opportunity" },
  { key: "franchiseeSupply", dbKey: "franchisee_supply", label: "TAM Teachers" },
];

const PRIORITY_SIGNAL_KEYS = [
  "median_household_income",
  "income_100k_plus_pct",
  "income_150k_plus_pct",
  "children_5_12_count",
  "children_5_12_pct",
  "education_bachelors_plus_pct",
  "summer_camps_per_10k_children",
  "public_elementary_teacher_count",
  "col_salary_index",
  "rental_venue_count",
  "guide_wage_proxy",
  "robotics_maker_space_count",
  "sow_metric_coverage_readiness",
];

function buildSeededFallbackSignals(market: CityData): LiveSignal[] {
  const scored = (market as any).scored;
  if (!scored) return [];
  const childrenPct = Number((market as any).childrenPct ?? (market as any).children_pct ?? 0);
  const seeded = (
    signal_key: string,
    label: string,
    value: string | number | null | undefined,
    metric_category: MetricCategory,
    used_in_score: boolean,
  ): LiveSignal => ({
    signal_key,
    label,
    value: value ?? null,
    source: "Pre-seeded",
    raw_data: { status: "proxy", used_in_score, metric_category },
  });
  return [
    seeded("children_5_12_count", "Children Ages 5–12", scored.children_5_12, "demand", true),
    seeded("children_5_12_pct", "% Population Ages 5–12", childrenPct || null, "demand", true),
    seeded("median_household_income", "Median Household Income", scored.median_household_income, "demand", true),
    seeded("public_elementary_count", "Public elementary schools (NCES CCD)", scored.public_elementary_count, "franchisee_supply", true),
    seeded("public_elementary_enrollment", "Public elementary enrollment", scored.public_elementary_enrollment, "franchisee_supply", false),
  ].filter((row) => row.value != null);
}

const getStatus = (s: LiveSignal): MetricStatus => s.raw_data?.status ?? "proxy";
const getCategory = (s: LiveSignal): MetricCategory | null => s.raw_data?.metric_category ?? null;

function statusClass(status: MetricStatus) {
  if (status === "live") return "bg-[#e6f7ef] text-[#0ea66e]";
  if (status === "proxy") return "bg-[#eaf0ff] text-[#174be8]";
  if (status === "missing") return "bg-[#f3f6fb] text-[#526078]";
  return "bg-[#fff6dc] text-[#b8860b]";
}

const csvEscape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

function downloadCsv(filename: string, rows: unknown[][]) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function MarketReportModal({ open, onClose, market, categoryScores, refreshVersion = 0, autoDownload = false }: Props) {
  const stateAbbr = market.state === "Texas" ? "TX" : market.state === "Florida" ? "FL" : market.state;
  const [loading, setLoading] = useState(false);
  const [liveSignals, setLiveSignals] = useState<LiveSignal[]>([]);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const autoFiredRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    try {
      // Legacy `city_market_signals` was severed on 2026-05-21. Evidence rows
      // come from the seeded fallback (us_cities_scored).
      setLiveSignals(market.cityId ? buildSeededFallbackSignals(market) : []);
    } finally {
      setLoading(false);
    }
  }, [open, market, refreshVersion]);

  const liveCount = liveSignals.filter((s) => getStatus(s) === "live").length;
  const proxyCount = liveSignals.filter((s) => getStatus(s) === "proxy").length;
  const missingCount = liveSignals.filter((s) => getStatus(s) === "missing").length;

  const prioritySignals = useMemo(() => {
    return [...liveSignals]
      .filter((s) => getStatus(s) !== "missing")
      .sort((a, b) => {
        const ai = PRIORITY_SIGNAL_KEYS.indexOf(a.signal_key ?? "");
        const bi = PRIORITY_SIGNAL_KEYS.indexOf(b.signal_key ?? "");
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      })
      .slice(0, 10);
  }, [liveSignals]);

  const coverageByCategory = CAT_LABELS.map((cat) => {
    const rows = liveSignals.filter((s) => getCategory(s) === cat.dbKey);
    return {
      ...cat,
      total: rows.length,
      live: rows.filter((s) => getStatus(s) === "live").length,
      proxy: rows.filter((s) => getStatus(s) === "proxy").length,
      missing: rows.filter((s) => getStatus(s) === "missing").length,
    };
  });

  const handleDownloadCsv = () => {
    if (!liveSignals.length) {
      toast.error("No live SOW signals found to export");
      return;
    }
    const rows = [
      ["Category", "Metric", "Value", "Geography", "Counts Toward Score", "Status", "Source", "Confidence", "Notes", "Source URL"],
      ...liveSignals.map((s) => {
        const geo = getSignalGeography(s.source, s.signal_key);
        return [
          CAT_LABELS.find((c) => c.dbKey === getCategory(s))?.label ?? "Other",
          s.label ?? s.signal_key ?? "",
          s.value ?? "",
          geo.full,
          s.raw_data?.used_in_score ? "Yes" : "No",
          getStatus(s),
          s.source ?? "",
          s.confidence == null ? "" : `${Math.round(s.confidence * 100)}%`,
          s.raw_data?.notes ?? "",
          s.source_url ?? "",
        ];
      }),
    ];
    downloadCsv(`${market.city.toLowerCase().replace(/\s+/g, "-")}-sow-source-evidence.csv`, rows);
    toast.success("SOW source evidence exported");
  };

  const handleDownloadPdf = async () => {
    if (loading) {
      toast.error("Report data still loading");
      return;
    }
    setGeneratingPdf(true);
    try {
      const pdf = buildMarketReportPdf({
        market,
        stateAbbr,
        categoryScores,
        signals: liveSignals,
        prioritySignals,
        coverageByCategory,
        liveCount,
        proxyCount,
        missingCount,
      });
      const today = new Date().toISOString().slice(0, 10);
      const slug = market.city.toLowerCase().replace(/\s+/g, "-");
      pdf.save(`${slug}-${stateAbbr.toLowerCase()}-market-report-${today}.pdf`);
      toast.success("PDF report downloaded");
    } catch (err) {
      console.error("PDF generation failed", err);
      toast.error("PDF generation failed");
    } finally {
      setGeneratingPdf(false);
    }
  };

  useEffect(() => {
    if (!open) {
      autoFiredRef.current = false;
      return;
    }
    if (autoDownload && !loading && !autoFiredRef.current) {
      autoFiredRef.current = true;
      const t = setTimeout(() => { handleDownloadPdf(); }, 250);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoDownload, loading]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-[#07142f]">{market.city}, {stateAbbr} SOW Market Report Preview</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 text-[12.5px] text-[#14233b] bg-white">
          <section className="rounded-lg border border-[#eef2f7] bg-[#f8fafe] p-3">
            <h4 className="text-[13px] font-bold text-[#07142f] mb-1">Market Summary</h4>
            <p className="leading-snug text-[#3a4c72]">
              This report preview uses the live SOW metric registry for {market.city}. It separates confirmed live metrics, proxy-backed metrics, and missing source integrations so the score is auditable instead of relying on hardcoded sample signals.
            </p>
            {loading && <p className="mt-2 text-[11px] text-[#526078]">Loading live report evidence…</p>}
          </section>

          <section>
            <h4 className="text-[13px] font-bold text-[#07142f] mb-2">SOW Coverage Status</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border border-[#eef2f7] p-3">
                <p className="text-2xl font-black text-[#0ea66e]">{liveCount}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8794ab]">Live</p>
              </div>
              <div className="rounded-md border border-[#eef2f7] p-3">
                <p className="text-2xl font-black text-[#174be8]">{proxyCount}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8794ab]">Proxy</p>
              </div>
              <div className="rounded-md border border-[#eef2f7] p-3">
                <p className="text-2xl font-black text-[#526078]">{missingCount}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8794ab]">Missing</p>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-[13px] font-bold text-[#07142f] mb-2">Category Scores</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {CAT_LABELS.map((c) => {
                const raw = categoryScores[c.key];
                const display = raw == null ? null : calibratePillarForDisplay(Number(raw));
                return (
                  <div key={c.key}>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-[#526078]">{c.label}</span>
                      <span className="font-semibold text-[#07142f]">{display ?? "—"}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#e8edf6] mt-1">
                      <div className="h-full rounded-full bg-[#174be8]" style={{ width: `${display ?? 0}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h4 className="text-[13px] font-bold text-[#07142f] mb-1">SOW Category Coverage</h4>
            <div className="space-y-1">
              {coverageByCategory.map((c) => (
                <div key={c.dbKey} className="flex items-center justify-between border-b border-[#f3f5f9] py-1">
                  <span className="text-[#526078]">{c.label}</span>
                  <span className="font-medium text-[#07142f]">{c.live} live · {c.proxy} proxy · {c.missing} missing</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h4 className="text-[13px] font-bold text-[#07142f] mb-1">Key Live / Proxy Market Signals</h4>
            {prioritySignals.length === 0 ? (
              <p className="text-[#526078]">No live/proxy SOW signals found yet. Run the SOW coverage refresh first.</p>
            ) : (
              <ul className="space-y-1">
                {prioritySignals.map((s) => {
                  const status = getStatus(s);
                  const geo = getSignalGeography(s.source, s.signal_key);
                  const used = Boolean(s.raw_data?.used_in_score);
                  return (
                    <li key={s.id ?? s.signal_key} className="flex items-center justify-between gap-3 border-b border-[#f3f5f9] py-1">
                      <span className="flex min-w-0 items-center gap-1.5 text-[#526078]">
                        <span className={`rounded-full px-1.5 py-px text-[9px] font-bold uppercase ${statusClass(status)}`}>{status}</span>
                        <span className={`rounded-full border px-1.5 py-px text-[9px] font-bold uppercase ${GEO_BADGE_CLASS[geo.level]}`} title={geo.full}>{geo.short}</span>
                        <span
                          className={`rounded-full border px-1.5 py-px text-[9px] font-bold uppercase ${used ? "border-[#bfead6] bg-[#e6f7ef] text-[#0ea66e]" : "border-[#e5eaf2] bg-[#f3f6fb] text-[#8794ab]"}`}
                          title={used ? "Counts toward the composite score" : "Informational only"}
                        >
                          {used ? "✓ Counts" : "Info"}
                        </span>
                        <span className="truncate">{s.label ?? s.signal_key}</span>
                      </span>
                      <span className="shrink-0 font-medium text-[#07142f]">{s.value ?? "—"}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <h4 className="text-[13px] font-bold text-[#07142f] mb-1">Recommendation</h4>
            <p className="leading-snug text-[#3a4c72]">
              Treat {market.city} as a high-priority market only after reviewing the proxy and missing metrics. The current live/proxy coverage is useful for screening, while pricing, weather, Google Trends, state education, and rental-cost integrations should be completed for a final investment-grade score.
            </p>
          </section>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleDownloadCsv}>Download Source CSV</Button>
          <Button variant="outline" onClick={handleDownloadPdf} disabled={loading || generatingPdf}>
            {generatingPdf ? "Generating PDF…" : "Download PDF Report"}
          </Button>
          <Button className="bg-[#174be8] hover:bg-[#1240c9] text-white" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
