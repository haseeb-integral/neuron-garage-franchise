// Left column of the City Search 3-column results layout — the paginated
// "Ranked Markets" list with checkboxes for compare, watchlist toggles,
// and per-row score popovers. Extracted from CityScoring.tsx so the page
// no longer carries ~210 lines of dense JSX inline.

import { memo } from "react";
import { ArrowRight, Bookmark, BookmarkCheck, GitCompare } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { RankedMarket } from "@/lib/cityScoringLiveData";
import { TierBadge } from "@/components/city-scoring/TierBadge";
import { RowScorePopover } from "@/components/city-scoring/RowScorePopover";
import { sampleCities } from "@/data/cityData";
import { sameMarket, COMPOSITE_CATEGORIES } from "@/lib/cityScoringPageHelpers";
import { buildMarketView, buildPillarView } from "@/lib/marketView";

type Props = {
  filteredCount: number;
  pageItems: RankedMarket[];
  pageStart: number;
  selectedCity: string;
  selectedState: string;
  pickMarket: (m: { city: string; state: string; id?: string | number }) => void;
  selectedForCompare: Array<string | number>;
  toggleCompare: (id: string | number) => void;
  compareMode: boolean;
  watchlistOnly: boolean;
  setWatchlistOnly: (fn: (v: boolean) => boolean) => void;
  watchlistCityIds: Set<string>;
  toggleWatchlist: (cityId?: string) => void;
  handleFindTeachersForSelected: () => void;
  openCompare: () => void;
  hasOverrides: boolean;
  resetWeights: () => void;
  appliedWeights: Record<string, number>;
  percentileById: Map<string | number, number>;
  showingFrom: number;
  showingTo: number;
  page: number;
  safePage: number;
  totalPages: number;
  pageNumbers: Array<number | "...">;
  setPage: (p: number | ((p: number) => number)) => void;
  // Active filter chips for empty-state messaging + a one-click reset.
  activeFilterSummary?: string;
  hasActiveFilters?: boolean;
  onClearAllFilters?: () => void;
};

function RankedMarketsListImpl({
  filteredCount,
  pageItems,
  pageStart,
  selectedCity,
  selectedState,
  pickMarket,
  selectedForCompare,
  toggleCompare,
  compareMode,
  watchlistOnly,
  setWatchlistOnly,
  watchlistCityIds,
  toggleWatchlist,
  handleFindTeachersForSelected,
  openCompare,
  hasOverrides,
  resetWeights,
  appliedWeights,
  percentileById,
  showingFrom,
  showingTo,
  safePage,
  totalPages,
  pageNumbers,
  setPage,
  activeFilterSummary,
  hasActiveFilters,
  onClearAllFilters,
}: Props) {
  return (
    <div className="min-w-0 rounded-lg bg-white border border-[#eef2f7] p-3 flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#07142f]">Ranked Markets</h3>
          <p className="text-[11px] text-[#8794ab]">({filteredCount} markets found)</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWatchlistOnly((v) => !v)}
            className={`flex items-center gap-1 text-xs font-medium hover:underline ${watchlistOnly ? "text-[#0ea66e]" : "text-[#526078]"}`}
            title="Show only saved cities"
          >
            {watchlistOnly ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
            Watchlist {watchlistOnly ? "On" : `(${watchlistCityIds.size})`}
          </button>
          <button
            onClick={handleFindTeachersForSelected}
            disabled={selectedForCompare.length < 1}
            className="flex items-center gap-1 text-xs font-medium text-[#174be8] hover:underline disabled:text-[#8794ab] disabled:no-underline disabled:cursor-not-allowed"
            title="Find teachers across the checked markets"
          >
            <ArrowRight size={12} /> Find Teachers ({selectedForCompare.length})
          </button>
          <button
            onClick={openCompare}
            disabled={selectedForCompare.length < 2}
            className="flex items-center gap-1 text-xs font-medium text-[#174be8] hover:underline disabled:text-[#8794ab] disabled:no-underline disabled:cursor-not-allowed"
          >
            <GitCompare size={12} /> Compare ({selectedForCompare.length})
          </button>
        </div>
      </div>

      {compareMode && (
        <div className="mb-2 rounded-md bg-[#eaf0ff] border border-[#cfdcff] px-2 py-1.5 text-[11px] text-[#174be8]">
          Compare mode on — select 2 to 4 markets, then click Compare.
        </div>
      )}
      {hasOverrides && (
        <div className="mb-2 rounded-md bg-[#fffbe6] border border-[#fde68a] px-2 py-1.5 text-[11px] text-[#854d0e] flex items-center justify-between gap-2">
          <span>
            <span className="font-semibold">Custom weighting is on</span> — this list is using your manual weight changes, not the preset defaults.
          </span>
          <button
            type="button"
            onClick={resetWeights}
            className="font-semibold text-[#174be8] hover:underline whitespace-nowrap"
          >
            Reset to default
          </button>
        </div>
      )}

      <div className="overflow-hidden flex-1">
        <div className="grid grid-cols-[16px_22px_minmax(0,1fr)_42px_70px_30px_30px_28px_16px] items-center gap-x-2 px-1 py-2 text-[9.5px] uppercase tracking-wide text-[#8794ab] border-b border-[#eef2f7]">
          <span></span>
          <span>Rank</span>
          <span>Market</span>
          <span>Type</span>
          <span>Score</span>
          <span className="text-right" title="Demand category score">Dem</span>
          <span className="text-right" title="TAM Teachers category score">TAM</span>
          <span className="text-right">Tier</span>
          <span></span>
        </div>

        {pageItems.length === 0 && watchlistOnly && (
          <div className="px-2 py-8 text-center text-[11px] text-[#8794ab]">
            No saved markets yet — click the bookmark on any city to save it.
          </div>
        )}
        {pageItems.length === 0 && !watchlistOnly && (
          <div className="px-3 py-8 text-center">
            <div className="text-[12px] font-semibold text-[#07142f]">0 markets match your filters.</div>
            {activeFilterSummary && (
              <div className="mt-1 text-[11px] text-[#8794ab]">Active: {activeFilterSummary}</div>
            )}
            {hasActiveFilters && onClearAllFilters && (
              <button
                type="button"
                onClick={onClearAllFilters}
                className="mt-3 text-[11px] font-semibold text-[#174be8] hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
        {pageItems.map((c, i) => {
          const isSel = c.city === selectedCity && c.state === selectedState;
          const isCmp = selectedForCompare.includes(c.id);
          const rowCityId = c.cityId;
          const isSaved = !!rowCityId && watchlistCityIds.has(rowCityId);
          const view = buildMarketView(c);
          return (
            <div
              key={c.id}
              onClick={() => {
                const sample = sampleCities.find((s) => sameMarket(s.city, s.state, c.city, c.state));
                pickMarket({ city: c.city, state: c.state, id: sample?.id ?? c.id });
              }}
              className={`grid grid-cols-[16px_22px_minmax(0,1fr)_42px_70px_30px_30px_28px_16px] items-center gap-x-2 px-1 py-2.5 text-[11px] cursor-pointer border-b border-[#f3f5f9] last:border-0 ${isSel ? "bg-[#eaf0ff]" : "hover:bg-[#f7faff]"}`}

            >
              <span className={compareMode ? "rounded ring-2 ring-[#174be8] ring-offset-1 ring-offset-white" : ""}>
                <Checkbox checked={isCmp} onCheckedChange={() => toggleCompare(c.id)} onClick={(e) => e.stopPropagation()} />
              </span>
              <span className="text-[#526078]">{pageStart + i + 1}</span>
              <div className="min-w-0">
                <div className="truncate font-semibold text-[#07142f]">{c.city}, {c.state === "Texas" ? "TX" : c.state === "Florida" ? "FL" : c.state}</div>
                <div className="truncate text-[10px] text-[#8794ab]">{c.county ?? ""}</div>
              </div>
              <span className="inline-block self-center w-fit rounded-full bg-[#eaf0ff] text-[#174be8] text-[9.5px] font-medium px-1.5 py-0.5">
                {c.marketType ?? ((c.population ?? 0) > 200000 ? "Urban" : "Suburb")}
              </span>
              <div className="flex items-center gap-1.5">
                {c.hasLiveData ? (
                  <>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#07142f] font-semibold tabular-nums hover:underline decoration-dotted underline-offset-2"
                          title="Why this tier? Click to see the formula"
                        >
                          {view.composite}
                          <span className="ml-0.5 font-mono italic text-[9px] text-[#8794ab]">ƒx</span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" side="right" className="p-0 w-auto">
                        <RowScorePopover
                          city={c.city}
                          state={c.state}
                          categories={COMPOSITE_CATEGORIES.map((cc) => ({ key: cc.key, label: cc.label }))}
                          categoryScores={c.categoryScores ?? {}}
                          appliedWeights={appliedWeights}
                          rawComposite={view.rawComposite}
                          displayComposite={view.composite}
                          tier={c.tier}
                        />
                      </PopoverContent>
                    </Popover>
                      <div className="h-1.5 flex-1 rounded-full bg-[#eef2f7]">
                      <div className="h-full rounded-full bg-[#0ea66e]" style={{ width: `${view.composite}%` }} />
                    </div>
                  </>
                ) : (
                  <span className="text-[#8794ab] font-medium">—</span>
                )}
              </div>
              {(() => {
                // Branded PillarsView: every cell reads pre-minted display
                // scores, so a raw 0-74 number can never leak into the UI.
                const pillars = buildPillarView(c.categoryScores);
                const cell = (p: { display: number | null; displayFormatted: string }, title: string) => {
                  if (!c.hasLiveData || p.display == null) {
                    return <span className="justify-self-end text-[10.5px] text-[#cbd5e1] tabular-nums">—</span>;
                  }
                  return <span className="justify-self-end text-[10.5px] font-semibold tabular-nums text-[#07142f]" title={title}>{p.displayFormatted}</span>;
                };
                return (
                  <>
                    {cell(pillars.demand, "Demand score (calibrated)")}
                    {cell(pillars.franchiseeSupply, "TAM Teachers score (calibrated)")}
                    {cell(pillars.competitiveLandscape, "Competitive Opportunity (calibrated, higher = less saturated)")}
                  </>
                );
              })()}
              {c.hasLiveData ? (
                <span className="justify-self-end">
                  <TierBadge
                    tier={c.tier}
                    compact
                    score={view.composite}
                    percentile={percentileById.get(c.id)}
                  />
                </span>
              ) : (
                <span className="justify-self-end rounded-full bg-[#eef2f7] px-1.5 py-0.5 text-[8.5px] font-semibold text-[#8794ab] whitespace-nowrap">No data</span>
              )}
              {rowCityId ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleWatchlist(rowCityId); }}
                  className={`justify-self-end p-0.5 rounded hover:bg-white ${isSaved ? "text-[#0ea66e]" : "text-[#cbd5e1] hover:text-[#526078]"}`}
                  title={isSaved ? "Remove from watchlist" : "Add to watchlist"}
                  aria-label={isSaved ? "Remove from watchlist" : "Add to watchlist"}
                >
                  {isSaved ? <BookmarkCheck size={12} fill="currentColor" /> : <Bookmark size={12} />}
                </button>
              ) : (
                <span />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-[#8794ab]">
        <span>Showing {showingFrom} to {showingTo} of {filteredCount} results</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="px-1.5 h-6 rounded border border-[#eef2f7] text-[#526078] disabled:opacity-40 disabled:cursor-not-allowed"
          >‹</button>
          {pageNumbers.map((p, idx) =>
            p === "..." ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-[#8794ab]">…</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`px-2 h-6 rounded font-medium ${p === safePage ? "bg-[#174be8] text-white" : "border border-[#eef2f7] text-[#14233b] hover:bg-[#f3f6fc]"}`}
              >{p}</button>
            )
          )}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="px-1.5 h-6 rounded border border-[#eef2f7] text-[#526078] disabled:opacity-40 disabled:cursor-not-allowed"
          >›</button>
        </div>
      </div>
    </div>
  );
}

// Memoized — page re-renders on most state changes (filters, weights tweaks,
// drawer toggles) don't change this component's props. Cuts ~15 row renders
// per unrelated state update on /city-scoring.
export const RankedMarketsList = memo(RankedMarketsListImpl);

