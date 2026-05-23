import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Tiers are percentile-based, not absolute. Top 5% = I, next 15% = II,
// next 30% = III, bottom 50% = IV. Internal keys stay A/B/C/D for store/filter
// compatibility — only the display labels are Roman numerals.
const TIER_META: Record<string, { color: string; roman: string; label: string; range: string }> = {
  A: { color: "#0ea66e", roman: "I",   label: "Top Priority", range: "Top 5%" },
  B: { color: "#174be8", roman: "II",  label: "Strong",       range: "Next 15%" },
  C: { color: "#b8860b", roman: "III", label: "Watch",        range: "Next 30%" },
  D: { color: "#ea580c", roman: "IV",  label: "Skip",         range: "Bottom 50%" },
};

interface Props {
  tier: string;
  compact?: boolean;
  /** Composite score (0–100) — shown in tooltip when provided */
  score?: number;
  /** Percentile within the currently filtered list (0–100, where 100 = top) */
  percentile?: number;
}

export function TierBadge({ tier, compact = false, score, percentile }: Props) {
  const meta = TIER_META[tier];
  if (!meta) return null;

  const body = compact ? (
    <span
      className="inline-flex items-center justify-center rounded-full text-[10px] font-bold text-white"
      style={{ backgroundColor: meta.color, width: 22, height: 22 }}
    >
      {meta.roman}
    </span>
  ) : (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold text-white whitespace-nowrap"
      style={{ backgroundColor: meta.color }}
    >
      <span className="font-bold">Tier {meta.roman}</span>
      <span className="opacity-90">·</span>
      <span>{meta.label}</span>
    </span>
  );

  if (score == null && percentile == null) return body;

  const topPct =
    percentile != null ? Math.max(1, Math.round(100 - percentile)) : null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help inline-flex">{body}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[240px] text-xs">
        <div className="space-y-0.5">
          {score != null && (
            <div>
              <span className="font-semibold">Score:</span>{" "}
              {Number(score).toFixed(1)}
            </div>
          )}
          {topPct != null && (
            <div>
              Top <span className="font-semibold">{topPct}%</span> of filtered cities
            </div>
          )}
          <div className="text-[#cbd5e1]">
            Tier {meta.roman}: {meta.range} ({meta.label})
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
