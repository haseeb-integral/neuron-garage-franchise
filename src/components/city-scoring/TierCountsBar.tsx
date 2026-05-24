// TierCountsBar — committed tier counts + optional "→ after Apply" projection.
// Single source of truth for both numbers comes from CityScoring.tsx memos so
// the bar can never disagree with the table / map / popover.

import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type TierCounts = { A: number; B: number; C: number; D: number };

export type TierBarExtras = {
  avgScore: number | null;
  avgScorePreview: number | null;
  qualifiedPct: number | null;       // % of live-scored in Tier A+B (committed)
  qualifiedPctPreview: number | null;
  topMarkets: { label: string; score: number }[];
};

interface Props {
  committed: TierCounts;
  /** Preview counts under the current (uncommitted) slider weights. Pass null when no pending changes. */
  preview: TierCounts | null;
  /** Total number of live-scored markets — for context. */
  totalLive: number;
  /** Number of live-scored markets currently visible in the table after filters. */
  filteredLive?: number;
  extras?: TierBarExtras;
  /** Currently active tier filter ("All" or "A"/"B"/"C"/"D"). */
  activeTier?: string;
  /** Toggle the table's tier filter — click a pill to filter, click again to clear. */
  onTierClick?: (tier: "A" | "B" | "C" | "D") => void;
}


const TIER_META: { key: keyof TierCounts; label: string; bg: string; fg: string; border: string }[] = [
  { key: "A", label: "Tier A", bg: "#e6f7ef", fg: "#0ea66e", border: "#bfe7d3" },
  { key: "B", label: "Tier B", bg: "#eaf0ff", fg: "#174be8", border: "#c8d6ff" },
  { key: "C", label: "Tier C", bg: "#fff6dc", fg: "#b8860b", border: "#f0e0a8" },
  { key: "D", label: "Tier D", bg: "#fff1e6", fg: "#c2410c", border: "#f5cdb3" },

];

function fmt(n: number | null, suffix = "") {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(n)}${suffix}`;
}

export function TierCountsBar({ committed, preview, totalLive, filteredLive, extras, activeTier, onTierClick }: Props) {
  const showArrow = !!preview;
  const isFiltered = typeof filteredLive === "number" && filteredLive !== totalLive;
  const clickable = !!onTierClick;
  return (
    <div className="mb-3 w-full rounded-lg border border-[#eef2f7] bg-white px-4 py-3 flex flex-wrap items-stretch gap-x-4 gap-y-3">
      {/* Label cell */}
      <div className="flex flex-col justify-center min-w-[150px]">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#526078]">
          Weighting Preview
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-[#8794ab] hover:text-[#526078]" aria-label="What does this show?">
                  <Info size={12} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[280px] text-[11px] leading-snug">
                Counts of cities in each tier under the <strong>last Applied</strong> weights.
                {showArrow && <> An arrow shows what each value <em>would become</em> after you click Apply Weights.</>}
                {clickable && <> Click a tier pill to filter the table to that tier; click again to clear.</>}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="mt-1 text-[10px] font-medium text-[#8794ab] leading-snug">
          How your current slider settings would redistribute cities across tiers — click Apply Weights to commit.
        </span>
        <span className="mt-0.5 text-[10.5px] font-medium text-[#8794ab]">
          Tiers always sum to the full scored universe: {totalLive} markets
        </span>
        {clickable && (
          <span className="mt-0.5 text-[10.5px] font-medium text-[#174be8]">
            Click a tier pill to filter the table
          </span>
        )}
        {isFiltered && (
          <span className="mt-0.5 text-[10.5px] font-medium text-[#526078]">
            Table is currently showing {filteredLive} of {totalLive} scored markets after filters
          </span>
        )}
      </div>

      {/* Tier chips - grow to fill. Clickable when onTierClick provided. */}
      <div className="flex flex-1 flex-wrap items-center justify-around gap-2 min-w-[420px]">
        {TIER_META.map((t) => {
          const cur = committed[t.key];
          const next = preview ? preview[t.key] : null;
          const delta = next != null ? next - cur : 0;
          const isActive = activeTier === t.key;
          return (
            <button
              key={t.key}
              type="button"
              disabled={!clickable}
              onClick={() => onTierClick?.(t.key)}
              aria-pressed={isActive}
              title={clickable ? (isActive ? `Clear ${t.label} filter` : `Filter table to ${t.label} only`) : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-shadow ${clickable ? "cursor-pointer hover:shadow-md" : "cursor-default"}`}
              style={{
                backgroundColor: t.bg,
                color: t.fg,
                borderColor: isActive ? t.fg : t.border,
                boxShadow: isActive ? `inset 0 0 0 1.5px ${t.fg}` : undefined,
              }}
            >
              <span>{t.label}:</span>
              <span className="tabular-nums text-[13px]">{cur}</span>
              {next != null && delta !== 0 && (
                <span className="tabular-nums text-[11px] font-medium opacity-80">
                  → {next} ({delta > 0 ? `+${delta}` : delta})
                </span>
              )}
              {isActive && <span className="ml-1 text-[10px] opacity-70">✕</span>}
            </button>
          );
        })}
      </div>

      {/* Extra stats - vertical separators */}
      {extras && (
        <div className="flex items-stretch gap-4 border-l border-[#eef2f7] pl-4">
          <Stat
            label="Avg Score"
            value={fmt(extras.avgScore)}
            preview={
              extras.avgScorePreview != null && extras.avgScore != null && Math.round(extras.avgScorePreview) !== Math.round(extras.avgScore)
                ? `→ ${fmt(extras.avgScorePreview)}`
                : null
            }
          />
          <Stat
            label="Qualified (A+B)"
            value={fmt(extras.qualifiedPct, "%")}
            preview={
              extras.qualifiedPctPreview != null && extras.qualifiedPct != null && Math.round(extras.qualifiedPctPreview) !== Math.round(extras.qualifiedPct)
                ? `→ ${fmt(extras.qualifiedPctPreview, "%")}`
                : null
            }
          />
          <div className="flex flex-col justify-center flex-1 min-w-[420px]">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[#8794ab]">Top 12 Markets</span>
            {extras.topMarkets.length === 0 ? (
              <span className="mt-0.5 text-[11px] text-[#8794ab]">—</span>
            ) : (
              <div className="mt-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-0.5">
                {extras.topMarkets.map((m, i) => (
                  <div key={`${m.label}-${i}`} className="flex items-baseline gap-1.5 text-[10.5px] text-[#526078] leading-snug min-w-0">
                    <span className="tabular-nums text-[#8794ab] w-4 shrink-0">{i + 1}.</span>
                    <span className="truncate">{m.label}</span>
                    <span className="tabular-nums text-[#8794ab] ml-auto pl-1 shrink-0">{m.score}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {showArrow && (
            <div className="flex items-center text-[10.5px] italic text-[#8794ab]">after Apply</div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, valueSub, preview }: { label: string; value: string; valueSub?: string | null; preview?: string | null }) {
  return (
    <div className="flex flex-col justify-center min-w-[90px]">
      <span className="text-[10px] font-bold uppercase tracking-wide text-[#8794ab]">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[14px] font-bold text-[#07142f] tabular-nums leading-tight">{value}</span>
        {valueSub && <span className="text-[11px] font-medium text-[#526078] tabular-nums">({valueSub})</span>}
        {preview && <span className="text-[11px] font-medium text-[#07142f] tabular-nums">{preview}</span>}
      </div>
    </div>
  );
}
