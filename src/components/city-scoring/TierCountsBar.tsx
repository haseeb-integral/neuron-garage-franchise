// TierCountsBar — committed tier counts + optional "→ after Apply" projection.
// Single source of truth for both numbers comes from CityScoring.tsx memos so
// the bar can never disagree with the table / map / popover.

import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type TierCounts = { A: number; B: number; C: number; D: number };

interface Props {
  committed: TierCounts;
  /** Preview counts under the current (uncommitted) slider weights. Pass null when no pending changes. */
  preview: TierCounts | null;
  /** Total number of live-scored markets — for context. */
  totalLive: number;
}

const TIER_META: { key: keyof TierCounts; label: string; bg: string; fg: string }[] = [
  { key: "A", label: "Tier A", bg: "#e6f7ef", fg: "#0ea66e" },
  { key: "B", label: "Tier B", bg: "#eaf0ff", fg: "#174be8" },
  { key: "C", label: "Tier C", bg: "#fff6dc", fg: "#b8860b" },
  { key: "D", label: "Tier D", bg: "#fff1e6", fg: "#c2410c" },
];

export function TierCountsBar({ committed, preview, totalLive }: Props) {
  const showArrow = !!preview;
  return (
    <div className="mb-3 rounded-lg border border-[#eef2f7] bg-white px-4 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#526078]">
        Tier distribution
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-[#8794ab] hover:text-[#526078]" aria-label="What does this show?">
                <Info size={12} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[280px] text-[11px] leading-snug">
              Counts of cities in each tier under the <strong>last Applied</strong> weights.
              {showArrow && <> An arrow shows what the count <em>would become</em> after you click Apply Weights.</>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <span className="ml-2 text-[10.5px] font-medium normal-case tracking-normal text-[#8794ab]">
          ({totalLive} markets scored)
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {TIER_META.map((t) => {
          const cur = committed[t.key];
          const next = preview ? preview[t.key] : null;
          const delta = next != null ? next - cur : 0;
          return (
            <div key={t.key} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: t.bg, color: t.fg }}>
              <span>{t.label}:</span>
              <span className="tabular-nums">{cur}</span>
              {next != null && delta !== 0 && (
                <span className="tabular-nums text-[10.5px] font-medium opacity-80">
                  → {next}
                  <span className={delta > 0 ? "ml-0.5" : "ml-0.5"}>({delta > 0 ? `+${delta}` : delta})</span>
                </span>
              )}
            </div>
          );
        })}
        {showArrow && (
          <span className="text-[10.5px] italic text-[#8794ab]">after Apply</span>
        )}
      </div>
    </div>
  );
}
