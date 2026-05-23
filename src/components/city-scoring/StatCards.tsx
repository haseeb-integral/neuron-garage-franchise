import { CityData } from "@/data/cityData";
import { Globe, Award, BarChart3, TrendingUp } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Props {
  cities: CityData[];
  nonRegOnly: boolean;
  onToggleNonReg: (v: boolean) => void;
}

export function StatCards({ cities, nonRegOnly, onToggleNonReg }: Props) {
  const total = cities.length;
  const aCount = cities.filter(c => c.tier === 'A').length;
  const bCount = cities.filter(c => c.tier === 'B').length;
  const avgScore = total ? Math.round(cities.reduce((s, c) => s + c.compositeScore, 0) / total) : 0;

  const cards = [
    { label: "Total Cities Analyzed", value: total, icon: Globe },
    { label: "Tier I Count",  value: aCount, icon: Award },
    { label: "Tier II Count", value: bCount, icon: TrendingUp },
    { label: "Average Score", value: avgScore, icon: BarChart3 },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {cards.map(c => (
        <div key={c.label} className="bg-white p-4 rounded-lg flex items-center gap-3" style={{ border: '1px solid #dee2e6' }}>
          <div className="p-2 rounded-lg" style={{ backgroundColor: '#fff4ec' }}>
            <c.icon size={20} style={{ color: '#fd7e14' }} />
          </div>
          <div>
            <p className="text-xs" style={{ color: '#6c757d' }}>{c.label}</p>
            <p className="text-xl font-bold" style={{ color: '#003c7e' }}>{c.value}</p>
          </div>
        </div>
      ))}
      <div className="bg-white p-4 rounded-lg flex items-center justify-between" style={{ border: '1px solid #dee2e6' }}>
        <div>
          <p className="text-xs" style={{ color: '#6c757d' }}>Non-Registration Only</p>
          <p className="text-sm font-semibold" style={{ color: '#003c7e' }}>{nonRegOnly ? 'ON' : 'OFF'}</p>
        </div>
        <Switch checked={nonRegOnly} onCheckedChange={onToggleNonReg} />
      </div>
    </div>
  );
}
