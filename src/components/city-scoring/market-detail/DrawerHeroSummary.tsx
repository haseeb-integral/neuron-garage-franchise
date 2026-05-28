import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { buildPillarView, calibratePillarForDisplay, unsafeAsCompositeScore, type CompositeScore } from "@/lib/marketView";
import type { TierLetter } from "@/lib/cityTiers";

interface Props {
  /** Raw composite from the source-of-truth row (will be calibrated for display). */
  rawComposite: number;
  /** Tier letter from the ranker (server-stored, drift-safe). */
  tier: TierLetter | null;
  /** Raw pillar scores (uncalibrated). Same keys as PillarKey. */
  categoryScores: {
    demand?: number | null;
    franchiseeSupply?: number | null;
    competitiveLandscape?: number | null;
  };
}

const TIER_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  A: { bg: "#dcf5e6", color: "#0d7a5f", label: "Top 5% nationally" },
  B: { bg: "#eef4ff", color: "#0757ff", label: "Strong market" },
  C: { bg: "#fff8d6", color: "#7a5c00", label: "Worth a closer look" },
  D: { bg: "#fde2e2", color: "#a83232", label: "Bottom half — proceed with caution" },
};

const PILLARS: Array<{ key: "demand" | "franchiseeSupply" | "competitiveLandscape"; label: string }> = [
  { key: "demand", label: "Demand" },
  { key: "franchiseeSupply", label: "TAM Teachers" },
  { key: "competitiveLandscape", label: "Competitive Opp" },
];

function bottomLine(
  total: CompositeScore,
  pillars: { demand: number | null; tam: number | null; comp: number | null },
): string {
  const parts = [
    { label: "Demand", v: pillars.demand },
    { label: "TAM Teachers", v: pillars.tam },
    { label: "Competitive Opportunity", v: pillars.comp },
  ].filter((p): p is { label: string; v: number } => p.v != null);
  if (parts.length < 2) return `Total Score ${total} — limited pillar data.`;
  const sorted = [...parts].sort((a, b) => b.v - a.v);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const gap = top.v - bottom.v;
  if (total >= 90) return `Tier A market: strongest signal in ${top.label.toLowerCase()} (${top.v}). Recruit aggressively.`;
  if (total >= 80) return `Solid Tier B market — ${top.label} (${top.v}) carries it; watch ${bottom.label.toLowerCase()} (${bottom.v}).`;
  if (total >= 70) return `Average market overall. Lean in only if ${top.label.toLowerCase()} (${top.v}) aligns with the candidate's strengths.`;
  if (gap >= 25)
    return `Below-average overall, but ${top.label} is ${top.v}/100. Could work for a teacher whose strength matches this pillar.`;
  return `Below-average across the board (top pillar only ${top.v}). Most candidates should look elsewhere.`;
}

export function DrawerHeroSummary({ rawComposite, tier, categoryScores }: Props) {
  // Mint a calibrated composite via the source-of-truth selector — never recompute here.
  const composite = unsafeAsCompositeScore(rawComposite);
  const pillars = buildPillarView(categoryScores);

  const tierKey = tier ?? "—";
  const tierBadge = TIER_STYLE[tierKey] ?? { bg: "#f3f5f9", color: "#526078", label: "Not yet tiered" };

  const sentence = bottomLine(composite, {
    demand: pillars.demand.display ?? null,
    tam: pillars.franchiseeSupply.display ?? null,
    comp: pillars.competitiveLandscape.display ?? null,
  });

  return (
    <div className="mb-3 rounded-xl border border-[#eef2f7] bg-white p-4">
      {/* Total Score + Tier */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8794ab]">Total Score</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[34px] font-black leading-none text-[#07142f]">{composite}</span>
            <span className="text-[12px] text-[#526078]">/ 100</span>
          </div>
          <p className="mt-1 text-[10.5px] text-[#8794ab]">
            Calibrated school-grade scale · raw WCI {Math.round(rawComposite)}
          </p>
        </div>
        <div
          className="rounded-xl px-3 py-2 text-center"
          style={{ background: tierBadge.bg, color: tierBadge.color }}
          title="Tier from rank percentile — see Scoring Method"
        >
          <div className="text-[22px] font-black leading-none">{tier ?? "—"}</div>
          <div className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.1em]">Tier</div>
        </div>
      </div>

      <p className="mt-2 text-[10.5px] italic" style={{ color: tierBadge.color }}>
        {tierBadge.label}
      </p>

      {/* Pillar bars */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {PILLARS.map(({ key, label }) => {
          const v = pillars[key].display;
          const raw = pillars[key].raw;
          const pct = v ?? 0;
          const barColor = v == null ? "#dbe4f2" : v >= 80 ? "#0d7a5f" : v >= 60 ? "#0757ff" : "#a83232";
          return (
            <div key={key}>
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#526078]">{label}</span>
                <span className="text-[12px] font-black text-[#07142f]">{pillars[key].displayFormatted}</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#f3f5f9]">
                <div
                  className="h-full transition-all"
                  style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: barColor }}
                />
              </div>
              {raw != null && (
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="mt-1 inline-flex cursor-help items-center gap-0.5 text-[9.5px] text-[#8794ab]">
                        raw {Math.round(raw)}
                        <Info className="h-2.5 w-2.5" aria-label="What does raw mean?" />
                      </p>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[240px] text-[11px] leading-snug">
                      "Raw" is this pillar's re-weighted 0–100 score before the school-grade curve. The big number above is the same score, calibrated so 90s = A, 80s = B, etc.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom-line one-liner — deterministic, no LLM. */}
      <div className="mt-3 rounded-lg bg-[#f7faff] px-3 py-2 text-[11.5px] leading-snug text-[#07142f]">
        <span className="mr-1 font-bold">Bottom line:</span>
        {sentence}
      </div>
    </div>
  );
}

export default DrawerHeroSummary;
