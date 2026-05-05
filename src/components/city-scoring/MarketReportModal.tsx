import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CityData } from "@/data/cityData";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  market: CityData;
  categoryScores: Record<string, number>;
}

const CAT_LABELS: { key: string; label: string }[] = [
  { key: "demand", label: "Demand" },
  { key: "pricingPower", label: "Pricing Power" },
  { key: "competitiveLandscape", label: "Competitive Landscape" },
  { key: "franchiseeSupply", label: "Franchisee Supply" },
  { key: "easeOfOperations", label: "Ease of Operations" },
  { key: "parentMindset", label: "Parent Mindset" },
];

const SIGNALS = [
  { label: "Children Ages 5-12", value: "19,842 (+12% vs nat. avg)" },
  { label: "Households $100k+", value: "46% (+15% vs nat. avg)" },
  { label: "Premium Camp Pricing", value: "$245/week (+8%)" },
  { label: "Teacher Density", value: "1:475" },
  { label: "School District Access", value: "High" },
];

const NEARBY = ["Prosper, TX (87)", "McKinney, TX (86)", "Allen, TX (85)", "Little Elm, TX (82)"];
const SOURCES = ["U.S. Census Bureau", "BLS Occupational Data", "Google Trends", "Yelp / Google Maps", "GreatSchools.org", "ACA Camp Regulations"];

export function MarketReportModal({ open, onClose, market, categoryScores }: Props) {
  const stateAbbr = market.state === "Texas" ? "TX" : market.state === "Florida" ? "FL" : market.state;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-[#07142f]">{market.city}, {stateAbbr} Market Research Report Preview</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 text-[12.5px] text-[#14233b]">
          <section>
            <h4 className="text-[13px] font-bold text-[#07142f] mb-1">Market Summary</h4>
            <p className="leading-snug text-[#3a4c72]">Affluent, rapidly growing market with strong demand for premium youth education and enrichment programs. Composite metrics indicate high suitability for a Neuron Garage franchise.</p>
          </section>

          <section>
            <h4 className="text-[13px] font-bold text-[#07142f] mb-1">Overall Score</h4>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black text-[#174be8]">{market.compositeScore}</span>
              <span className="text-[#526078]">/ 100 — Tier {market.tier}</span>
            </div>
          </section>

          <section>
            <h4 className="text-[13px] font-bold text-[#07142f] mb-2">Six Category Scores</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {CAT_LABELS.map((c) => (
                <div key={c.key}>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[#526078]">{c.label}</span>
                    <span className="font-semibold text-[#07142f]">{categoryScores[c.key] ?? "-"}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#e8edf6] mt-1">
                    <div className="h-full rounded-full bg-[#174be8]" style={{ width: `${categoryScores[c.key] ?? 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h4 className="text-[13px] font-bold text-[#07142f] mb-1">Key Market Signals</h4>
            <ul className="space-y-1">
              {SIGNALS.map((s) => (
                <li key={s.label} className="flex justify-between border-b border-[#f3f5f9] py-1">
                  <span className="text-[#526078]">{s.label}</span>
                  <span className="font-medium text-[#07142f]">{s.value}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h4 className="text-[13px] font-bold text-[#07142f] mb-1">Nearby Markets</h4>
            <div className="flex flex-wrap gap-2">
              {NEARBY.map((n) => <span key={n} className="rounded-full bg-[#eaf0ff] text-[#174be8] px-2 py-0.5 text-[11px]">{n}</span>)}
            </div>
          </section>

          <section>
            <h4 className="text-[13px] font-bold text-[#07142f] mb-1">Source Data</h4>
            <ul className="grid grid-cols-2 gap-x-6 list-disc list-inside text-[12px] text-[#3a4c72]">
              {SOURCES.map((s) => <li key={s}>{s}</li>)}
            </ul>
          </section>

          <section>
            <h4 className="text-[13px] font-bold text-[#07142f] mb-1">Recommendation</h4>
            <p className="leading-snug text-[#3a4c72]">
              Proceed with franchise development planning. {market.city} ranks in the top tier across demand, pricing power, and operational ease. Prioritize teacher recruitment and secure premium real-estate near top elementary school clusters.
            </p>
          </section>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => toast.success("PDF download will be connected with live source data.")}>Download PDF (coming soon)</Button>
          <Button className="bg-[#174be8] hover:bg-[#1240c9] text-white" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
