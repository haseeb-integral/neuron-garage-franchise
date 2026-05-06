import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CityData } from "@/data/cityData";

const CATEGORY_ROWS: { key: string; label: string; get: (c: CityData) => number }[] = [
  { key: "demand", label: "Demand", get: (c) => c.scoreBreakdown.summerCampDemand },
  { key: "pricingPower", label: "Pricing Power", get: (c) => Math.round(c.scoreBreakdown.dualIncomeFamilies * 0.95) },
  { key: "competitiveLandscape", label: "Competitive Landscape", get: (c) => c.scoreBreakdown.competitionScore },
  { key: "franchiseeSupply", label: "Franchisee Supply", get: (c) => Math.round((c.scoreBreakdown.stemJobs + c.scoreBreakdown.schoolDensity) / 2) },
  { key: "easeOfOperations", label: "Ease of Operations", get: (c) => Math.round((c.scoreBreakdown.schoolDensity + c.scoreBreakdown.dualIncomeFamilies) / 2) },
  { key: "parentMindset", label: "Parent Mindset", get: (c) => Math.round((c.scoreBreakdown.childPopulation + c.scoreBreakdown.dualIncomeFamilies) / 2) },
];

interface Props {
  open: boolean;
  onClose: () => void;
  markets: CityData[];
}

function shortState(state: string) {
  if (state === "Texas") return "TX";
  if (state === "Florida") return "FL";
  return state;
}

function scoreTone(score: number) {
  if (score >= 85) return "text-[#0ea66e]";
  if (score >= 70) return "text-[#174be8]";
  if (score >= 55) return "text-[#b8860b]";
  return "text-[#ea580c]";
}

export function MarketCompareModal({ open, onClose, markets }: Props) {
  if (markets.length < 2) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#dbe4f0] bg-white p-0 shadow-2xl">
        <DialogHeader className="border-b border-[#eef2f7] px-5 py-4 text-left">
          <DialogTitle className="text-lg font-black text-[#07142f]">
            Compare Markets ({markets.length})
          </DialogTitle>
          <p className="mt-1 text-xs text-[#66728a]">
            Side-by-side sample comparison for selected markets. No live APIs are called.
          </p>
        </DialogHeader>

        <div className="p-5">
          <div className="mb-4 grid gap-3" style={{ gridTemplateColumns: `repeat(${markets.length}, minmax(0, 1fr))` }}>
            {markets.map((m) => (
              <div key={m.id} className="rounded-xl border border-[#eef2f7] bg-[#f8fafe] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-black text-[#07142f]">
                      {m.city}, {shortState(m.state)}
                    </h3>
                    <p className="text-[11px] text-[#8794ab]">
                      {m.population.toLocaleString()} population
                    </p>
                  </div>
                  <span className="rounded-full bg-[#eaf0ff] px-2 py-0.5 text-[11px] font-bold text-[#174be8]">
                    Tier {m.tier}
                  </span>
                </div>
                <div className="mt-3 flex items-end gap-2">
                  <span className={`text-3xl font-black leading-none ${scoreTone(m.compositeScore)}`}>
                    {m.compositeScore}
                  </span>
                  <span className="pb-0.5 text-xs text-[#8794ab]">/100</span>
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#eef2f7]">
            <table className="w-full min-w-[620px] text-[12px]">
              <thead className="bg-[#f8fafe]">
                <tr className="border-b border-[#eef2f7]">
                  <th className="w-[190px] px-3 py-2.5 text-left font-bold text-[#526078]">Metric</th>
                  {markets.map((m) => (
                    <th key={m.id} className="px-3 py-2.5 text-center font-black text-[#07142f]">
                      {m.city}, {shortState(m.state)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#f3f5f9]">
                  <td className="px-3 py-2.5 font-medium text-[#526078]">Overall Score</td>
                  {markets.map((m) => (
                    <td key={m.id} className={`px-3 py-2.5 text-center text-lg font-black ${scoreTone(m.compositeScore)}`}>{m.compositeScore}</td>
                  ))}
                </tr>
                <tr className="border-b border-[#f3f5f9]">
                  <td className="px-3 py-2.5 font-medium text-[#526078]">Tier</td>
                  {markets.map((m) => (
                    <td key={m.id} className="px-3 py-2.5 text-center font-bold text-[#07142f]">{m.tier}</td>
                  ))}
                </tr>
                {CATEGORY_ROWS.map((row) => (
                  <tr key={row.key} className="border-b border-[#f3f5f9]">
                    <td className="px-3 py-2.5 font-medium text-[#526078]">{row.label}</td>
                    {markets.map((m) => {
                      const value = row.get(m);
                      return (
                        <td key={m.id} className="px-3 py-2.5 text-center">
                          <span className={`font-bold ${scoreTone(value)}`}>{value}</span>
                          <div className="mx-auto mt-1 h-1.5 max-w-[90px] rounded-full bg-[#eef2f7]">
                            <div className="h-full rounded-full bg-[#174be8]" style={{ width: `${Math.min(value, 100)}%` }} />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="border-b border-[#f3f5f9] bg-[#f8fafe]">
                  <td colSpan={1 + markets.length} className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-[#8794ab]">
                    Key Market Signals
                  </td>
                </tr>
                <tr className="border-b border-[#f3f5f9]">
                  <td className="px-3 py-2.5 font-medium text-[#526078]">Population</td>
                  {markets.map((m) => (
                    <td key={m.id} className="px-3 py-2.5 text-center font-semibold tabular-nums text-[#07142f]">{m.population.toLocaleString()}</td>
                  ))}
                </tr>
                <tr className="border-b border-[#f3f5f9]">
                  <td className="px-3 py-2.5 font-medium text-[#526078]">Children 5-12 %</td>
                  {markets.map((m) => (
                    <td key={m.id} className="px-3 py-2.5 text-center font-semibold text-[#07142f]">{m.childrenPct}%</td>
                  ))}
                </tr>
                <tr className="border-b border-[#f3f5f9]">
                  <td className="px-3 py-2.5 font-medium text-[#526078]">Median Income</td>
                  {markets.map((m) => (
                    <td key={m.id} className="px-3 py-2.5 text-center font-semibold tabular-nums text-[#07142f]">${m.medianIncome.toLocaleString()}</td>
                  ))}
                </tr>
                <tr>
                  <td className="px-3 py-2.5 font-medium text-[#526078]">Competitors</td>
                  {markets.map((m) => (
                    <td key={m.id} className="px-3 py-2.5 text-center font-semibold text-[#07142f]">{m.competitorCount}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
