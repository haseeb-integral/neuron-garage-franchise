import { memo } from "react";
import { ArrowRight, Bookmark, BookmarkCheck, Eye, FileText, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { VISIBLE_CATEGORIES, type Category } from "@/lib/cityScoringPageHelpers";
import type { RankedMarket } from "@/lib/cityScoringLiveData";
import { buildPillarView, type PillarKey } from "@/lib/marketView";
import { bandFromDisplayScore } from "@/lib/cityTiers";
type SelectedLike = Pick<RankedMarket, "city" | "state"> & { cityId?: string | null };

type CategoryKey = Category["key"];

interface TierBadge { bg: string; fg: string; label: string }

interface Props {
  showLiveRefresh: boolean;
  lastScrapedRelative: string | null;
  lastScrapedAbsolute: string | null;
  isStale: boolean;

  selected: SelectedLike;
  selectedHasLiveData: boolean;
  selectedLiveCity: { notes?: string | null } | null | undefined;

  watchlistCityIds: Set<string>;
  toggleWatchlist: (id?: string) => void;

  weightedComposite: number;
  tierBadge: TierBadge;
  opportunityLabel: string;

  appliedWeights: Record<CategoryKey, number>;
  appliedTotal: number;
  detailCategoryScores: Record<string, number>;
  detailScore: number | string;

  displayMarketType: string;
  displayMetroArea: string;
  displayCounty: string;

  onFindTeachers: () => void;
  onOpenCompare: () => void;
  onOpenReport: () => void;
  onOpenDetailDrawer: () => void;
}

function SelectedMarketPanelImpl({
  showLiveRefresh,
  lastScrapedRelative,
  lastScrapedAbsolute,
  isStale,
  selected,
  selectedHasLiveData,
  selectedLiveCity,
  watchlistCityIds,
  toggleWatchlist,
  weightedComposite,
  tierBadge,
  opportunityLabel,
  appliedWeights,
  appliedTotal,
  detailCategoryScores,
  detailScore,
  displayMarketType,
  displayMetroArea,
  displayCounty,
  onFindTeachers,
  onOpenCompare,
  onOpenReport,
  onOpenDetailDrawer,
}: Props) {
  const detailCityId = selected.cityId as string | undefined;
  const isSaved = !!detailCityId && watchlistCityIds.has(detailCityId);

  return (
    <div className="min-w-0 rounded-lg bg-white border border-[#eef2f7] p-4 flex flex-col h-full">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-[14px] leading-none font-bold uppercase tracking-wide text-[#526078]">Selected Market</h2>
          {showLiveRefresh && (lastScrapedRelative ? (
            <span
              title={lastScrapedAbsolute ?? ""}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isStale ? "bg-[#fff1e6] text-[#c2410c]" : "bg-[#e6f7ef] text-[#0ea66e]"}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isStale ? "bg-[#ea580c]" : "bg-[#0ea66e]"}`} />
              Live data refreshed {lastScrapedRelative}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#eef2f7] px-2 py-0.5 text-[10px] font-semibold text-[#526078]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8794ab]" />
              No live data yet
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => toggleWatchlist(detailCityId)}
          disabled={!detailCityId}
          title={!detailCityId ? "Refresh this city's data first" : isSaved ? "Remove from watchlist" : "Add to watchlist"}
          className={`flex items-center gap-1 text-[11px] font-medium hover:underline whitespace-nowrap disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed ${isSaved ? "text-[#0ea66e]" : "text-[#174be8]"}`}
        >
          {isSaved ? <BookmarkCheck size={12} fill="currentColor" /> : <Bookmark size={12} />}
          {isSaved ? "Saved to Watchlist" : "Add to Watchlist"}
        </button>
      </div>

      <div className="flex flex-col items-center text-center flex-1 w-full">
        <h3 className="mb-2 text-[18px] leading-tight font-bold text-[#07142f] text-center break-words w-full">
          {selected.city}, {selected.state === "Texas" ? "TX" : selected.state === "Florida" ? "FL" : selected.state}
        </h3>
        <p className="mb-1.5 text-[12px] font-semibold text-[#3a4c72]">Overall Score</p>
        <svg viewBox="0 0 200 120" className="w-full h-auto max-w-[260px]">
          <path d="M25 92 A75 75 0 0 1 175 92" fill="none" stroke="#e7ebf3" strokeWidth="14" strokeLinecap="round" />
          {selectedHasLiveData && (
            <path
              d="M25 92 A75 75 0 0 1 175 92"
              fill="none"
              stroke="#0ea66e"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${(weightedComposite / 100) * 236} 236`}
            />
          )}
          <text x="100" y="76" textAnchor="middle" className="fill-[#07142f]" style={{ fontSize: 32, fontWeight: 800 }}>{selectedHasLiveData ? weightedComposite : "—"}</text>
          <text x="100" y="102" textAnchor="middle" className="fill-[#7e8aa3]" style={{ fontSize: 12, fontWeight: 600 }}>/100</text>
        </svg>
        <p className="-mt-1 text-[13px] font-semibold" style={{ color: selectedHasLiveData ? tierBadge.fg : "#8794ab" }}>{selectedHasLiveData ? opportunityLabel : "No live data"}</p>
        {selectedHasLiveData && (() => {
          const enriched = VISIBLE_CATEGORIES.map((c) => {
            const score = Math.round(detailCategoryScores[c.key] ?? 0);
            const weight = appliedWeights[c.key] ?? 0;
            return { label: c.label, score, weight, contribution: score * weight };
          }).filter((x) => x.weight > 0);
          if (enriched.length === 0) return null;
          const sorted = [...enriched].sort((a, b) => b.contribution - a.contribution);
          const drivers = sorted.slice(0, Math.min(2, sorted.length));
          const lowest = [...enriched].sort((a, b) => a.score - b.score)[0];
          const showDrag = enriched.length > 1 && lowest.score < 50 && !drivers.some((d) => d.label === lowest.label);
          const driverText = drivers.length === 1
            ? `${drivers[0].label} (${drivers[0].score}) is driving this score.`
            : `${drivers[0].label} (${drivers[0].score}) and ${drivers[1].label} (${drivers[1].score}) are driving this score.`;
          return (
            <div className="mt-1.5 px-2 text-center text-[11px] italic leading-snug text-[#6b7a99]">
              <p>{driverText}</p>
              {showDrag && (
                <p className="mt-0.5">{lowest.label} ({lowest.score}) is pulling the score down.</p>
              )}
            </div>
          );
        })()}
        {selectedHasLiveData ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="mt-1 text-[11px] font-medium text-[#174be8] hover:underline"
                aria-label="Show overall score formula"
              >
                <span className="font-mono italic mr-0.5">ƒx</span> Show formula
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" side="bottom" className="w-[360px] p-3">
              <div className="mb-2">
                <p className="text-[12px] font-semibold text-[#07142f]">{selected.city}, {selected.state}</p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#526078]">Overall Score breakdown</p>
              </div>
              {(() => {
                const total = appliedTotal > 0 ? appliedTotal : 1;
                const rows = VISIBLE_CATEGORIES.map((c) => {
                  const weightPct = (appliedWeights[c.key] / total) * 100;
                  const score = detailCategoryScores[c.key] ?? 0;
                  const contribution = (weightPct * score) / 100;
                  return { key: c.key, label: c.label, weightPct, score, contribution };
                });
                const sumContribution = rows.reduce((s, r) => s + r.contribution, 0);
                return (
                  <>
                    <div className="rounded border border-[#eef2f7] overflow-hidden">
                      <table className="w-full text-[11px] font-mono">
                        <thead className="bg-[#fafbfd] text-[#526078]">
                          <tr>
                            <th className="text-left px-2 py-1.5 font-medium">Category</th>
                            <th className="text-right px-2 py-1.5 font-medium">Weight</th>
                            <th className="text-right px-2 py-1.5 font-medium">Score</th>
                            <th className="text-right px-2 py-1.5 font-medium">Contribution</th>
                          </tr>
                        </thead>
                        <tbody className="text-[#1a2540]">
                          {rows.map((r) => (
                            <tr key={r.key} className="border-t border-[#eef2f7]">
                              <td className="text-left px-2 py-1.5">{r.label}</td>
                              <td className="text-right px-2 py-1.5 tabular-nums">{r.weightPct.toFixed(1)}%</td>
                              <td className="text-right px-2 py-1.5 tabular-nums">{Math.round(r.score)}</td>
                              <td className="text-right px-2 py-1.5 tabular-nums">{r.contribution.toFixed(1)}</td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-[#c5cdda] bg-[#fafbfd] font-bold">
                            <td className="text-left px-2 py-1.5" colSpan={2}>Overall Score</td>
                            <td className="text-right px-2 py-1.5 tabular-nums text-[#526078]" title={`Σ contributions = ${sumContribution.toFixed(1)}`}>=</td>
                            <td className="text-right px-2 py-1.5 tabular-nums text-[#07142f]">{weightedComposite}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[11px] text-[#526078] mt-2 leading-snug">
                      Formula: Overall Score = Σ (master weight % × category score)
                    </p>
                    {Math.abs(appliedTotal - 100) > 0.5 && (
                      <p className="text-[10.5px] text-[#8794ab] mt-1 leading-snug italic">
                        Master weights are normalized to sum to 100% before scoring.
                      </p>
                    )}
                  </>
                );
              })()}
            </PopoverContent>
          </Popover>
        ) : (
          <button
            type="button"
            disabled
            className="mt-1 text-[11px] font-medium text-[#8794ab] opacity-60 cursor-not-allowed"
            aria-label="Show overall score formula (no live data)"
          >
            <span className="font-mono italic mr-0.5">ƒx</span> Show formula
          </button>
        )}

        {/* Details */}
        <div className="mt-3 w-full text-left text-[12px] space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[#6b7a96]">Tier</span>
            {selectedHasLiveData ? (
              <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold leading-tight" style={{ backgroundColor: tierBadge.bg, color: tierBadge.fg }}>{tierBadge.label}</span>
            ) : (
              <span className="rounded-full bg-[#eef2f7] px-2 py-0.5 text-[11px] font-semibold leading-tight text-[#8794ab]">No data</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#6b7a96]">Market Type</span>
            <span className="rounded-full bg-[#eef3ff] px-2 py-0.5 text-[11px] font-medium leading-tight text-[#174be8]">{displayMarketType}</span>
          </div>
          <div>
            <div className="text-[#6b7a96]">Metro Area</div>
            <div className="font-semibold text-[#07142f] break-words">{displayMetroArea}</div>
          </div>
          <div>
            <div className="text-[#6b7a96]">County</div>
            <div className="font-semibold text-[#07142f] break-words">{displayCounty}</div>
          </div>
        </div>

        {/* Category Scores */}
        <div className="mt-4 w-full text-left">
          <p className="mb-2.5 text-[13px] font-semibold text-[#07142f]">Category Scores</p>
          <div className="space-y-2">
            {VISIBLE_CATEGORIES.map((cat) => {
              const v = selectedHasLiveData ? (detailCategoryScores[cat.key] ?? 0) : null;
              const wPct = appliedTotal > 0 ? (appliedWeights[cat.key] / appliedTotal) * 100 : 0;
              const isZeroWeighted = wPct <= 0.05;
              return (
                <div key={cat.key} className={isZeroWeighted ? "opacity-45" : ""} title={isZeroWeighted ? `${cat.label} is set to 0% — contributes nothing to the overall score` : undefined}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-[12px]">
                    <span className="text-[#526078]">
                      {cat.label}
                      {isZeroWeighted && <span className="ml-1.5 text-[10px] uppercase tracking-wide text-[#8794ab]">· 0% weight</span>}
                    </span>
                    <span className="font-semibold text-[#07142f]">{v ?? "—"}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#e8edf6]">
                    <div className={`h-full rounded-full ${isZeroWeighted ? "bg-[#b6bfd0]" : "bg-[#1d4fff]"}`} style={{ width: `${v ?? 0}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-4 w-full flex flex-col gap-2">
          <Button onClick={onFindTeachers} className="h-9 w-full bg-[#174be8] hover:bg-[#1240c9] text-white gap-1.5 px-3 font-medium text-[12px] justify-center">
            <span className="truncate">Find Teachers</span> <ArrowRight size={12} className="flex-shrink-0" />
          </Button>
          <Button variant="outline" onClick={onOpenCompare} className="h-9 w-full border-[#dbe4f2] text-[#2250eb] gap-1.5 px-2.5 font-medium text-[12px] justify-center">
            <GitCompare size={12} /> Compare
          </Button>
          <Button variant="outline" onClick={onOpenReport} className="h-9 w-full border-[#dbe4f2] text-[#2250eb] gap-1.5 px-2.5 font-medium text-[12px] justify-center">
            <FileText size={12} /> Report
          </Button>
          <Button variant="outline" className="h-9 w-full border-[#dbe4f2] text-[#2250eb] gap-1.5 px-2.5 font-medium text-[12px] justify-center" onClick={onOpenDetailDrawer}>
            <Eye size={12} /> Details
          </Button>
        </div>

        {/* Market Summary */}
        {(() => {
          const mScore = Math.round(Number(detailScore) || 0);
          // Use the branded PillarsView so this summary reads the same
          // calibrated values as the dashboard list & spreadsheet. Previously
          // this block read keys "tam"/"competitive" which don't exist in
          // categoryScores (real keys are "franchiseeSupply"/"competitiveLandscape"),
          // so demand/tam/opp were silently always 0.
          const pillars = buildPillarView(detailCategoryScores as Partial<Record<PillarKey, number>>);
          const mDemand = pillars.demand.display ?? 0;
          const mTam = pillars.franchiseeSupply.display ?? 0;
          const mOpp = pillars.competitiveLandscape.display ?? 0;
          // Verdict bands centralized in cityTiers (strong ≥90, moderate ≥70).
          const mBand = bandFromDisplayScore(mScore);
          const mVerdict = mBand === "strong" ? "high" : mBand === "moderate" ? "moderate" : "low";
          const cats: { label: string; v: number }[] = [
            { label: "family demand", v: mDemand },
            { label: "teacher supply", v: mTam },
            { label: "competitive openness", v: mOpp },
          ];
          const strongest = [...cats].sort((a, b) => b.v - a.v)[0];
          const weakest = [...cats].sort((a, b) => a.v - b.v)[0];
          const verdictPhrase =
            mVerdict === "high"
              ? "a high-opportunity market"
              : mVerdict === "moderate"
              ? "a moderate-opportunity market"
              : "a low-opportunity market";
          const autoSummary = `${selected.city}, ${selected.state === "Texas" ? "TX" : selected.state === "Florida" ? "FL" : selected.state} scores ${mScore}/100 — ${verdictPhrase} on our model. Its strongest signal is ${strongest.label} (${strongest.v}/100); the limiting factor is ${weakest.label} (${weakest.v}/100). Use the Executive Summary on the right for the full plain-English breakdown, or open Details for the signal-by-signal evidence.`;
          const summaryText = selectedLiveCity?.notes ?? autoSummary;
          return (
            <div className="mt-auto pt-5 w-full text-left border-t border-[#eef2f7]">
              <p className="mb-1.5 text-[12px] font-semibold text-[#3a4c72]">Market Summary</p>
              <p className="text-[12px] leading-relaxed text-[#14233b]">{summaryText}</p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export const SelectedMarketPanel = memo(SelectedMarketPanelImpl);

