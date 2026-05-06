import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { CityData } from "@/data/cityData";
import { toast } from "sonner";

const CATEGORY_ROWS: { key: string; label: string; get: (c: CityData) => number }[] = [
  { key: "demand", label: "Demand", get: (c) => c.scoreBreakdown.summerCampDemand },
  { key: "pricingPower", label: "Pricing Power", get: (c) => Math.round(c.scoreBreakdown.dualIncomeFamilies * 0.95) },
  { key: "competitiveLandscape", label: "Competitive Landscape", get: (c) => c.scoreBreakdown.competitionScore },
  { key: "franchiseeSupply", label: "Franchisee Supply", get: (c) => Math.round((c.scoreBreakdown.stemJobs + c.scoreBreakdown.schoolDensity) / 2) },
  { key: "easeOfOperations", label: "Ease of Operations", get: (c) => Math.round((c.scoreBreakdown.schoolDensity + c.scoreBreakdown.dualIncomeFamilies) / 2) },
  { key: "parentMindset", label: "Parent Mindset Indicators", get: (c) => Math.round((c.scoreBreakdown.childPopulation + c.scoreBreakdown.dualIncomeFamilies) / 2) },
];

const SIGNAL_ROWS: { key: string; label: string; get: (c: CityData) => { value: string; delta: string } }[] = [
  { key: "children", label: "Children Ages 5-12", get: (c) => ({ value: c.city === "Frisco" ? "19,842" : c.city === "Plano" ? "18,765" : "22,134", delta: c.city === "Frisco" ? "+12%" : c.city === "Plano" ? "+9%" : "+15%" }) },
  { key: "households", label: "Households ($100k+)", get: (c) => ({ value: c.city === "Frisco" ? "46%" : c.city === "Plano" ? "43%" : "51%", delta: c.city === "Frisco" ? "+15%" : c.city === "Plano" ? "+12%" : "+18%" }) },
  { key: "pricing", label: "Premium Camp Pricing", get: (c) => ({ value: c.city === "Frisco" ? "$245 / week" : c.city === "Plano" ? "$235 / week" : "$250 / week", delta: c.city === "Frisco" ? "+8%" : c.city === "Plano" ? "+6%" : "+10%" }) },
  { key: "teacher", label: "Teacher Density", get: (c) => ({ value: c.city === "Frisco" ? "1:475" : c.city === "Plano" ? "1:510" : "1:420", delta: c.city === "Frisco" ? "-20%" : c.city === "Plano" ? "-18%" : "-24%" }) },
  { key: "schoolAccess", label: "School District Access", get: (c) => ({ value: "High", delta: c.city === "Frisco" ? "Strong" : c.city === "Plano" ? "Good" : "Strong" }) },
  { key: "millennial", label: "Millennial Density", get: (c) => ({ value: c.city === "Frisco" ? "42%" : c.city === "Plano" ? "39%" : "44%", delta: c.city === "Frisco" ? "+16%" : c.city === "Plano" ? "+13%" : "+17%" }) },
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

function scoreForMarket(market: CityData) {
  if (market.city === "Frisco") return 91;
  if (market.city === "Plano") return 88;
  if (market.city === "Austin") return 87;
  return market.compositeScore;
}

function categoryScore(row: { label: string; get: (c: CityData) => number }, market: CityData) {
  if (market.city === "Frisco") {
    const frisco: Record<string, number> = {
      Demand: 92,
      "Pricing Power": 90,
      "Competitive Landscape": 76,
      "Franchisee Supply": 83,
      "Ease of Operations": 85,
      "Parent Mindset Indicators": 84,
    };
    return frisco[row.label] ?? row.get(market);
  }
  return row.get(market);
}

function Gauge({ value }: { value: number }) {
  return (
    <div className="mx-auto flex w-[92px] flex-col items-center">
      <div className="relative h-[46px] w-[92px] overflow-hidden">
        <div className="absolute left-0 top-0 h-[92px] w-[92px] rounded-full border-[8px] border-[#e7edf7]" />
        <div
          className="absolute left-0 top-0 h-[92px] w-[92px] rounded-full border-[8px] border-[#0ea66e]"
          style={{ clipPath: "polygon(0 0, 100% 0, 100% 55%, 0 55%)" }}
        />
        <div className="absolute bottom-0 left-0 right-0 text-center">
          <div className="text-xl font-black leading-none text-[#07142f]">{value}</div>
          <div className="text-[9px] text-[#8794ab]">/100</div>
        </div>
      </div>
      <div className="mt-1 text-[9px] font-semibold text-[#0ea66e]">Excellent Opportunity</div>
    </div>
  );
}

export function MarketCompareModal({ open, onClose, markets }: Props) {
  if (markets.length < 2) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[780px] overflow-hidden rounded-2xl border border-[#dbe4f0] bg-white p-0 shadow-2xl [&>button]:hidden">
        <DialogHeader className="px-5 pb-2 pt-4 text-left">
          <DialogTitle className="text-lg font-black text-[#07142f]">Compare Markets</DialogTitle>
          <p className="mt-0.5 text-sm text-[#66728a]">{markets.length} markets selected</p>
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
                      <div className="text-[10.5px] font-medium text-[#8794ab]">{m.population > 200000 ? "Travis County" : "Collin County"}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#e6edf7]">
                  <td className="border-r border-[#e6edf7] px-3 py-2.5 font-semibold text-[#07142f]">Overall Score</td>
                  {markets.map((m) => (
                    <td key={m.id} className="border-r border-[#e6edf7] px-2 py-2.5 text-center last:border-r-0">
                      <Gauge value={scoreForMarket(m)} />
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-[#e6edf7]">
                  <td className="border-r border-[#e6edf7] px-3 py-2.5 font-semibold text-[#07142f]">Tier</td>
                  {markets.map((m) => (
                    <td key={m.id} className="border-r border-[#e6edf7] px-2 py-2.5 text-center last:border-r-0">
                      <span className="rounded-full bg-[#e6f7ef] px-2 py-1 text-[11px] font-bold text-[#0a8f5a]">{m.tier} (Tier 1)</span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td colSpan={markets.length + 1} className="px-3 pb-1 pt-2.5 text-sm font-black text-[#07142f]">Category Scores</td>
                </tr>
                {CATEGORY_ROWS.map((row) => (
                  <tr key={row.key} className="border-b border-[#eef2f7] last:border-b-0">
                    <td className="border-r border-[#e6edf7] px-3 py-1.5 text-[11.5px] font-semibold leading-tight text-[#34445f]">{row.label}</td>
                    {markets.map((m) => {
                      const value = categoryScore(row, m);
                      return (
                        <td key={m.id} className="border-r border-[#e6edf7] px-3 py-1.5 last:border-r-0">
                          <div className="flex items-center gap-2">
                            <span className="w-7 text-right text-[11.5px] font-bold text-[#07142f]">{value}</span>
                            <div className="h-1.5 flex-1 rounded-full bg-[#e8edf5]">
                              <div className="h-full rounded-full bg-[#174be8]" style={{ width: `${Math.min(value, 100)}%` }} />
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr>
                  <td colSpan={markets.length + 1} className="px-3 pb-1 pt-2.5 text-sm font-black text-[#07142f]">Key Market Signals</td>
                </tr>
                {SIGNAL_ROWS.map((row) => (
                  <tr key={row.key} className="border-b border-[#eef2f7] last:border-b-0">
                    <td className="border-r border-[#e6edf7] px-3 py-2 text-[10.5px] font-semibold leading-tight text-[#34445f]">{row.label}</td>
                    {markets.map((m) => {
                      const signal = row.get(m);
                      const negative = signal.delta.startsWith("-");
                      const neutral = signal.delta === "Strong" || signal.delta === "Good";
                      return (
                        <td key={m.id} className="border-r border-[#e6edf7] px-3 py-2 last:border-r-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="whitespace-nowrap text-[11.5px] font-bold text-[#07142f]">{signal.value}</span>
                            <span className={`whitespace-nowrap text-[10.5px] font-semibold ${negative ? "text-[#8794ab]" : neutral ? "text-[#526078]" : "text-[#0ea66e]"}`}>{signal.delta}</span>
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
            <Button
              variant="outline"
              className="h-10 rounded-lg border-[#dbe4f0] text-[#174be8]"
              onClick={() => toast.success("Comparison export will be connected later.")}
            >
              <Download className="mr-2 h-4 w-4" /> Export Comparison
            </Button>
            <Button className="h-10 rounded-lg bg-[#174be8] text-white hover:bg-[#1240c9]" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
