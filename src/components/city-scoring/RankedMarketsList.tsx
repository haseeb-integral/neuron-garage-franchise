import { MapPin } from "lucide-react";
import { TierBadge } from "@/components/city-scoring/TierBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RankedMarket } from "@/lib/cityScoringLiveData";

export type TopN = 10 | 20 | 50 | "all";

export interface RankedMarketsListProps {
  markets: RankedMarket[];
  topN: TopN;
  onTopNChange: (n: TopN) => void;
  onSelect: (m: RankedMarket) => void;
  selectedKey?: { city: string; state: string };
  rankedByLabel: string;
}

export function RankedMarketsList({
  markets,
  topN,
  onTopNChange,
  onSelect,
  selectedKey,
  rankedByLabel,
}: RankedMarketsListProps) {
  const display = topN === "all" ? markets : markets.slice(0, topN);
  const options: TopN[] = [10, 20, 50, "all"];

  return (
    <div className="bg-white rounded-lg border border-[#dee2e6] mb-4">
      <div className="flex items-center justify-between p-3 border-b border-[#eee]">
        <div>
          <div className="text-sm font-semibold text-[#343a40]">Ranked Markets</div>
          <div className="text-[11px] text-[#8794ab]">{rankedByLabel}</div>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className="text-[#6c757d] mr-1">Show:</span>
          {options.map((n) => (
            <button
              key={String(n)}
              onClick={() => onTopNChange(n)}
              className={cn(
                "px-2.5 py-1 rounded-md border transition-colors",
                topN === n
                  ? "bg-[#174be8] text-white border-[#174be8]"
                  : "bg-white text-[#495057] border-[#dee2e6] hover:bg-[#f4f4f5]"
              )}
            >
              {n === "all" ? "All" : `Top ${n}`}
            </button>
          ))}
        </div>
      </div>
      {display.length === 0 ? (
        <div className="p-8 text-center text-sm text-[#8794ab]">No markets match your filters.</div>
      ) : (
        <ol className="divide-y divide-[#f0f0f0]">
          {display.map((m, idx) => {
            const isSelected =
              selectedKey &&
              selectedKey.city.toLowerCase() === (m.city ?? "").toLowerCase() &&
              selectedKey.state.toLowerCase() === (m.state ?? "").toLowerCase();
            return (
              <li
                key={`${m.id}-${m.city}-${m.state}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-[#f8f9fa] transition-colors",
                  isSelected && "bg-[#eaf0ff]"
                )}
                onClick={() => onSelect(m)}
              >
                <div className="w-7 text-center text-sm font-bold text-[#8794ab] tabular-nums">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#343a40] truncate">
                    {m.city}, {m.state}
                  </div>
                  <div className="text-[11px] text-[#8794ab] flex items-center gap-1 truncate">
                    <MapPin size={10} />
                    {m.metroArea ?? m.county ?? "—"}
                    {m.population ? ` · pop ${m.population.toLocaleString()}` : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-[#174be8] tabular-nums leading-tight">
                    {m.hasLiveData ? m.compositeScore : "—"}
                  </div>
                  <div className="text-[10px] text-[#8794ab]">composite</div>
                </div>
                <TierBadge tier={m.tier as any} />
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
