import { Slider } from "@/components/ui/slider";

const labels: Record<string, string> = {
  summerCampDemand: "Summer Camp Demand",
  schoolDensity: "School Density",
  childPopulation: "Child Population",
  dualIncomeFamilies: "Dual-Income Families",
  stemJobs: "STEM Jobs",
  competitionScore: "Competition Score",
};

interface Props {
  weights: Record<string, number>;
  onChangeWeight: (key: string, value: number) => void;
}

export function ScoringWeights({ weights, onChangeWeight }: Props) {
  const total = Object.values(weights).reduce((s, v) => s + v, 0);

  return (
    <div className="bg-white p-5 rounded-lg mb-6" style={{ border: '1px solid #dee2e6' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: '#003c7e' }}>Scoring Weights</h3>
        <span className="text-xs font-medium" style={{ color: total === 100 ? '#20c997' : '#fd7e14' }}>
          Total: {total}%
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(weights).map(([key, val]) => (
          <div key={key}>
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: '#6c757d' }}>{labels[key]}</span>
              <span className="font-medium" style={{ color: '#343a40' }}>{val}%</span>
            </div>
            <Slider value={[val]} onValueChange={([v]) => onChangeWeight(key, v)} max={50} step={1} />
          </div>
        ))}
      </div>
    </div>
  );
}
