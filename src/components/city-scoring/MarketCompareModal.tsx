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

export function MarketCompareModal({ open, onClose, markets }: Props) {
  if (markets.length < 2) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-[#07142f]">Compare Markets ({markets.length})</DialogTitle>
        </DialogHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-[12px]">
            <thead>
              <tr className="border-b border-[#eef2f7]">
                <th className="text-left py-2 font-medium text-[#526078]">Metric</th>
                {markets.map((m) => (
                  <th key={m.id} className="text-center py-2 font-semibold text-[#07142f]">
                    {m.city}, {m.state === "Texas" ? "TX" : m.state === "Florida" ? "FL" : m.state}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#f3f5f9]">
                <td className="py-2 text-[#526078]">Overall Score</td>
                {markets.map((m) => (
                  <td key={m.id} className="text-center py-2 font-bold text-[#174be8]">{m.compositeScore}</td>
                ))}
              </tr>
              <tr className="border-b border-[#f3f5f9]">
                <td className="py-2 text-[#526078]">Tier</td>
                {markets.map((m) => (
                  <td key={m.id} className="text-center py-2 font-semibold text-[#07142f]">{m.tier}</td>
                ))}
              </tr>
              {CATEGORY_ROWS.map((row) => (
                <tr key={row.key} className="border-b border-[#f3f5f9]">
                  <td className="py-2 text-[#526078]">{row.label}</td>
                  {markets.map((m) => (
                    <td key={m.id} className="text-center py-2 text-[#07142f]">{row.get(m)}</td>
                  ))}
                </tr>
              ))}
              <tr className="border-b border-[#f3f5f9] bg-[#f8fafe]">
                <td colSpan={1 + markets.length} className="py-2 text-[11px] uppercase tracking-wide text-[#8794ab]">Key Market Signals</td>
              </tr>
              <tr className="border-b border-[#f3f5f9]">
                <td className="py-2 text-[#526078]">Population</td>
                {markets.map((m) => (
                  <td key={m.id} className="text-center py-2 text-[#07142f] tabular-nums">{m.population.toLocaleString()}</td>
                ))}
              </tr>
              <tr className="border-b border-[#f3f5f9]">
                <td className="py-2 text-[#526078]">Children 5-12 %</td>
                {markets.map((m) => (
                  <td key={m.id} className="text-center py-2 text-[#07142f]">{m.childrenPct}%</td>
                ))}
              </tr>
              <tr className="border-b border-[#f3f5f9]">
                <td className="py-2 text-[#526078]">Median Income</td>
                {markets.map((m) => (
                  <td key={m.id} className="text-center py-2 text-[#07142f] tabular-nums">${m.medianIncome.toLocaleString()}</td>
                ))}
              </tr>
              <tr>
                <td className="py-2 text-[#526078]">Competitors</td>
                {markets.map((m) => (
                  <td key={m.id} className="text-center py-2 text-[#07142f]">{m.competitorCount}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
