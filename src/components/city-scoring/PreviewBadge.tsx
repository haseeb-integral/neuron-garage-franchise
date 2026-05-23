// PreviewBadge — small chip shown next to Apply Weights summarizing what the
// pending slider changes WOULD produce. Tier-A count only (the headline number)
// to keep the badge compact. Hidden when weights match the applied set.

import type { TierCounts } from "./TierCountsBar";

interface Props {
  pending: boolean;
  preview: TierCounts | null;
  committed: TierCounts;
}

export function PreviewBadge({ pending, preview, committed }: Props) {
  if (!pending || !preview) return null;
  const delta = preview.A - committed.A;
  const sign = delta > 0 ? "+" : "";
  const color = delta > 0 ? "text-[#0ea66e]" : delta < 0 ? "text-[#c2410c]" : "text-[#526078]";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border border-[#dbe4f2] bg-[#f7faff] px-2 py-1 text-[10.5px] font-semibold text-[#14233b]"
      title="Projection — click Apply Weights to commit"
    >
      <span className="uppercase tracking-wide text-[9.5px] text-[#8794ab]">Preview</span>
      <span className="tabular-nums">{preview.A} Tier I</span>
      {delta !== 0 && <span className={`tabular-nums ${color}`}>({sign}{delta})</span>}
    </span>
  );
}
