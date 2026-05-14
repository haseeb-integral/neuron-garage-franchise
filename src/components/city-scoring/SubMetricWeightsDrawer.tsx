import { useState, useMemo } from "react";
import { Info, RotateCcw, Minus, Plus, Calculator, Sliders } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  METRICS_BY_CATEGORY,
  DEFAULT_SUB_WEIGHTS,
  CATEGORY_PURPOSE,
  type SowMetricEntry,
} from "@/lib/sowMetricRegistry";
import { useCityScoringStore, type CategoryKey } from "@/stores/cityScoringStore";
import { recomputeCategoryScore, summarizeCategory } from "@/lib/clientSubWeightScoring";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryKey: CategoryKey | null;
  categoryLabel: string;
  categoryColor: string;
  categoryBg: string;
  // Optional: if provided, the Show Formula panel renders live values for this city.
  selectedCityLabel?: string;
  rawValuesByKey?: Record<string, number | null | undefined>;
  serverCategoryScore?: number | null;
  masterWeightPct?: number; // 0..100
}

const STATUS_PILL: Record<SowMetricEntry["status"], { label: string; cls: string }> = {
  live:    { label: "Live",        cls: "bg-green-500/15 text-green-700" },
  proxy:   { label: "Estimated",   cls: "bg-blue-500/15 text-blue-700" },
  missing: { label: "Unavailable", cls: "bg-gray-200 text-gray-600" },
  blocked: { label: "Unavailable", cls: "bg-gray-200 text-gray-600" },
};

const fmt = (n: number | null | undefined, decimals = 1) =>
  n == null || !Number.isFinite(n) ? "—" : n.toFixed(decimals);

export function SubMetricWeightsDrawer({
  open, onOpenChange, categoryKey, categoryLabel, categoryColor, categoryBg,
  selectedCityLabel, rawValuesByKey, serverCategoryScore, masterWeightPct,
}: Props) {
  const subWeights = useCityScoringStore((s) => s.subWeights);
  const setSubWeight = useCityScoringStore((s) => s.setSubWeight);
  const appliedSubWeights = useCityScoringStore((s) => s.appliedSubWeights);
  const setAppliedSubWeights = useCityScoringStore((s) => s.setAppliedSubWeights);
  const [view, setView] = useState<"weights" | "formula">("weights");

  const metrics = categoryKey ? (METRICS_BY_CATEGORY[categoryKey] ?? []) : [];
  const cur = categoryKey ? (subWeights[categoryKey] ?? {}) : {};

  // Live "effective %" preview — pure local arithmetic, no store writes.
  const enabledSum = useMemo(
    () => metrics.reduce((s, m) => s + (m.enabled ? (cur[m.key] ?? 0) : 0), 0),
    [metrics, cur],
  );
  const effectivePct = (key: string, isEnabled: boolean) => {
    if (!isEnabled || enabledSum <= 0) return null;
    return ((cur[key] ?? 0) / enabledSum) * 100;
  };

  // Live preview of what this category's score WOULD be if Apply were clicked.
  // Uses the user's typed sub-weights (auto-normalized inside recompute via subShare).
  const previewRecompute = useMemo(() => {
    if (!rawValuesByKey) return null;
    return recomputeCategoryScore(metrics, rawValuesByKey, cur, serverCategoryScore ?? null);
  }, [metrics, rawValuesByKey, cur, serverCategoryScore]);

  if (!categoryKey) return null;

  const handleApply = () => {
    // Auto-normalize: persist normalized (sum=100) sub-weights for enabled
    // metrics; disabled metrics stay at 0. If everything is zero, we persist
    // zeros — the scoring helper falls back to the server category score.
    const normalized: Record<string, number> = {};
    metrics.forEach((m) => {
      const v = m.enabled ? (cur[m.key] ?? 0) : 0;
      normalized[m.key] = enabledSum > 0 ? (v / enabledSum) * 100 : 0;
    });
    setAppliedSubWeights({
      ...appliedSubWeights,
      [categoryKey]: normalized,
    });
    toast.success(
      enabledSum > 0
        ? `${categoryLabel} weights applied (auto-normalized to 100%)`
        : `${categoryLabel} reset — using server score as fallback`,
    );
    onOpenChange(false);
  };

  const handleResetCategory = () => {
    // Equal split across enabled metrics (integer rounding).
    const enabled = metrics.filter((m) => m.enabled);
    const equal = enabled.length > 0 ? Math.round(100 / enabled.length) : 0;
    metrics.forEach((m) => setSubWeight(categoryKey, m.key, m.enabled ? equal : 0));
    toast.success(`${categoryLabel} weights reset to equal split`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[560px] p-0 flex flex-col bg-white">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-[#eef2f7] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: categoryColor }}
              />
              <SheetTitle className="text-[15px] text-[#07142f] truncate">
                {categoryLabel} — Sub-Metric Weights
              </SheetTitle>
            </div>
            <button
              type="button"
              onClick={() => setView(view === "weights" ? "formula" : "weights")}
              className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-[#174be8] hover:underline"
            >
              {view === "weights" ? <Calculator size={12} /> : <Sliders size={12} />}
              {view === "weights" ? "Show Formula" : "Edit Weights"}
            </button>
          </div>
          <SheetDescription className="text-[12px] leading-snug text-[#526078]">
            {CATEGORY_PURPOSE[categoryKey]}
          </SheetDescription>
          {view === "weights" && (
            <p
              className="text-[11px] leading-snug rounded px-2.5 py-1.5"
              style={{ backgroundColor: categoryBg, color: "#3a4256" }}
            >
              Numbers express relative importance — auto-normalized to 100% on Apply.
              Hover the <Info size={11} className="inline -mt-0.5" /> icon for what each metric means.
            </p>
          )}
        </SheetHeader>

        {view === "weights" ? (
          <TooltipProvider delayDuration={150}>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
              {metrics.map((m) => {
                const value = cur[m.key] ?? 0;
                const isDisabled = !m.enabled;
                const pill = STATUS_PILL[m.status];
                const eff = effectivePct(m.key, m.enabled);

                return (
                  <div
                    key={m.key}
                    className={`flex items-center gap-2 py-1.5 px-2 rounded border ${
                      isDisabled ? "border-transparent bg-gray-50/50" : "border-transparent hover:bg-[#fafbfd]"
                    }`}
                  >
                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                      <span
                        className={`text-[12.5px] leading-tight ${
                          isDisabled ? "text-[#9aa3b5]" : "text-[#07142f] font-medium"
                        }`}
                      >
                        {m.label}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label={`About ${m.label}`}
                            className="text-[#8794ab] hover:text-[#174be8] transition-colors flex-shrink-0"
                          >
                            <Info size={12} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[280px] text-[12px] leading-snug">
                          {m.description}
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <div
                      className={`flex items-center h-7 rounded border overflow-hidden ${
                        isDisabled
                          ? "border-[#eef2f7] bg-gray-50 opacity-60"
                          : "border-[#e5eaf2] bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        aria-label="Decrease weight"
                        disabled={isDisabled || value <= 0}
                        onClick={() => setSubWeight(categoryKey, m.key, value - 1)}
                        className="h-full w-7 flex items-center justify-center text-[#526078] hover:bg-[#f3f6fb] disabled:text-[#c5cdda] disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        disabled={isDisabled}
                        value={value}
                        onChange={(e) => {
                          const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                          setSubWeight(categoryKey, m.key, isNaN(n) ? 0 : n);
                        }}
                        className={`w-9 h-full text-[12px] text-center bg-transparent border-x border-[#eef2f7] focus:outline-none ${
                          isDisabled ? "text-[#9aa3b5] cursor-not-allowed" : "text-[#07142f]"
                        }`}
                      />
                      <button
                        type="button"
                        aria-label="Increase weight"
                        disabled={isDisabled}
                        onClick={() => setSubWeight(categoryKey, m.key, value + 1)}
                        className="h-full w-7 flex items-center justify-center text-[#526078] hover:bg-[#f3f6fb] disabled:text-[#c5cdda] disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <span
                      className={`text-[10.5px] tabular-nums whitespace-nowrap w-[54px] text-right ${
                        isDisabled ? "text-[#c5cdda]" : "text-[#8794ab]"
                      }`}
                    >
                      {eff == null ? "→ —" : `→ ${eff.toFixed(1)}%`}
                    </span>

                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap w-[68px] text-center ${pill.cls}`}
                    >
                      {pill.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </TooltipProvider>
        ) : (
          <FormulaPanel
            categoryLabel={categoryLabel}
            selectedCityLabel={selectedCityLabel}
            previewRecompute={previewRecompute}
            serverCategoryScore={serverCategoryScore ?? null}
            masterWeightPct={masterWeightPct ?? null}
            enabledSum={enabledSum}
          />
        )}

        <div className="border-t border-[#eef2f7] px-5 py-3 flex items-center justify-between gap-3 bg-[#fafbfd]">
          <p className="text-[10.5px] text-[#8794ab] leading-snug max-w-[260px]">
            Auto-normalized to 100% on Apply. Empty category falls back to server score.
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetCategory}
              className="h-8 text-[11px] gap-1.5"
            >
              <RotateCcw size={12} />
              Reset Category
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              className="h-8 bg-[#174be8] hover:bg-[#1240c9] text-white text-[11px] px-3"
            >
              Apply Weights
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────── Show Formula panel ───────────────────────────

function FormulaPanel({
  categoryLabel,
  selectedCityLabel,
  previewRecompute,
  serverCategoryScore,
  masterWeightPct,
  enabledSum,
}: {
  categoryLabel: string;
  selectedCityLabel?: string;
  previewRecompute: ReturnType<typeof recomputeCategoryScore> | null;
  serverCategoryScore: number | null;
  masterWeightPct: number | null;
  enabledSum: number;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-[12px] text-[#07142f] leading-relaxed">
      <section>
        <h4 className="text-[11px] font-bold uppercase tracking-wide text-[#526078] mb-1.5">
          1. Within-category normalization
        </h4>
        <pre className="rounded bg-[#f7faff] border border-[#eef2f7] px-3 py-2 text-[11.5px] font-mono text-[#1a2540] overflow-x-auto">
{`sub_share_i = sub_i / Σ(enabled sub-weights)
            = sub_i / ${enabledSum || 0}`}
        </pre>
        <p className="text-[11px] text-[#526078] mt-1">
          Your typed numbers express relative importance. They're divided by their
          sum so each enabled metric contributes a share that totals 100%.
        </p>
      </section>

      <section>
        <h4 className="text-[11px] font-bold uppercase tracking-wide text-[#526078] mb-1.5">
          2. {categoryLabel} category score
        </h4>
        <pre className="rounded bg-[#f7faff] border border-[#eef2f7] px-3 py-2 text-[11.5px] font-mono text-[#1a2540] overflow-x-auto">
{`categoryScore = Σ_i (sub_share_i × normalized_i)
normalized_i  = raw_i scaled to 0..100 (per-metric range)`}
        </pre>
        <p className="text-[11px] text-[#526078] mt-1">
          Falls back to the server-stored category score when all sub-weights
          collapse to zero or no metrics have usable values.
        </p>
      </section>

      <section>
        <h4 className="text-[11px] font-bold uppercase tracking-wide text-[#526078] mb-1.5">
          3. Composite score
        </h4>
        <pre className="rounded bg-[#f7faff] border border-[#eef2f7] px-3 py-2 text-[11.5px] font-mono text-[#1a2540] overflow-x-auto">
{`composite = Σ_c (master_c / Σmaster) × categoryScore_c`}
        </pre>
      </section>

      <section>
        <h4 className="text-[11px] font-bold uppercase tracking-wide text-[#526078] mb-1.5">
          Live values{selectedCityLabel ? ` — ${selectedCityLabel}` : ""}
        </h4>
        {!previewRecompute ? (
          <p className="text-[11px] text-[#8794ab] italic">
            Open this drawer from a selected city to see this category's metrics
            with live raw → normalized → contribution math.
          </p>
        ) : (
          <div className="rounded border border-[#eef2f7] overflow-hidden">
            <table className="w-full text-[11px] font-mono">
              <thead className="bg-[#fafbfd] text-[#526078]">
                <tr>
                  <th className="text-left px-2 py-1.5 font-medium">Metric</th>
                  <th className="text-right px-2 py-1.5 font-medium">Raw</th>
                  <th className="text-right px-2 py-1.5 font-medium">Norm</th>
                  <th className="text-right px-2 py-1.5 font-medium">Share</th>
                  <th className="text-right px-2 py-1.5 font-medium">Contrib</th>
                </tr>
              </thead>
              <tbody>
                {previewRecompute.contributions.map((c) => (
                  <tr key={c.key} className={`border-t border-[#eef2f7] ${c.used ? "" : "text-[#9aa3b5]"}`}>
                    <td className="px-2 py-1 truncate max-w-[160px]" title={c.label}>{c.label}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{c.rawValue == null ? "—" : c.rawValue.toLocaleString()}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{c.normalized == null ? "—" : c.normalized.toFixed(1)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{c.used ? `${(c.subShare * 100).toFixed(1)}%` : "—"}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{c.used ? c.contribution.toFixed(2) : "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#f7faff] border-t-2 border-[#eef2f7]">
                <tr>
                  <td colSpan={4} className="px-2 py-1.5 text-right font-semibold text-[#1a2540]">
                    {categoryLabel} score
                    {previewRecompute.usedServerFallback && " (server fallback)"}
                  </td>
                  <td className="px-2 py-1.5 text-right font-bold tabular-nums text-[#1a2540]">
                    {previewRecompute.score == null ? "—" : previewRecompute.score.toFixed(1)}
                  </td>
                </tr>
                {masterWeightPct != null && previewRecompute.score != null && (
                  <tr>
                    <td colSpan={4} className="px-2 py-1.5 text-right text-[#526078]">
                      × master weight {masterWeightPct.toFixed(1)}% → composite contribution
                    </td>
                    <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-[#174be8]">
                      {((previewRecompute.score * masterWeightPct) / 100).toFixed(2)}
                    </td>
                  </tr>
                )}
                {serverCategoryScore != null && (
                  <tr>
                    <td colSpan={4} className="px-2 py-1.5 text-right text-[#8794ab]">
                      Server-stored {categoryLabel} score (fallback)
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-[#8794ab]">
                      {fmt(serverCategoryScore, 0)}
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
