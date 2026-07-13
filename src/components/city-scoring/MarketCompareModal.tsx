import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { buildSeededFallbackSignalsFromScored, type RankedMarket } from "@/lib/cityScoringLiveData";
import { buildMarketView, buildPillarView, type PillarKey } from "@/lib/marketView";
import { buildRecomputedPillarScores, buildRecomputedRawComposite, type AppliedSubWeights } from "@/lib/recomputedPillars";
import { tierFromDisplayScore } from "@/lib/cityTiers";
import { formatMetric } from "@/lib/numberFormat";
import { buildCompareWorkbook, buildComparePdf, buildCompareFilename } from "@/lib/compareExport";
import type { CategoryKey } from "@/stores/cityScoringStore";

// Tier 1 rework Phase 3 (Sam+Brett 2026-07-07): only Demand + Operator & Venue Supply
// count toward the composite, so the Compare modal shows only those two
// category rows. CSI-derived Competitive Opportunity was removed here.
const CATEGORY_ROWS: { key: PillarKey; label: string }[] = [
  { key: "demand", label: "Demand" },
  { key: "franchiseeSupply", label: "Operator & Venue Supply" },
];



// Signal rows are built dynamically from whatever signals exist for the
// selected cities, so the modal always shows ALL available data — not a
// hand-picked subset. Order is determined by first-seen.

interface Props {
  open: boolean;
  onClose: () => void;
  markets: RankedMarket[];
  appliedSubWeights?: AppliedSubWeights;
  appliedWeights?: Partial<Record<CategoryKey, number>>;
  presetName?: string | null;
}

function shortState(state: string) {
  if (state === "Texas") return "TX";
  if (state === "Florida") return "FL";
  return state;
}

function Gauge({ value }: { value: number | null }) {
  const v = value ?? 0;
  const label = v >= 85 ? "Excellent Opportunity" : v >= 75 ? "Strong" : v >= 65 ? "Moderate" : v > 0 ? "Limited" : "No data";
  return (
    <div className="mx-auto flex w-[92px] flex-col items-center">
      <div className="relative h-[46px] w-[92px] overflow-hidden">
        <div className="absolute left-0 top-0 h-[92px] w-[92px] rounded-full border-[8px] border-[#e7edf7]" />
        <div
          className="absolute left-0 top-0 h-[92px] w-[92px] rounded-full border-[8px] border-[#0ea66e]"
          style={{ clipPath: "polygon(0 0, 100% 0, 100% 55%, 0 55%)" }}
        />
        <div className="absolute bottom-0 left-0 right-0 text-center">
          <div className="text-xl font-black leading-none text-[#07142f]">{value ?? "—"}</div>
          <div className="text-[9px] text-[#8794ab]">/100</div>
        </div>
      </div>
      <div className="mt-1 text-[9px] font-semibold text-[#0ea66e]">{label}</div>
    </div>
  );
}

type SignalRow = { value: string; delta: string | null; label: string };

export function MarketCompareModal({ open, onClose, markets, appliedSubWeights, appliedWeights, presetName }: Props) {
  const [signalsByCity, setSignalsByCity] = useState<Record<string, Record<string, SignalRow>>>({});
  const [signalRows, setSignalRows] = useState<{ key: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || markets.length < 2) return;
    const cityIds = markets.map((m) => m.cityId).filter((x): x is string => !!x);
    if (cityIds.length === 0) {
      setSignalsByCity({});
      setSignalRows([]);
      return;
    }
    setLoading(true);
    try {
      // Legacy `city_market_signals` was severed on 2026-05-21.
      // Compare modal builds rows from each market's seeded fallback.
      const sigMap: Record<string, Record<string, SignalRow>> = {};
      const seen = new Map<string, string>();
      markets.forEach((m) => {
        if (!m.cityId || !m.scoredRow) return;
        const seeded = buildSeededFallbackSignalsFromScored(m.scoredRow);
        sigMap[m.cityId] = {};
        seeded.forEach((r) => {
          const valStr = formatMetric(r.value, r.signal_key);
          sigMap[m.cityId][r.signal_key] = { value: valStr, delta: null, label: r.label };
          if (!seen.has(r.signal_key)) seen.set(r.signal_key, r.label || r.signal_key);
        });
      });
      setSignalsByCity(sigMap);
      setSignalRows(Array.from(seen.entries()).map(([key, label]) => ({ key, label })));
    } catch (e) {
      console.error("compare modal load error", e);
    } finally {
      setLoading(false);
    }

  }, [open, markets]);

  if (markets.length < 2) return null;

  // Pillar (category) scores read through the SAME recompute pipeline used
  // by the selected-market center panel, drawer, and Market Report:
  //   raw signals + appliedSubWeights → recomputeCategoryScore → buildPillarView.
  // Per Brett's May-24 "one calibrated number everywhere" rule, the Compare
  // modal must not read DB-stored raw pillars directly (May-26 bug: Compare
  // showed 100/79/68 for Nashville while panel/drawer/report showed 83/73/68).
  const getCategory = (m: RankedMarket, key: PillarKey): number | null => {
    if (!m.hasLiveData) return null;
    const recomputed = buildRecomputedPillarScores(m, appliedSubWeights ?? {});
    return buildPillarView(recomputed)[key].display ?? null;
  };
  const getSignal = (m: RankedMarket, key: string): SignalRow | null => {
    if (!m.cityId) return null;
    return signalsByCity[m.cityId]?.[key] ?? null;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[780px] overflow-hidden rounded-2xl border border-[#dbe4f0] bg-white p-0 shadow-2xl [&>button]:hidden">
        <DialogHeader className="px-5 pb-2 pt-4 text-left">
          <DialogTitle className="text-lg font-black text-[#07142f]">Compare Markets</DialogTitle>
          <p className="mt-0.5 text-sm text-[#66728a]">
            {markets.length} markets selected{loading ? " • loading…" : ""}
          </p>
        </DialogHeader>

        <div className="px-4 pb-4">
          <div className="max-h-[calc(100vh-190px)] overflow-y-auto rounded-xl border border-[#e6edf7]">
            <table className="w-full table-fixed text-[11.5px]">
              <thead>
                <tr className="border-b border-[#e6edf7] bg-white">
                  <th className="w-[150px] border-r border-[#e6edf7] px-3 py-2.5 text-left font-semibold text-[#526078]"></th>
                  {markets.map((m) => (
                    <th key={m.id} className="border-r border-[#e6edf7] px-3 py-2.5 text-center last:border-r-0">
                      <div className="text-sm font-black text-[#07142f]">{m.city}, {shortState(m.state)}</div>
                      <div className="text-[10.5px] font-medium text-[#8794ab]">{m.county ?? m.metroArea ?? "—"}</div>
                      {!m.cityId && (
                        <div className="mt-1 text-[9.5px] font-medium text-[#ea580c]">No live data — refresh first</div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#e6edf7]">
                  <td className="border-r border-[#e6edf7] px-3 py-2.5 font-semibold text-[#07142f]">Overall Score</td>
                  {markets.map((m) => {
                    // Use the SAME re-ranked composite the table sorts by, so
                    // the modal's Overall Score matches the SCORE column when
                    // the user has tweaked weights or picked a preset.
                    // (May-27 fix — companion to the May-26 pillar fix.)
                    const rawComposite = m.hasLiveData
                      ? buildRecomputedRawComposite(m, appliedSubWeights ?? {}, appliedWeights ?? {})
                      : 0;
                    const display = m.hasLiveData
                      ? buildMarketView({ ...m, compositeScore: rawComposite }).composite
                      : null;
                    return (
                      <td key={m.id} className="border-r border-[#e6edf7] px-2 py-2.5 text-center last:border-r-0">
                        <Gauge value={display || null} />
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-b border-[#e6edf7]">
                  <td className="border-r border-[#e6edf7] px-3 py-2.5 font-semibold text-[#07142f]">Tier</td>
                  {markets.map((m) => {
                    // Tier follows the same recomputed display score.
                    const rawComposite = m.hasLiveData
                      ? buildRecomputedRawComposite(m, appliedSubWeights ?? {}, appliedWeights ?? {})
                      : 0;
                    const composite = buildMarketView({ ...m, compositeScore: rawComposite }).composite;
                    const derivedTier = m.hasLiveData ? tierFromDisplayScore(composite) : null;
                    return (
                      <td key={m.id} className="border-r border-[#e6edf7] px-2 py-2.5 text-center last:border-r-0">
                        {derivedTier ? (
                          <span className="rounded-full bg-[#e6f7ef] px-2 py-1 text-[11px] font-bold text-[#0a8f5a]">{derivedTier}</span>
                        ) : (
                          <span className="rounded-full bg-[#eef2f7] px-2 py-1 text-[11px] font-bold text-[#8794ab]">No data</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td colSpan={markets.length + 1} className="px-3 pb-1 pt-2.5 text-sm font-black text-[#07142f]">Category Scores</td>
                </tr>
                {CATEGORY_ROWS.map((row) => (
                  <tr key={row.key} className="border-b border-[#eef2f7] last:border-b-0">
                    <td className="border-r border-[#e6edf7] px-3 py-1.5 text-[11.5px] font-semibold leading-tight text-[#34445f]">{row.label}</td>
                    {markets.map((m) => {
                      const value = getCategory(m, row.key);
                      return (
                        <td key={m.id} className="border-r border-[#e6edf7] px-3 py-1.5 last:border-r-0">
                          <div className="flex items-center gap-2">
                            <span className="w-7 text-right text-[11.5px] font-bold text-[#07142f]">{value ?? "—"}</span>
                            <div className="h-1.5 flex-1 rounded-full bg-[#e8edf5]">
                              <div className="h-full rounded-full bg-[#174be8]" style={{ width: `${Math.min(value ?? 0, 100)}%` }} />
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}

                <tr>
                  <td colSpan={markets.length + 1} className="px-3 pb-1 pt-2.5 text-sm font-black text-[#07142f]">
                    Key Market Signals {signalRows.length > 0 && <span className="font-medium text-[#8794ab]">({signalRows.length})</span>}
                  </td>
                </tr>
                {signalRows.length === 0 && !loading && (
                  <tr>
                    <td colSpan={markets.length + 1} className="px-3 py-3 text-center text-[11px] text-[#8794ab]">
                      No live signals yet — refresh these cities to populate data.
                    </td>
                  </tr>
                )}
                {signalRows.map((row) => (
                  <tr key={row.key} className="border-b border-[#eef2f7] last:border-b-0">
                    <td className="border-r border-[#e6edf7] px-3 py-2 text-[10.5px] font-semibold leading-tight text-[#34445f]">{row.label}</td>
                    {markets.map((m) => {
                      const signal = getSignal(m, row.key);
                      const delta = signal?.delta ?? null;
                      const negative = delta?.startsWith("-");
                      return (
                        <td key={m.id} className="border-r border-[#e6edf7] px-3 py-2 last:border-r-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="whitespace-nowrap text-[11.5px] font-bold text-[#07142f]">{signal?.value ?? "—"}</span>
                            {delta && (
                              <span className={`whitespace-nowrap text-[10.5px] font-semibold ${negative ? "text-[#8794ab]" : "text-[#0ea66e]"}`}>{delta}</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 rounded-lg border-[#dbe4f0] text-[#174be8]"
                >
                  <Download className="mr-2 h-4 w-4" /> Export Comparison
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-white">
                <DropdownMenuItem
                  onClick={() => {
                    try {
                      const wb = buildCompareWorkbook(
                        markets,
                        appliedSubWeights ?? {},
                        appliedWeights ?? {},
                        presetName ?? null,
                      );
                      XLSX.writeFile(wb, buildCompareFilename(markets, "xlsx"), { compression: true });
                      toast.success("Excel comparison downloaded");
                    } catch (e) {
                      console.error("compare xlsx export failed", e);
                      toast.error("Excel export failed");
                    }
                  }}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    try {
                      const doc = buildComparePdf(
                        markets,
                        appliedSubWeights ?? {},
                        appliedWeights ?? {},
                        presetName ?? null,
                      );
                      doc.save(buildCompareFilename(markets, "pdf"));
                      toast.success("PDF comparison downloaded");
                    } catch (e) {
                      console.error("compare pdf export failed", e);
                      toast.error("PDF export failed");
                    }
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" /> PDF (.pdf)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button className="h-10 rounded-lg bg-[#174be8] text-white hover:bg-[#1240c9]" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
