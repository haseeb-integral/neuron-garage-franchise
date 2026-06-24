/**
 * Amber pill shown when a city's premium-provider source coverage is thin
 * (more than 20% of premium providers had missing/broken registration pages).
 * Uses the shared shadcn Tooltip so the reason is visible on hover.
 */
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function LowConfidenceBadge({
  level,
  note,
}: {
  level: "high" | "medium" | "low";
  note?: string;
}) {
  if (level === "high") return null;
  const palette =
    level === "low"
      ? { bg: "#fef3c7", fg: "#92400e" }
      : { bg: "#fff1d6", fg: "#925100" };

  const tooltipText =
    note ??
    "More than 20% of premium providers in this city had missing or broken registration pages we could not read. The Market Validation Score still computed, but treat it with caution until those sources are fixed in the QA Queue.";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide cursor-help"
          style={{ backgroundColor: palette.bg, color: palette.fg }}
        >
          ⚑ Limited Source Coverage
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-[12px] leading-relaxed">
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );
}
