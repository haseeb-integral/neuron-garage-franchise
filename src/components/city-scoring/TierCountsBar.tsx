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

export function TierCountsBar({ committed, preview, totalLive, filteredLive, extras }: Props) {
  const showArrow = !!preview;
  const isFiltered = typeof filteredLive === "number" && filteredLive !== totalLive;
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
        {isFiltered && (
          <span className="mt-0.5 text-[10.5px] font-medium text-[#526078]">
            Table is currently showing {filteredLive} of {totalLive} scored markets after filters
          </span>
        )}
      </div>

      {/* Tier chips - grow to fill */}
      <div className="flex flex-1 flex-wrap items-center justify-around gap-2 min-w-[420px]">
        {TIER_META.map((t) => {
          const cur = committed[t.key];
          const next = preview ? preview[t.key] : null;
          const delta = next != null ? next - cur : 0;
          return (
            <div
              key={t.key}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold"
              style={{ backgroundColor: t.bg, color: t.fg, borderColor: t.border }}
            >
              <span>{t.label}:</span>
              <span className="tabular-nums text-[13px]">{cur}</span>
              {next != null && delta !== 0 && (
                <span className="tabular-nums text-[11px] font-medium opacity-80">
                  → {next} ({delta > 0 ? `+${delta}` : delta})
                </span>
              )}
            </div>
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
          <div className="flex flex-col justify-center min-w-[180px]">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[#8794ab]">Top 5 Markets</span>
            {extras.topMarkets.length === 0 ? (
              <span className="mt-0.5 text-[11px] text-[#8794ab]">—</span>
            ) : (
              <ol className="mt-0.5 space-y-0.5">
                {extras.topMarkets.map((m, i) => (
                  <li key={`${m.label}-${i}`} className="flex items-baseline gap-1.5 text-[10.5px] text-[#526078] leading-snug">
                    <span className="tabular-nums text-[#8794ab] w-3">{i + 1}.</span>
                    <span className="truncate">{m.label}</span>
                    <span className="tabular-nums text-[#8794ab] ml-auto pl-1">{m.score}</span>
                  </li>
                ))}
              </ol>
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
        {preview && <span className="text-[11px] font-medium text-[#c2410c] tabular-nums">{preview}</span>}
      </div>
    </div>
  );
}
