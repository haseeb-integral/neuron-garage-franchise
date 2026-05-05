import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CityData } from "@/data/cityData";
import { ArrowRight, FileText, Download } from "lucide-react";

export interface CustomCriterion {
  name: string;
  category: string;
  weight: number;
  source: string;
  notes: string;
}

interface Props {
  market: CityData;
  open: boolean;
  onClose: () => void;
  categoryScores: Record<string, number>;
  customCriteria: CustomCriterion[];
  onFindTeachers: () => void;
  onGenerateReport: () => void;
  onExport: () => void;
}

const CATEGORIES: { key: string; label: string }[] = [
  { key: "demand", label: "Demand" },
  { key: "pricingPower", label: "Pricing Power" },
  { key: "competitiveLandscape", label: "Competitive Landscape" },
  { key: "franchiseeSupply", label: "Franchisee Supply" },
  { key: "easeOfOperations", label: "Ease of Operations" },
  { key: "parentMindset", label: "Parent Mindset Indicators" },
];

const SOURCES = [
  "U.S. Census Bureau",
  "BLS (Occupational Data)",
  "Google Trends",
  "Yelp / Google Maps",
  "GreatSchools.org",
  "ACA Camp Regulations",
];

export function MarketDetailDrawer({ market, open, onClose, categoryScores, customCriteria, onFindTeachers, onGenerateReport, onExport }: Props) {
  const [notes, setNotes] = useState(market.notes ?? "");
  const stateAbbr = market.state === "Texas" ? "TX" : market.state === "Florida" ? "FL" : market.state;

  const detailMetrics: Record<string, { label: string; value: string }[]> = {
    demand: [
      { label: "Children Ages 5-12", value: `${market.childrenPct}% of pop.` },
      { label: "Summer Camp Demand Index", value: `${market.scoreBreakdown.summerCampDemand}/100` },
    ],
    pricingPower: [
      { label: "Median Household Income", value: `$${market.medianIncome.toLocaleString()}` },
      { label: "Dual-Income Families", value: `${market.scoreBreakdown.dualIncomeFamilies}/100` },
    ],
    competitiveLandscape: [
      { label: "Direct Competitors", value: `${market.competitorCount}` },
      { label: "Saturation Score", value: `${market.scoreBreakdown.competitionScore}/100` },
    ],
    franchiseeSupply: [
      { label: "STEM Workforce Index", value: `${market.scoreBreakdown.stemJobs}/100` },
      { label: "Elementary Schools", value: `${market.elementarySchools}` },
    ],
    easeOfOperations: [
      { label: "School Density", value: `${market.scoreBreakdown.schoolDensity}/100` },
      { label: "Population", value: market.population.toLocaleString() },
    ],
    parentMindset: [
      { label: "Child Population Index", value: `${market.scoreBreakdown.childPopulation}/100` },
      { label: "Education Investment Indicator", value: "High" },
    ],
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto bg-white">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-[#07142f]">{market.city}, {stateAbbr} Market Details</SheetTitle>
          <p className="text-xs text-[#526078]">Tier {market.tier} · {market.population.toLocaleString()} population</p>
        </SheetHeader>

        {/* Overall score gauge */}
        <div className="mb-5 rounded-lg border border-[#eef2f7] p-4 flex items-center gap-4">
          <svg viewBox="0 0 200 120" className="h-[90px] w-[140px]">
            <path d="M25 92 A75 75 0 0 1 175 92" fill="none" stroke="#e7ebf3" strokeWidth="14" strokeLinecap="round" />
            <path d="M25 92 A75 75 0 0 1 175 92" fill="none" stroke="#174be8" strokeWidth="14" strokeLinecap="round"
              strokeDasharray={`${(market.compositeScore / 100) * 236} 236`} />
            <text x="100" y="80" textAnchor="middle" className="fill-[#07142f]" style={{ fontSize: 30, fontWeight: 800 }}>{market.compositeScore}</text>
          </svg>
          <div>
            <p className="text-[12px] font-semibold text-[#3a4c72]">Overall Market Score</p>
            <p className="text-[11px] text-[#526078]">Composite of six weighted categories</p>
          </div>
        </div>

        {/* Six categories */}
        <div className="mb-5">
          <h4 className="text-[13px] font-bold text-[#07142f] mb-2">Category Breakdown</h4>
          <div className="space-y-3">
            {CATEGORIES.map((cat) => {
              const score = categoryScores[cat.key] ?? 0;
              const customs = customCriteria.filter((cc) => cc.category === cat.label);
              return (
                <div key={cat.key} className="rounded-md border border-[#eef2f7] p-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[12.5px] font-semibold text-[#07142f]">{cat.label}</span>
                    <span className="text-[12.5px] font-bold text-[#174be8]">{score}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#e8edf6] mb-2">
                    <div className="h-full rounded-full bg-[#174be8]" style={{ width: `${score}%` }} />
                  </div>
                  <ul className="space-y-1">
                    {detailMetrics[cat.key]?.map((m) => (
                      <li key={m.label} className="flex justify-between text-[11.5px]">
                        <span className="text-[#526078]">{m.label}</span>
                        <span className="font-medium text-[#07142f]">{m.value}</span>
                      </li>
                    ))}
                    {customs.map((c) => (
                      <li key={c.name} className="flex justify-between text-[11.5px] border-t border-dashed border-[#eef2f7] pt-1 mt-1">
                        <span className="text-[#174be8]">{c.name} <span className="text-[#8794ab]">(custom)</span></span>
                        <span className="font-medium text-[#07142f]">{c.weight}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Competitive landscape */}
        <div className="mb-5">
          <h4 className="text-[13px] font-bold text-[#07142f] mb-2">Competitive Landscape Evidence</h4>
          <div className="space-y-2">
            {market.competitors.map((comp, i) => (
              <div key={i} className="rounded-md border border-[#eef2f7] bg-[#f8fafe] p-2.5 text-[11.5px]">
                <p className="font-semibold text-[#07142f]">{comp.name}</p>
                <p className="text-[#526078]">{comp.type} · {comp.pricing} · Capacity {comp.capacity}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Source data */}
        <div className="mb-5">
          <h4 className="text-[13px] font-bold text-[#07142f] mb-2">Source Data</h4>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11.5px] text-[#3a4c72] list-disc list-inside">
            {SOURCES.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>

        {/* Notes */}
        <div className="mb-5">
          <h4 className="text-[13px] font-bold text-[#07142f] mb-2">Notes</h4>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes about this market…" rows={3} />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 sticky bottom-0 bg-white pt-2">
          <Button onClick={onFindTeachers} className="w-full bg-[#174be8] hover:bg-[#1240c9] text-white font-semibold">
            Find Teachers in This Market <ArrowRight size={14} className="ml-2" />
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="border-[#dbe4f2] text-[#2250eb]" onClick={onGenerateReport}>
              <FileText size={14} className="mr-1" /> Generate Report
            </Button>
            <Button variant="outline" className="border-[#dbe4f2] text-[#2250eb]" onClick={onExport}>
              <Download size={14} className="mr-1" /> Export Source Data
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
