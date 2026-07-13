import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  buildPillarView,
  CALIBRATION_ANCHORS,
  unsafeAsCompositeScore,
  type CompositeScore,
} from "@/lib/marketView";
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

const PILLARS: Array<{ key: "demand" | "franchiseeSupply" | "competitiveLandscape"; label: string; short: string }> = [
  { key: "demand", label: "Demand", short: "Demand" },
  { key: "franchiseeSupply", label: "Operator & Venue Supply", short: "Op/Venue" },
  { key: "competitiveLandscape", label: "Competitive Opp", short: "Comp Opp" },
];

const ANCHOR_NOTE: Record<number, string> = {
  41: "Tier C cutoff",
  50: "Tier B cutoff",
  59: "Tier A cutoff",
};

function bottomLine(
  total: CompositeScore,
  pillars: { demand: number | null; tam: number | null; comp: number | null },
): string {
  const parts = [
    { label: "Demand", v: pillars.demand },
    { label: "Operator & Venue Supply", v: pillars.tam },
    { label: "Competitive Opp", v: pillars.comp },
  ].filter((p): p is { label: string; v: number } => p.v != null);
  if (parts.length < 2) return `Total Score ${total} — limited pillar data.`;
  const sorted = [...parts].sort((a, b) => b.v - a.v);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const gap = top.v - bottom.v;
  if (total >= 90) return `Top-tier market. Open recruiting now.`;
  if (total >= 80) return `Strong market. Move forward; keep an eye on ${bottom.label} (${bottom.v}).`;
  if (total >= 70) return `Borderline. Worth a closer look at ${top.label} (${top.v}) before committing.`;
  if (gap >= 25) return `Skip as a primary market, but ${top.label} (${top.v}) is unusually strong — niche play possible.`;
  return `Skip — no pillar above ${top.v}.`;
}


/** Find the two anchors that bracket a raw value and return the interp arithmetic. */
function interpLine(label: string, raw: number | null): { label: string; text: string; display: number } | null {
  if (raw == null || !Number.isFinite(raw)) return null;
  const r = Math.max(0, Math.min(100, raw));
  for (let i = 1; i < CALIBRATION_ANCHORS.length; i += 1) {
    const [x0, y0] = CALIBRATION_ANCHORS[i - 1];
    const [x1, y1] = CALIBRATION_ANCHORS[i];
    if (r <= x1) {
      const t = x1 === x0 ? 0 : (r - x0) / (x1 - x0);
      const display = Math.round(y0 + t * (y1 - y0));
      const rawFmt = Number.isInteger(r) ? String(r) : r.toFixed(1);
      return {
        label,
        text: `${y0} + (${rawFmt} − ${x0}) / (${x1} − ${x0}) × ${y1 - y0} = ${display}`,
        display,
      };
    }
  }
  return { label, text: `clamps to 100`, display: 100 };
}

export function DrawerHeroSummary({ rawComposite, tier, categoryScores }: Props) {
  const [curveOpen, setCurveOpen] = useState(false);
  const composite = unsafeAsCompositeScore(rawComposite);
  const pillars = buildPillarView(categoryScores);

  const tierKey = tier ?? "—";
  const tierBadge = TIER_STYLE[tierKey] ?? { bg: "#f3f5f9", color: "#526078", label: "Not yet tiered" };

  const sentence = bottomLine(composite, {
    demand: pillars.demand.display ?? null,
    tam: pillars.franchiseeSupply.display ?? null,
    comp: pillars.competitiveLandscape.display ?? null,
  });

  const interpRows = [
    interpLine("Demand", pillars.demand.raw),
    interpLine("Op/Venue", pillars.franchiseeSupply.raw),
    interpLine("Comp Opp", pillars.competitiveLandscape.raw),
    interpLine("Total", rawComposite),
  ].filter((r): r is { label: string; text: string; display: number } => r != null);

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
            Display score 0–100 · math score {Math.round(rawComposite)}
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
      <p className="mt-3 text-[10px] italic text-[#8794ab]">
        Each pillar shows two numbers: the big <strong className="font-semibold not-italic text-[#526078]">display score</strong>, and the smaller <strong className="font-semibold not-italic text-[#526078]">math score</strong> it came from.
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
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
                        math {Math.round(raw)}
                        <Info className="h-2.5 w-2.5" aria-label="What does math score mean?" />
                      </p>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[260px] text-[11px] leading-snug">
                      <strong className="font-semibold">Two numbers, one truth.</strong> The small number ({Math.round(raw)}) is the <strong className="font-semibold">math score</strong> — the actual weighted average of this pillar's inputs (0–100), used to rank cities. The big number ({v}) is the <strong className="font-semibold">display score</strong> — that same math calibrated onto a friendlier 0–100 scale so only the very best markets in the country reach the top tier. This makes every city easy to compare against any other city in the list. Rankings are identical either way.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          );
        })}
      </div>

      {/* Show curve — expandable calibration table + per-city interp */}
      <Collapsible open={curveOpen} onOpenChange={setCurveOpen} className="mt-3">
        <CollapsibleTrigger className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#2250eb] hover:underline">
          <ChevronDown className={`h-3 w-3 transition-transform ${curveOpen ? "rotate-180" : ""}`} />
          {curveOpen ? "Hide" : "Show"} curve — how math turns into display
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 rounded-lg border border-[#eef2f7] bg-[#fafbfd] p-3">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#8794ab]">Calibration anchors</p>
          <table className="mt-1 w-full text-[11px] font-mono tabular-nums text-[#07142f]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.08em] text-[#8794ab]">
                <th className="py-0.5 pr-3 font-bold">math</th>
                <th className="py-0.5 pr-3 font-bold">→ display</th>
                <th className="py-0.5 font-bold">note</th>
              </tr>
            </thead>
            <tbody>
              {CALIBRATION_ANCHORS.map(([x, y]) => (
                <tr key={`${x}-${y}`}>
                  <td className="py-0.5 pr-3">{String(x).padStart(3, " ")}</td>
                  <td className="py-0.5 pr-3">{String(y).padStart(3, " ")}</td>
                  <td className="py-0.5 text-[10px] italic text-[#8794ab]">{ANCHOR_NOTE[x] ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-3 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#8794ab]">
            This city, step by step
          </p>
          <div className="mt-1 space-y-0.5 font-mono text-[10.5px] text-[#07142f]">
            {interpRows.map((r) => (
              <div key={r.label}>
                <span className="inline-block w-[64px] font-semibold">{r.label}:</span>
                <span>{r.text}</span>
              </div>
            ))}
          </div>

          <p className="mt-2 text-[10px] italic text-[#8794ab]">
            The display score bends the math onto a friendlier 0–100 scale. Rankings are identical either way.
          </p>
        </CollapsibleContent>
      </Collapsible>

      {/* Bottom-line one-liner — deterministic, no LLM. */}
      <div className="mt-3 rounded-lg bg-[#f7faff] px-3 py-2 text-[11.5px] leading-snug text-[#07142f]">
        <span className="mr-1 font-bold">Bottom line:</span>
        {sentence}
      </div>
    </div>
  );
}

export default DrawerHeroSummary;
