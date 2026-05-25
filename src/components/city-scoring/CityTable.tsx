import { useMemo, useState } from "react";
import { CityData } from "@/data/cityData";
import { TierBadge } from "./TierBadge";
import { CheckCircle, Lock, StickyNote, ArrowUpDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buildMarketView, type MarketView } from "@/lib/marketView";


interface Props {
  cities: CityData[];
  onSelectCity: (city: CityData) => void;
  compareMode: boolean;
  selectedForCompare: number[];
  onToggleCompare: (id: number) => void;
}

type SortKey = 'city' | 'state' | 'tier' | 'compositeScore' | 'population' | 'elementarySchools' | 'childrenPct' | 'medianIncome' | 'competitorCount';

// Rule 12: this is the bug-origin surface. Every row's Score MUST come from
// the same MarketView the gauge reads. Do not reintroduce raw .compositeScore.
type RowWithView = CityData & { __view: MarketView };

export function CityTable({ cities, onSelectCity, compareMode, selectedForCompare, onToggleCompare }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('compositeScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };


  const viewed: RowWithView[] = useMemo(
    () => cities.map((c) => ({ ...c, __view: buildMarketView(c) })),
    [cities],
  );

  const sorted = [...viewed].sort((a, b) => {
    if (sortKey === 'compositeScore') {
      return sortDir === 'asc' ? a.__view.composite - b.__view.composite : b.__view.composite - a.__view.composite;
    }
    const av = a[sortKey], bv = b[sortKey];
    if (typeof av === 'string') return sortDir === 'asc' ? (av as string).localeCompare(bv as string) : (bv as string).localeCompare(av as string);
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <TableHead className="cursor-pointer select-none whitespace-nowrap text-xs" onClick={() => toggleSort(k)} style={{ color: '#6c757d' }}>
      <span className="flex items-center gap-1">{label} <ArrowUpDown size={12} /></span>
    </TableHead>
  );

  return (
    <div className="bg-white rounded-lg mb-6" style={{ border: '1px solid #dee2e6' }}>
      <div className="overflow-x-auto rounded-lg">
        <Table>
        <TableHeader>
          <TableRow>
            {compareMode && <TableHead className="w-10" />}
            <TableHead className="w-8" />
            <SortHeader label="City" k="city" />
            <SortHeader label="State" k="state" />
            <TableHead className="text-xs" style={{ color: '#6c757d' }}>Tier</TableHead>
            <SortHeader label="Score" k="compositeScore" />
            <SortHeader label="Population" k="population" />
            <SortHeader label="Elem. Schools" k="elementarySchools" />
            <SortHeader label="Children 5-12%" k="childrenPct" />
            <SortHeader label="Median Income" k="medianIncome" />
            <SortHeader label="Competitors" k="competitorCount" />
            <TableHead className="w-10" />

          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map(city => (
            <TableRow
              key={city.id}
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => !compareMode && onSelectCity(city)}
            >
              {compareMode && (
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedForCompare.includes(city.id)}
                    onChange={() => onToggleCompare(city.id)}
                    onClick={e => e.stopPropagation()}
                  />
                </TableCell>
              )}
              <TableCell>
                {city.isNonRegistration
                  ? <CheckCircle size={16} style={{ color: '#20c997' }} />
                  : <Lock size={16} style={{ color: '#adb5bd' }} />
                }
              </TableCell>
              <TableCell className="font-medium" style={{ color: '#343a40' }}>{city.city}</TableCell>
              <TableCell style={{ color: '#6c757d' }}>{city.state}</TableCell>
              <TableCell><TierBadge tier={city.tier} /></TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm" style={{ color: '#343a40' }}>{city.__view.compositeFormatted}</span>
                  <div className="w-16 h-1.5 rounded-full" style={{ backgroundColor: '#e9ecef' }}>
                    <div className="h-full rounded-full" style={{ width: `${city.__view.composite}%`, backgroundColor: '#0ea66e' }} />
                  </div>
                </div>
              </TableCell>
              <TableCell style={{ color: '#6c757d' }}>{city.population.toLocaleString()}</TableCell>
              <TableCell style={{ color: '#6c757d' }}>{city.elementarySchools}</TableCell>
              <TableCell style={{ color: '#6c757d' }}>{city.childrenPct}%</TableCell>
              <TableCell style={{ color: '#6c757d' }}>${city.medianIncome.toLocaleString()}</TableCell>
              <TableCell style={{ color: '#6c757d' }}>{city.competitorCount}</TableCell>
              <TableCell><StickyNote size={14} style={{ color: '#adb5bd' }} /></TableCell>
            </TableRow>
          ))}
          {sorted.length === 0 && (
            <TableRow>
              <TableCell colSpan={compareMode ? 12 : 11} className="text-center py-8" style={{ color: '#adb5bd' }}>
                No cities match your filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}

