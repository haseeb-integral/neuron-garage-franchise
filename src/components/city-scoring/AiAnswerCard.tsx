import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, AlertTriangle, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type AiSubMetricBoost = { key: string; delta: number; pillar: string; label: string };

export type AiResult = {
  summary: string;
  filters: { state: string | null; minScore: number | null; tier: string | null };
  weightMode?: "absolute" | "delta";
  absoluteWeights?: Record<string, number>;
  weightAdjustments: Record<string, number>;
  subMetricBoosts?: AiSubMetricBoost[];
  reasoning_steps: string[];
  dataGaps: string[];
};

const CATEGORY_LABELS: Record<string, string> = {
  demand: "Demand",
  competitiveLandscape: "Competitive Opportunity",
  franchiseeSupply: "Operator & Venue Supply",
};

export interface AiAnswerCardProps {
  result: AiResult;
  query: string;
  turnCount: number;
  onRefine: (followUp: string) => void;
  loading: boolean;
  /**
   * Final applied weights AFTER the frontend rebalanced to total 100%.
   * Shown as percentage chips so the card matches the actual sliders the user sees.
   */
  appliedWeights?: Record<string, number>;
  /**
   * Weights snapshot from BEFORE this AI turn applied changes. Used to render
   * a one-line "what changed" diff like "Demand 40 → 25 · Operator & Venue Supply 30 → 60".
   */
  priorWeights?: Record<string, number>;
}

export function AiAnswerCard({ result, query, turnCount, onRefine, loading, appliedWeights, priorWeights }: AiAnswerCardProps) {
  // Reasoning is OPEN by default — the user explicitly asked that AI never
  // hide its reasoning. They can collapse to save space, but the default is
  // full transparency.
  const [showReasoning, setShowReasoning] = useState(true);
  const [followUp, setFollowUp] = useState("");

  const filterChips: string[] = [];
  if (result.filters.state) filterChips.push(`state: ${result.filters.state}`);
  if (result.filters.tier) filterChips.push(`tier: ${result.filters.tier}`);
  if (result.filters.minScore != null) filterChips.push(`score ≥ ${result.filters.minScore}`);

  // Prefer the FINAL applied weights (post-rebalance) over the raw backend
  // deltas, so chips match the actual sliders. Fall back to deltas only if
  // applied weights weren't passed in.
  const isAbsolute = result.weightMode === "absolute";
  const usedAnyAdjustment =
    isAbsolute ||
    Object.values(result.weightAdjustments ?? {}).some((v) => v !== 0);
  const weightChips = appliedWeights && usedAnyAdjustment
    ? Object.entries(appliedWeights)
        .filter(([, v]) => !isAbsolute || Number(v) > 0)
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .map(([k, v]) => `${CATEGORY_LABELS[k] ?? k} ${Math.round(Number(v))}%`)
    : Object.entries(result.weightAdjustments)
        .filter(([, v]) => v !== 0)
        .map(([k, v]) => `${CATEGORY_LABELS[k] ?? k} ${v > 0 ? "+" : ""}${v}`);

  const atCap = turnCount >= 6;

  // Build "what changed" diff. Only show when weights actually moved AND we
  // have a prior snapshot. Format: "Demand 40 → 25 · Operator & Venue Supply 30 → 60".
  const weightDiff: string[] = [];
  if (priorWeights && appliedWeights) {
    for (const k of Object.keys(appliedWeights)) {
      const before = Math.round(Number(priorWeights[k] ?? 0));
      const after = Math.round(Number(appliedWeights[k] ?? 0));
      if (before !== after) {
        weightDiff.push(`${CATEGORY_LABELS[k] ?? k} ${before} → ${after}`);
      }
    }
  }

  return (
    <div className="mb-4 bg-white border border-[#d6cdf5] rounded-xl p-4 shadow-sm">
      {/* Strong "Searched:" header so the user always sees what was sent, not
          just the AI's rewritten summary. Bumped from a small grey line to a
          first-class header per Haseeb's feedback. */}
      <div className="mb-3 pb-3 border-b border-[#f1ecff]">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7c3aed] mb-1">
          Searched
        </div>
        <div className="text-sm font-medium text-[#1f2540] leading-snug">"{query}"</div>
      </div>

      <div className="flex items-start gap-2 mb-2">
        <Sparkles size={16} className="text-[#7c3aed] mt-0.5" />
        <div className="flex-1">
          <div className="text-sm text-[#343a40] leading-relaxed">{result.summary}</div>
        </div>
      </div>

      {weightDiff.length > 0 && (
        <div className="mt-2 text-[12px] text-[#5b3fbf] font-medium">
          What changed: {weightDiff.join(" · ")}
        </div>
      )}

      {(filterChips.length > 0 || weightChips.length > 0 || (result.subMetricBoosts && result.subMetricBoosts.length > 0)) && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {filterChips.map((c) => (
            <span key={c} className="text-[11px] px-2 py-0.5 rounded-full bg-[#eaf0ff] text-[#174be8] font-medium">
              filter · {c}
            </span>
          ))}
          {weightChips.map((c) => (
            <span key={c} className="text-[11px] px-2 py-0.5 rounded-full bg-[#f1ebff] text-[#7c3aed] font-medium">
              weight · {c}
            </span>
          ))}
          {(result.subMetricBoosts ?? []).map((b) => (
            <span key={`${b.pillar}:${b.key}`} className="text-[11px] px-2 py-0.5 rounded-full bg-[#eafff4] text-[#0ea66e] font-medium">
              boost · {b.label} {b.delta > 0 ? "+" : ""}{b.delta}
            </span>
          ))}
        </div>
      )}

      {result.dataGaps.length > 0 && (
        <div className="mt-3 flex items-start gap-2 p-2 rounded-md bg-[#fff7ed] border border-[#fed7aa]">
          <AlertTriangle size={14} className="text-[#ea580c] mt-0.5" />
          <div className="text-xs text-[#9a3412]">
            <span className="font-medium">Data gaps:</span> {result.dataGaps.join(" · ")}
          </div>
        </div>
      )}

      {result.reasoning_steps.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowReasoning((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-[#6c757d] hover:text-[#343a40]"
          >
            {showReasoning ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {showReasoning ? "Hide" : "Show"} AI reasoning ({result.reasoning_steps.length} steps)
          </button>
          {showReasoning && (
            <ol className="mt-2 space-y-1 text-xs text-[#495057] list-decimal list-inside">
              {result.reasoning_steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          )}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-[#eee]">
        {atCap ? (
          <div className="text-xs text-[#8794ab]">
            Refinement limit reached (6 turns). Start a new search to keep exploring.
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && followUp.trim()) {
                  onRefine(followUp.trim());
                  setFollowUp("");
                }
              }}
              placeholder={`Refine →  e.g. "now only show A-tier" (${6 - turnCount} refinements left)`}
              className="h-9 text-sm"
              disabled={loading}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={loading || !followUp.trim()}
              onClick={() => { onRefine(followUp.trim()); setFollowUp(""); }}
              className={cn("h-9")}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
