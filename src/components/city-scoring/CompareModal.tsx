import { CityData } from "@/data/cityData";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TierBadge } from "./TierBadge";
import { buildMarketView } from "@/lib/marketView";

const breakdownLabels: Record<string, string> = {
  summerCampDemand: "Summer Camp Demand",
  schoolDensity: "School Density",
  childPopulation: "Child Population",
  dualIncomeFamilies: "Dual-Income Families",
  stemJobs: "STEM Jobs",
  competitionScore: "Competition Score",
};

interface Props {
  open: boolean;
  onClose: () => void;
  cities: CityData[];
}

export function CompareModal({ open, onClose, cities }: Props) {
  if (cities.length < 2) return null;
  const [a, b] = cities;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ color: '#003c7e' }}>City Comparison</DialogTitle>
        </DialogHeader>
        <div className="overflow-x-auto -mx-2 px-2">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 text-sm min-w-[480px]">
          <div />
          <div className="text-center font-semibold" style={{ color: '#343a40' }}>
            {a.city}, {a.state} <div className="mt-1 flex justify-center"><TierBadge tier={a.tier} compact /></div>
          </div>
          <div className="text-center font-semibold" style={{ color: '#343a40' }}>
            {b.city}, {b.state} <div className="mt-1 flex justify-center"><TierBadge tier={b.tier} compact /></div>
          </div>

          {[
            { label: "Composite Score", va: buildMarketView(a).compositeFormatted, vb: buildMarketView(b).compositeFormatted },
            { label: "Population", va: a.population.toLocaleString(), vb: b.population.toLocaleString() },
            { label: "Elem. Schools", va: a.elementarySchools, vb: b.elementarySchools },
            { label: "Children 5-12%", va: `${a.childrenPct}%`, vb: `${b.childrenPct}%` },
            { label: "Median Income", va: `$${a.medianIncome.toLocaleString()}`, vb: `$${b.medianIncome.toLocaleString()}` },
            { label: "Competitors", va: a.competitorCount, vb: b.competitorCount },
          ].map(row => (
            <div key={row.label} className="contents">
              <div className="py-2 text-xs" style={{ color: '#6c757d' }}>{row.label}</div>
              <div className="py-2 text-center font-medium" style={{ color: '#343a40' }}>{row.va}</div>
              <div className="py-2 text-center font-medium" style={{ color: '#343a40' }}>{row.vb}</div>
            </div>
          ))}

          <div className="col-span-3 mt-3">
            <p className="text-xs font-semibold mb-2" style={{ color: '#003c7e' }}>Score Breakdown</p>
          </div>
          {Object.keys(a.scoreBreakdown).map(key => (
            <div key={key} className="contents">
              <div className="py-1 text-xs" style={{ color: '#6c757d' }}>{breakdownLabels[key]}</div>
              <div className="py-1 text-center text-xs font-medium" style={{ color: '#343a40' }}>{a.scoreBreakdown[key as keyof typeof a.scoreBreakdown]}</div>
              <div className="py-1 text-center text-xs font-medium" style={{ color: '#343a40' }}>{b.scoreBreakdown[key as keyof typeof b.scoreBreakdown]}</div>
            </div>
          ))}
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
