import { useMemo, useState } from "react";
import { CityData } from "@/data/cityData";
import { TierBadge } from "./TierBadge";
import { CheckCircle, Lock, StickyNote, ArrowUpDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buildMarketView, type MarketView } from "@/lib/marketView";
import { useCitySchoolCoverage, lookupCoverage } from "@/hooks/useCitySchoolCoverage";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  // One global fetch — see useCitySchoolCoverage. Returns a Map we look up by
  // (city, state). Cities with no teacher prospects render a dash; this is the
  // expected case for most rows and tells the user "nothing to enrich here yet."
  const coverage = useCitySchoolCoverage();

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
            <TableHead className="text-xs whitespace-nowrap" style={{ color: '#6c757d' }}>
              <span title="Teacher prospects in this city, and what share of them have a school name on file. Empty = no prospects sourced yet.">
                School Coverage
              </span>
            </TableHead>
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
              <TableCell>
                <SchoolCoverageBadge
                  cov={lookupCoverage(coverage, city.city, city.state)}
                  loading={coverage.loading}
                />
              </TableCell>
              <TableCell><StickyNote size={14} style={{ color: '#adb5bd' }} /></TableCell>
            </TableRow>
          ))}
          {sorted.length === 0 && (
            <TableRow>
              <TableCell colSpan={compareMode ? 13 : 12} className="text-center py-8" style={{ color: '#adb5bd' }}>
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

// ----------------------------------------------------------------------------
// SchoolCoverageBadge — compact per-row signal: how many teacher prospects
// exist for this city, and what share carry a school name. Cities with zero
// prospects show a faint dash (correctly read as "we haven't sourced here yet"
// rather than an error).
// ----------------------------------------------------------------------------
function SchoolCoverageBadge({
  cov,
  loading,
}: {
  cov: ReturnType<typeof lookupCoverage>;
  loading: boolean;
}) {
  if (loading && !cov) {
    return <span className="text-[11px] text-[#adb5bd]">…</span>;
  }
  if (!cov || cov.totalTeachers === 0) {
    return (
      <span className="text-[11px] text-[#adb5bd]" title="No teacher prospects sourced for this city yet.">
        —
      </span>
    );
  }
  const namePct = Math.round((cov.withSchoolName / cov.totalTeachers) * 100);
  const matchPct = Math.round((cov.linkedToSchool / cov.totalTeachers) * 100);
  const bg = namePct >= 70 ? "#ecfdf5" : namePct >= 30 ? "#fffbeb" : "#fef2f2";
  const fg = namePct >= 70 ? "#0a8f5a" : namePct >= 30 ? "#b7791f" : "#dc2626";
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-bold tabular-nums"
            style={{ background: bg, color: fg }}
          >
            {cov.totalTeachers}t · {namePct}%
          </span>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-[240px] text-[11px]">
          <div className="font-bold">{cov.city}{cov.state ? `, ${cov.state}` : ""}</div>
          <div className="mt-1 text-[#cbd5e1]">
            {cov.totalTeachers.toLocaleString()} teacher prospect{cov.totalTeachers === 1 ? "" : "s"}
          </div>
          <div className="mt-0.5">
            {cov.withSchoolName.toLocaleString()} ({namePct}%) have a school name on file
          </div>
          <div className="mt-0.5">
            {cov.linkedToSchool.toLocaleString()} ({matchPct}%) linked to a public school
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
