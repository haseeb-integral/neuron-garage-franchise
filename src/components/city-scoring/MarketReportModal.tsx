import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { CityData } from "@/data/cityData";
import { toast } from "sonner";
import { buildPillarView, type PillarKey } from "@/lib/marketView";
import { bandFromDisplayScore, tierFromDisplayScore } from "@/lib/cityTiers";
import { useCityNarrative } from "@/lib/useCityNarrative";
import { SIGNAL_EXPLAIN } from "./signalExplain";
import type { SigRow } from "./ExecutiveSummaryPanel";
import { buildMarketReportPdf } from "./market-report/marketReportPdf";

interface Props {
  open: boolean;
  onClose: () => void;
  market: CityData;
  categoryScores: Record<string, number>;
  sigRows: SigRow[];
  cityId: string | null;
  autoDownload?: boolean;
  /**
   * Canonical Total Score for the selected market — the SAME number shown in
   * the table row, center-panel gauge, and spreadsheet. Sourced from
   * marketView.composite via CityScoring.tsx. The report MUST NOT recompute
   * this from pillar averages (that drift was the May 26 Nashville bug:
   * report said 75/Tier C while the screen said 99/Tier A).
   */
  detailScore: number;
}

const CAT_LABELS: { key: PillarKey; label: string }[] = [
  { key: "demand", label: "Demand" },
  { key: "competitiveLandscape", label: "Competitive Opportunity" },
  { key: "franchiseeSupply", label: "Operator & Venue Supply" },
];

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

export function MarketReportModal({ open, onClose, market, categoryScores, sigRows, cityId, autoDownload = false, detailScore }: Props) {
  const stateAbbr = market.state === "Texas" ? "TX" : market.state === "Florida" ? "FL" : market.state;
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const autoFiredRef = useRef(false);

  // Canonical Total Score comes from CityScoring.tsx (marketView.composite).
  // Round defensively in case a string slipped through.
  const totalScore = Math.round(Number(detailScore) || 0);

  const band = bandFromDisplayScore(totalScore);
  const tier = tierFromDisplayScore(totalScore);
  const verdictLabel = band === "strong" ? "high-opportunity" : band === "moderate" ? "moderate-opportunity" : "low-opportunity";

  const pillars = buildPillarView(categoryScores as Partial<Record<PillarKey, number>>);
  const pillarDisplay = (key: PillarKey): number => pillars[key]?.display ?? 0;
  const signalRows = useMemo(() => sigRows.filter((r) => r.value !== "—"), [sigRows]);


  const { data: narrative, loading: narrativeLoading, error: narrativeError, regenerate } = useCityNarrative({
    cityId,
    weightsHash: JSON.stringify({
      score: detailScore,
      tier,
      pillars: {
        demand: pillarDisplay("demand"),
        tam_teachers: pillarDisplay("franchiseeSupply"),
        competitive_opportunity: pillarDisplay("competitiveLandscape"),
      },
      signals: signalRows.map((r) => ({
        key: r.key,
        value: r.value,
        benchmark: r.benchmark?.label ?? null,
      })),
    }),
    context: {
      total_score: detailScore,
      tier: `Tier ${tier}`,
      pillars: {
        demand: pillarDisplay("demand"),
        tam_teachers: pillarDisplay("franchiseeSupply"),
        competitive_opportunity: pillarDisplay("competitiveLandscape"),
      },
      signals: signalRows.map((r) => ({
        key: r.key,
        label: r.label,
        source: r.source,
        value: r.value,
        benchmark: r.benchmark?.label ?? null,
      })),
    },
  });

  const handleDownloadCsv = () => {
    if (!signalRows.length) {
      toast.error("No market signals available yet");
      return;
    }
    const rows: unknown[][] = [
      ["Metric", "Value", "Source", "Benchmark"],
      ...signalRows.map((r) => [r.label, r.value, r.source, r.benchmark?.label ?? ""]),
    ];
    downloadCsv(`${market.city.toLowerCase().replace(/\s+/g, "-")}-market-signals.csv`, rows);
    toast.success("Market signals exported");
  };

  const handleDownloadPdf = async () => {
    setGeneratingPdf(true);
    try {
      const pdf = buildMarketReportPdf({
        market,
        stateAbbr,
        categoryScores,
        sigRows: signalRows,
        narrative: narrative ?? null,
        score: detailScore,
        tier,
        verdictLabel,
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
    if (autoDownload && !narrativeLoading && !autoFiredRef.current) {
      autoFiredRef.current = true;
      const t = setTimeout(() => { handleDownloadPdf(); }, 250);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoDownload, narrativeLoading]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-[#07142f]">{market.city}, {stateAbbr} — Market Research Report</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-[12.5px] text-[#14233b] bg-white">
          {/* Total score */}
          <section className="rounded-lg border border-[#e5eaf2] bg-[#f7faff] px-4 py-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] uppercase tracking-wide text-[#8794ab]">Total Score</span>
              <span className="text-[22px] font-bold text-[#07142f] tabular-nums">
                {totalScore}
                <span className="text-[12px] text-[#8794ab] font-normal">/100</span>
              </span>
            </div>
            <p className="mt-1 text-[12px] font-semibold text-[#174be8] capitalize">
              Tier {tier} · {verdictLabel.replace("-", " ")} market
            </p>
          </section>

          {/* Category scores */}
          <section>
            <h4 className="text-[13px] font-bold text-[#07142f] mb-2">Category Scores</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {CAT_LABELS.map((c) => {
                const display = pillars[c.key]?.display ?? null;
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

          {/* AI Executive Summary */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[13px] font-bold text-[#07142f] flex items-center gap-1.5">
                <Sparkles size={12} className="text-[#174be8]" /> AI Executive Summary
              </h4>
              <button
                type="button"
                onClick={() => regenerate({ force: true })}
                disabled={narrativeLoading}
                className="inline-flex items-center gap-1 rounded-md border border-[#dbe4f2] px-2 py-1 text-[10.5px] text-[#174be8] hover:bg-[#f7faff] disabled:opacity-50"
                title="Regenerate"
              >
                <RefreshCw size={11} className={narrativeLoading ? "animate-spin" : ""} /> Regenerate
              </button>
            </div>
            {narrativeLoading && !narrative ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[11px] text-[#8794ab]">
                  <Loader2 size={11} className="animate-spin" />
                  <span>Loading market narrative…</span>
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-[94%]" />
                <Skeleton className="h-3 w-[80%]" />
              </div>
            ) : narrativeError ? (
              <div className="rounded-md border border-[#f5cbb8] bg-[#fdecea] px-3 py-2 text-[11.5px] text-[#c2410c]">
                Narrative unavailable. {narrativeError}.{" "}
                <button onClick={() => regenerate({ force: true })} className="underline font-semibold">Retry</button>
              </div>
            ) : narrative ? (
              <div className="prose prose-sm max-w-none text-[12px] leading-relaxed text-[#14233b]">
                <p className="text-[12px] leading-relaxed text-[#3a4763]">{narrative.executive_summary}</p>
                <h5 className="text-[12px] font-bold text-[#07142f] mt-4 mb-1">Market Snapshot</h5>
                <ReactMarkdown>{narrative.report_snapshot}</ReactMarkdown>
                <h5 className="text-[12px] font-bold text-[#07142f] mt-3 mb-1">Demand-Side Read</h5>
                <ReactMarkdown>{narrative.report_demand}</ReactMarkdown>
                <h5 className="text-[12px] font-bold text-[#07142f] mt-3 mb-1">Supply &amp; Competitive Read</h5>
                <ReactMarkdown>{narrative.report_supply}</ReactMarkdown>
                <h5 className="text-[12px] font-bold text-[#07142f] mt-3 mb-1">Data Confidence</h5>
                <ReactMarkdown>{narrative.report_next_move}</ReactMarkdown>
                {narrative.model_id && (
                  <p className="mt-3 text-[10px] text-[#8794ab] not-prose">
                    Generated by {narrative.model_id}{narrative.cached ? " (cached)" : ""}.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[11.5px] text-[#8794ab]">No narrative available yet.</p>
            )}
          </section>

          {/* Key Market Signals */}
          <section>
            <h4 className="text-[13px] font-bold text-[#07142f] mb-1">Key Market Signals</h4>
            <p className="text-[11px] text-[#8794ab] mb-2">
              The same signals shown on screen — each from a named public source, nothing invented.
            </p>
            {signalRows.length === 0 ? (
              <p className="text-[#526078]">No signals available for this market yet.</p>
            ) : (
              <div className="divide-y divide-[#f1f4f9] rounded-md border border-[#eef2f7] bg-white">
                {signalRows.map((r) => {
                  const tone = r.benchmark?.tone;
                  const toneCls =
                    tone === "good" ? "bg-[#e6f7ef] text-[#0ea66e] border-[#bde9d2]" :
                    tone === "mid"  ? "bg-[#fff8e1] text-[#b88800] border-[#f3e0a8]" :
                    tone === "bad"  ? "bg-[#fdecea] text-[#c2410c] border-[#f5cbb8]" :
                    "bg-[#f1f4f9] text-[#526078] border-[#e5eaf2]";
                  const pillExplain = tone ? SIGNAL_EXPLAIN[r.key]?.[tone] ?? "" : "";
                  return (
                    <div key={r.key} className="px-3 py-2.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-[12px] font-semibold text-[#07142f]">{r.label}</p>
                        <span className="text-[12.5px] font-bold text-[#07142f] tabular-nums whitespace-nowrap">{r.value}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <p className="text-[10.5px] text-[#8794ab]">{r.source}</p>
                        {r.benchmark && (
                          <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide whitespace-nowrap ${toneCls}`}>
                            {r.benchmark.label}
                          </span>
                        )}
                      </div>
                      {pillExplain && (
                        <p className="mt-1.5 text-[11px] leading-relaxed text-[#3a4763]">{pillExplain}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleDownloadCsv}>Download Signals CSV</Button>
          <Button variant="outline" onClick={handleDownloadPdf} disabled={generatingPdf}>
            {generatingPdf ? "Generating PDF…" : "Download PDF Report"}
          </Button>
          <Button className="bg-[#174be8] hover:bg-[#1240c9] text-white" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
