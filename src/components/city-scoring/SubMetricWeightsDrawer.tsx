// Sub-Metric Weights Drawer — slim orchestrator.
//
// Responsibilities:
//   - Read sub-weights from the store, render the +/- sliders for the active
//     category, and persist normalized weights on Apply.
//   - Show inline custom-metric rows (with delete confirm) when present.
//   - Delegate the "Show Formula" view to <FormulaPanel />.
//   - Delegate the locked Competitive Opportunity view to <CsiLockedPanel />.
//
// Normalization, equal-split, and pending-edit math live in
// `src/lib/subWeightNormalization.ts` and are unit-tested independently.

import { useState, useMemo } from "react";
import { Info, RotateCcw, Minus, Plus, Calculator, Sliders, Trash2, AlertTriangle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  METRICS_BY_CATEGORY,
  CATEGORY_PURPOSE,
  type SowMetricEntry,
} from "@/lib/sowMetricRegistry";
import { useCityScoringStore, type CategoryKey } from "@/stores/cityScoringStore";
import { recomputeCategoryScore, CUSTOM_METRIC_NEUTRAL_NORM } from "@/lib/clientSubWeightScoring";
import { useDeleteCustomCriterion, useUpdateCustomCriterionWeight, type CustomCriterionRow } from "@/hooks/useCustomCriteria";
import {
  sumEnabledWeights,
  normalizeToHundred,
  equalSplit,
  hasPendingEdits,
  effectivePct as effectivePctOf,
} from "@/lib/subWeightNormalization";
import { CsiLockedPanel } from "./sub-weights/CsiLockedPanel";
import { FormulaPanel } from "./sub-weights/FormulaPanel";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryKey: CategoryKey | null;
  categoryLabel: string;
  categoryColor: string;
  categoryBg: string;
  selectedCityLabel?: string;
  rawValuesByKey?: Record<string, number | null | undefined>;
  serverCategoryScore?: number | null;
  masterWeightPct?: number;
  masterWeightPendingPct?: number;
  currentCategoryScore?: number | null;
  currentComposite?: number;
  computeNewComposite?: (newCategoryScore: number) => number;
  customMetricsForCategory?: CustomCriterionRow[];
  csiBrandDetail?: string | null;
  csiRawScore?: number | null;
  csiSaturationCategory?: string | null;
  overallFormula?: {
    parts: Array<{ key: CategoryKey; label: string; score: number | null; weightPct: number }>;
    composite: number | null;
  };
}

const STATUS_PILL: Record<SowMetricEntry["status"], { label: string; cls: string }> = {
  live:    { label: "Live",        cls: "bg-green-500/15 text-green-700" },
  proxy:   { label: "Estimated",   cls: "bg-blue-500/15 text-blue-700" },
  missing: { label: "Unavailable", cls: "bg-gray-200 text-gray-600" },
  blocked: { label: "Unavailable", cls: "bg-gray-200 text-gray-600" },
};

// Provenance line shown at the top of each drawer so anyone reading knows
// where the default sub-weights came from. Operator & Venue Supply: locked May 21 2026
// by Brett + Haseeb (see sowMetricRegistry.ts line ~162).
const PROVENANCE_BY_CATEGORY: Partial<Record<CategoryKey, string>> = {
  franchiseeSupply:
    "Default weights locked 2026-05-21 by Brett + Haseeb: 20 / 25 / 15 / 15 / 25. Edit below and click Apply.",
  demand:
    "Default weights locked 2026-05-21 by Brett + Haseeb: 30 / 25 / 20 / 25 across the 4 Census ACS sub-metrics. Edit below and click Apply.",
  competitiveLandscape:
    "Locked — pulled from Manus v2 table. The three inputs feed Manus's CSI formula (NB×2 STEM + Other + Local) ÷ DAM; the stored csi_score is used directly (inverted to opportunity) in the composite. No user-tunable knobs by design.",
};
const DEFAULT_PROVENANCE =
  "Default weights from the scoring registry. Edit below and click Apply.";

export function SubMetricWeightsDrawer({
  open, onOpenChange, categoryKey, categoryLabel, categoryColor, categoryBg,
  selectedCityLabel, rawValuesByKey, serverCategoryScore, masterWeightPct,
  masterWeightPendingPct, currentCategoryScore, currentComposite, computeNewComposite,
  customMetricsForCategory, csiBrandDetail, csiRawScore, csiSaturationCategory, overallFormula,
}: Props) {
  const isCsiLocked = categoryKey === "competitiveLandscape";

  const subWeights = useCityScoringStore((s) => s.subWeights);
  const setSubWeight = useCityScoringStore((s) => s.setSubWeight);
  const appliedSubWeights = useCityScoringStore((s) => s.appliedSubWeights);
  const setAppliedSubWeights = useCityScoringStore((s) => s.setAppliedSubWeights);
  const [view, setView] = useState<"weights" | "formula">("weights");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const deleteCustom = useDeleteCustomCriterion();
  const updateCustomWeight = useUpdateCustomCriterionWeight();

  const metrics = categoryKey ? (METRICS_BY_CATEGORY[categoryKey] ?? []) : [];
  const cur = categoryKey ? (subWeights[categoryKey] ?? {}) : {};
  const customs = customMetricsForCategory ?? [];
  const customMetricsForRecompute = useMemo(
    () => customs.map((c) => ({ id: c.id, label: c.name, weight: Number(c.weight) || 0 })),
    [customs],
  );

  const enabledSum = useMemo(
    () => sumEnabledWeights(metrics, cur, customMetricsForRecompute),
    [metrics, cur, customMetricsForRecompute],
  );

  // Live preview of what this category's score WOULD be if Apply were clicked.
  const previewRecompute = useMemo(() => {
    if (!rawValuesByKey) return null;
    return recomputeCategoryScore(metrics, rawValuesByKey, cur, serverCategoryScore ?? null, customMetricsForRecompute);
  }, [metrics, rawValuesByKey, cur, serverCategoryScore, customMetricsForRecompute]);

  const pendingEdits = useMemo(() => {
    if (!categoryKey) return false;
    return hasPendingEdits(metrics, cur, enabledSum, appliedSubWeights[categoryKey] ?? {});
  }, [categoryKey, cur, metrics, enabledSum, appliedSubWeights]);

  if (!categoryKey) return null;

  const handleApply = () => {
    const normalized = normalizeToHundred(metrics, cur, enabledSum);
    setAppliedSubWeights({
      ...appliedSubWeights,
      [categoryKey]: normalized,
    });

    // Delta toast.
    const newCatScoreRaw = previewRecompute?.score ?? null;
    const oldCat = currentCategoryScore;
    const newCatRounded = newCatScoreRaw != null ? Math.round(newCatScoreRaw) : null;
    const oldComp = currentComposite;
    const newComp = newCatScoreRaw != null && computeNewComposite
      ? computeNewComposite(newCatScoreRaw)
      : oldComp;

    if (enabledSum <= 0) {
      toast.success(`${categoryLabel} — all sub-weights are 0. Raise at least one slider to compute a live score.`, { duration: 4000 });
    } else if (oldCat != null && newCatRounded != null) {
      const catLine = `${categoryLabel} updated: ${oldCat.toFixed(0)} → ${newCatRounded}`;
      const compLine = oldComp != null && newComp != null && oldComp !== newComp
        ? ` · Composite updated: ${oldComp} → ${newComp}`
        : "";
      toast.success(catLine + compLine, { duration: 4000 });
    } else {
      toast.success(`${categoryLabel} weights applied (auto-normalized to 100%)`, { duration: 4000 });
    }
    onOpenChange(false);
  };

  const handleResetCategory = () => {
    const split = equalSplit(metrics);
    metrics.forEach((m) => setSubWeight(categoryKey, m.key, split[m.key] ?? 0));
    toast.success(`${categoryLabel} weights reset to equal split`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[560px] p-0 flex flex-col bg-white">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-[#eef2f7] space-y-2">
          <div className="flex items-center justify-between gap-2 pr-8">
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
              className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-[#174be8] hover:underline mr-2"
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
          <p className="text-[10.5px] leading-snug text-[#526078] italic">
            {PROVENANCE_BY_CATEGORY[categoryKey] ?? DEFAULT_PROVENANCE}
          </p>
        </SheetHeader>

        {view === "weights" ? (
          isCsiLocked ? (
            <CsiLockedPanel
              metrics={metrics}
              rawValuesByKey={rawValuesByKey}
              csiRawScore={csiRawScore ?? null}
              csiSaturationCategory={csiSaturationCategory ?? null}
              csiBrandDetail={csiBrandDetail ?? null}
              selectedCityLabel={selectedCityLabel}
            />
          ) : (
            <TooltipProvider delayDuration={150}>
              <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
                {metrics.map((m) => {
                  const value = cur[m.key] ?? 0;
                  const isDisabled = !m.enabled;
                  const pill = STATUS_PILL[m.status];
                  const eff = effectivePctOf(value, m.enabled, enabledSum);
                  return (
                    <div
                      key={m.key}
                      className={`flex flex-col py-1.5 px-2 rounded border ${
                        isDisabled ? "border-transparent bg-gray-50/50" : "border-transparent hover:bg-[#fafbfd]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
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
                      {m.source && (
                        <p className={`text-[10.5px] leading-snug mt-1 pl-0.5 ${
                          isDisabled ? "text-[#b6bfd0]" : "text-[#6b7894]"
                        }`}>
                          <span className="font-semibold">Data Source:</span> {m.source}
                        </p>
                      )}
                    </div>
                  );
                })}

                {customs.length > 0 && (
                  <div className="pt-2 mt-2 border-t border-dashed border-[#e5eaf2]">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#526078] mb-1.5 px-1">
                      Custom metrics
                    </p>
                    {customs.map((cm) => {
                      const w = Number(cm.weight) || 0;
                      const eff = effectivePctOf(w, true, enabledSum);
                      return (
                        <div
                          key={cm.id}
                          className="flex items-center gap-2 py-1.5 px-2 rounded border border-transparent hover:bg-[#fafbfd]"
                        >
                          <div className="flex-1 min-w-0 flex items-center gap-1.5">
                            <span className="text-[12.5px] leading-tight text-[#07142f] font-medium truncate">
                              {cm.name}
                            </span>
                            <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-[#eef4ff] text-[#174be8] font-semibold">
                              CUSTOM
                            </span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center text-[#b45309]">
                                  <AlertTriangle size={11} />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[260px] text-[12px] leading-snug">
                                No live data — using neutral score ({CUSTOM_METRIC_NEUTRAL_NORM}) until a data source is connected.
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="flex items-center h-7 rounded border overflow-hidden border-[#e5eaf2] bg-white">
                            <button
                              type="button"
                              aria-label="Decrease weight"
                              disabled={w <= 0}
                              onClick={() => updateCustomWeight.mutate({ id: cm.id, weight: Math.max(0, w - 1) })}
                              className="h-full w-7 flex items-center justify-center text-[#526078] hover:bg-[#f3f6fb] disabled:text-[#c5cdda] disabled:cursor-not-allowed"
                            >
                              <Minus size={12} />
                            </button>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={w}
                              onChange={(e) => {
                                const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                                updateCustomWeight.mutate({ id: cm.id, weight: isNaN(n) ? 0 : n });
                              }}
                              className="w-9 h-full text-[12px] text-center bg-transparent border-x border-[#eef2f7] focus:outline-none text-[#07142f]"
                            />
                            <button
                              type="button"
                              aria-label="Increase weight"
                              onClick={() => updateCustomWeight.mutate({ id: cm.id, weight: w + 1 })}
                              className="h-full w-7 flex items-center justify-center text-[#526078] hover:bg-[#f3f6fb]"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <span className="text-[10.5px] tabular-nums whitespace-nowrap w-[54px] text-right text-[#8794ab]">
                            {eff == null ? "→ —" : `→ ${eff.toFixed(1)}%`}
                          </span>
                          <button
                            type="button"
                            aria-label="Delete custom metric"
                            onClick={() => setConfirmDeleteId(cm.id)}
                            className="w-[68px] inline-flex items-center justify-center h-7 rounded text-[#b91c1c] hover:bg-[#fef2f2]"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TooltipProvider>
          )
        ) : (
          <FormulaPanel
            categoryKey={categoryKey}
            categoryLabel={categoryLabel}
            selectedCityLabel={selectedCityLabel}
            previewRecompute={previewRecompute}
            serverCategoryScore={serverCategoryScore ?? null}
            masterWeightPct={masterWeightPct ?? null}
            masterWeightPendingPct={masterWeightPendingPct ?? null}
            enabledSum={enabledSum}
            pendingEdits={pendingEdits}
            overallFormula={overallFormula}
          />
        )}

        <AlertDialog open={confirmDeleteId !== null} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete custom metric?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the metric and recompute scores for all cities.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (confirmDeleteId) {
                    deleteCustom.mutate(confirmDeleteId, {
                      onSuccess: () => toast.success("Custom metric deleted"),
                    });
                  }
                  setConfirmDeleteId(null);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {isCsiLocked ? (
          <div className="border-t border-[#eef2f7] px-5 py-3 bg-[#fafbfd]">
            <p className="text-[10.5px] text-[#8794ab] leading-snug">
              Locked — pulled directly from Brett's Manus v2 table. Competitive Opportunity is computed from Manus CSI (Opportunity = 100 − CSI) and used as-is in the composite. No user-tunable knobs.
            </p>
          </div>
        ) : (
          <div className="border-t border-[#eef2f7] px-5 py-3 flex items-center justify-between gap-3 bg-[#fafbfd]">
            <p className="text-[10.5px] text-[#8794ab] leading-snug max-w-[260px]">
              Auto-normalized to 100% on save. If all sub-weights are 0, the live score won't update until you raise one.
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
                Save &amp; Recalculate
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
