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
import { recomputeCategoryScore, summarizeCategory, CUSTOM_METRIC_NEUTRAL_NORM } from "@/lib/clientSubWeightScoring";
import { useDeleteCustomCriterion, useUpdateCustomCriterionWeight, type CustomCriterionRow } from "@/hooks/useCustomCriteria";

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
  masterWeightPct?: number; // 0..100, applied master share
  masterWeightPendingPct?: number; // 0..100, share if pending master sliders were applied
  currentCategoryScore?: number | null; // displayed category score before Apply (for delta toast)
  currentComposite?: number; // composite before Apply (for delta toast)
  computeNewComposite?: (newCategoryScore: number) => number; // recompute composite swapping in new category score
  customMetricsForCategory?: CustomCriterionRow[]; // user-added metrics in this category
  // Optional: full city-level breakdown for the "Overall city formula" line.
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
// where the default sub-weights came from. TAM Teachers: locked May 21 2026
// by Brett + Haseeb (see sowMetricRegistry.ts line ~162).
const PROVENANCE_BY_CATEGORY: Partial<Record<CategoryKey, string>> = {
  franchiseeSupply:
    "Default weights locked 2026-05-21 by Brett + Haseeb: 20 / 25 / 15 / 15 / 25. Edit below and click Apply.",
};
const DEFAULT_PROVENANCE =
  "Default weights from the scoring registry. Edit below and click Apply.";

const fmt = (n: number | null | undefined, decimals = 1) =>
  n == null || !Number.isFinite(n) ? "—" : n.toFixed(decimals);


export function SubMetricWeightsDrawer({
  open, onOpenChange, categoryKey, categoryLabel, categoryColor, categoryBg,
  selectedCityLabel, rawValuesByKey, serverCategoryScore, masterWeightPct,
  masterWeightPendingPct, currentCategoryScore, currentComposite, computeNewComposite,
  customMetricsForCategory, overallFormula,
}: Props) {

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

  // Live "effective %" preview — pure local arithmetic, no store writes.
  const builtInSum = useMemo(
    () => metrics.reduce((s, m) => s + (m.enabled ? (cur[m.key] ?? 0) : 0), 0),
    [metrics, cur],
  );
  const customSum = customMetricsForRecompute.reduce((s, c) => s + (c.weight || 0), 0);
  const enabledSum = builtInSum + customSum;
  const effectivePct = (weight: number, isEnabled: boolean) => {
    if (!isEnabled || enabledSum <= 0) return null;
    return (weight / enabledSum) * 100;
  };

  // Live preview of what this category's score WOULD be if Apply were clicked.
  // Uses the user's typed sub-weights (auto-normalized inside recompute via subShare).
  const previewRecompute = useMemo(() => {
    if (!rawValuesByKey) return null;
    return recomputeCategoryScore(metrics, rawValuesByKey, cur, serverCategoryScore ?? null, customMetricsForRecompute);
  }, [metrics, rawValuesByKey, cur, serverCategoryScore, customMetricsForRecompute]);

  // True iff the user's typed (live) sub-weights, once normalized to 100%,
  // differ from what was last applied. Used to surface a "Pending edits" pill
  // and to remind the user that the city's score won't update until Apply.
  const pendingEdits = useMemo(() => {
    if (!categoryKey) return false;
    const applied = appliedSubWeights[categoryKey] ?? {};
    const norm: Record<string, number> = {};
    metrics.forEach((m) => {
      const v = m.enabled ? (cur[m.key] ?? 0) : 0;
      norm[m.key] = enabledSum > 0 ? (v / enabledSum) * 100 : 0;
    });
    return metrics.some((m) => Math.abs((norm[m.key] ?? 0) - (applied[m.key] ?? 0)) > 0.05);
  }, [categoryKey, cur, metrics, enabledSum, appliedSubWeights]);

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

    // Compute old vs new for the delta toast.
    const newCatScoreRaw = previewRecompute?.score ?? null;
    const oldCat = currentCategoryScore;
    const newCatRounded = newCatScoreRaw != null ? Math.round(newCatScoreRaw) : null;
    const oldComp = currentComposite;
    const newComp = newCatScoreRaw != null && computeNewComposite
      ? computeNewComposite(newCatScoreRaw)
      : oldComp;

    if (enabledSum <= 0) {
      toast.success(`${categoryLabel} reset — using server score as fallback`, { duration: 4000 });
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
        </SheetHeader>

        {view === "weights" ? (
          <TooltipProvider delayDuration={150}>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
              {metrics.map((m) => {
                const value = cur[m.key] ?? 0;
                const isDisabled = !m.enabled;
                const pill = STATUS_PILL[m.status];
                const eff = effectivePct(value, m.enabled);

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
                    const eff = effectivePct(w, true);
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
        ) : (
          <FormulaPanel
            categoryLabel={categoryLabel}
            selectedCityLabel={selectedCityLabel}
            previewRecompute={previewRecompute}
            serverCategoryScore={serverCategoryScore ?? null}
            masterWeightPct={masterWeightPct ?? null}
            masterWeightPendingPct={masterWeightPendingPct ?? null}
            enabledSum={enabledSum}
            pendingEdits={pendingEdits}
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


        <div className="border-t border-[#eef2f7] px-5 py-3 flex items-center justify-between gap-3 bg-[#fafbfd]">
          <p className="text-[10.5px] text-[#8794ab] leading-snug max-w-[260px]">
            Auto-normalized to 100% on save. Empty category falls back to server score.
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
  masterWeightPendingPct,
  enabledSum,
  pendingEdits,
}: {
  categoryLabel: string;
  selectedCityLabel?: string;
  previewRecompute: ReturnType<typeof recomputeCategoryScore> | null;
  serverCategoryScore: number | null;
  masterWeightPct: number | null;
  masterWeightPendingPct: number | null;
  enabledSum: number;
  pendingEdits: boolean;
}) {
  const compositeContribution =
    previewRecompute?.score != null && masterWeightPct != null
      ? (previewRecompute.score * masterWeightPct) / 100
      : null;
  const summary = previewRecompute
    ? summarizeCategory(
        previewRecompute,
        selectedCityLabel,
        categoryLabel,
        masterWeightPct ?? undefined,
        compositeContribution ?? undefined,
      )
    : null;
  const masterPending =
    masterWeightPendingPct != null &&
    masterWeightPct != null &&
    Math.abs(masterWeightPendingPct - masterWeightPct) > 0.05;

  const Th = ({ label, tip }: { label: string; tip: string }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <th className="text-right px-2 py-1.5 font-medium cursor-help underline decoration-dotted decoration-[#c5cdda] underline-offset-2">
          {label}
        </th>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-[12px] leading-snug">
        {tip}
      </TooltipContent>
    </Tooltip>
  );

  return (
    <TooltipProvider delayDuration={150}>
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-[12px] text-[#07142f] leading-relaxed">
      {pendingEdits && (
        <div className="rounded border border-[#fde68a] bg-[#fffbe6] px-3 py-2 text-[11.5px] text-[#854d0e] leading-snug">
          <span className="font-semibold">Pending edits — not yet applied.</span>{" "}
          The numbers below preview what scores would become if you click <em>Save &amp; Recalculate</em>.
        </div>
      )}
      <section>
        <h4 className="text-[11px] font-bold uppercase tracking-wide text-[#526078] mb-2">
          How {selectedCityLabel ? `${selectedCityLabel} got its` : "this"} {categoryLabel} score
        </h4>
        <p className="text-[10.5px] text-[#8794ab] italic mb-2 leading-snug">
          This explains the <strong>{categoryLabel}</strong> category only. For how all categories combine into the overall city score, see the composite breakdown on the city row.
        </p>

        <RecipeBlock
          categoryLabel={categoryLabel}
          cityLabel={selectedCityLabel}
          previewRecompute={previewRecompute}
          masterWeightPct={masterWeightPct}
          serverCategoryScore={serverCategoryScore}
        />
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
          <>
            <p className="text-[11px] text-[#526078] mb-1.5 italic">
              Raw → scaled to Norm (0–100) → weighted by your Share → contributes to category score. Hover any column header for details.
            </p>
            <div className="rounded border border-[#eef2f7] overflow-hidden">
              <table className="w-full text-[11px] font-mono">
                <thead className="bg-[#fafbfd] text-[#526078]">
                  <tr>
                    <th className="text-left px-2 py-1.5 font-medium">Metric</th>
                    <Th label="Raw" tip="Raw — the actual measured value for this city (e.g. number of children, median income)." />
                    <Th label="Norm" tip="Norm — the raw value rescaled to a 0–100 score using this metric's expected range, so different metrics can be compared." />
                    <Th label="Share" tip="Share — this metric's slice of the category, after auto-normalizing your typed weights so they sum to 100%." />
                    <Th label="Contrib" tip="Contrib — Norm × Share. Adding all Contrib values together gives this category's score." />
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
                  {masterPending && (
                    <tr>
                      <td colSpan={5} className="px-2 py-1.5 text-[11px] text-[#854d0e] bg-[#fffbe6] border-t border-[#fde68a] leading-snug">
                        ⚠ You've dragged this category's master slider to <strong>{masterWeightPendingPct!.toFixed(1)}%</strong> on the city screen but haven't clicked <strong>Apply Weights</strong> yet. The composite still uses {masterWeightPct!.toFixed(1)}%.
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
          </>
        )}
      </section>
    </div>
    </TooltipProvider>
  );
}

// ─────────────────────────── Plain-English recipe ───────────────────────────

function RecipeBlock({
  categoryLabel,
  cityLabel,
  previewRecompute,
  masterWeightPct,
  serverCategoryScore,
}: {
  categoryLabel: string;
  cityLabel?: string;
  previewRecompute: ReturnType<typeof recomputeCategoryScore> | null;
  masterWeightPct: number | null;
  serverCategoryScore: number | null;
}) {
  if (!previewRecompute) {
    return (
      <p className="text-[11.5px] text-[#8794ab] italic">
        Open this drawer from a selected city to see the step-by-step math with real numbers.
      </p>
    );
  }

  const contribs = previewRecompute.contributions;
  const used = contribs.filter((c) => c.used);
  const skipped = contribs.filter((c) => !c.used);
  const categoryScore = previewRecompute.score;
  const compositeContribution =
    categoryScore != null && masterWeightPct != null
      ? (categoryScore * masterWeightPct) / 100
      : null;

  // All-fallback case (no usable sub-weights)
  if (used.length === 0) {
    return (
      <div className="rounded border border-[#fde68a] bg-[#fffbe6] px-3 py-2.5 text-[12px] text-[#854d0e] leading-snug">
        <strong>All metrics unavailable</strong> — using the server's stored {categoryLabel} score of{" "}
        <strong>{serverCategoryScore != null ? Math.round(serverCategoryScore) : "—"}</strong> as a fallback.
        {masterWeightPct != null && categoryScore != null && (
          <div className="mt-1.5 text-[#7c2d12]">
            This category is <strong>{masterWeightPct.toFixed(0)}%</strong> of the overall city score, so it contributes{" "}
            <strong>{((categoryScore * masterWeightPct) / 100).toFixed(1)} points</strong>.
          </div>
        )}
      </div>
    );
  }

  // Step 1 + 2 + 3 recipe with real numbers
  return (
    <div className="space-y-3">
      {/* Step 1 */}
      <div className="rounded border border-[#e5eaf2] bg-white px-3 py-2.5">
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="text-[11px] font-bold text-[#174be8]">STEP 1</span>
          <span className="text-[12px] text-[#1a2540] font-medium">Score each metric on a 0–100 scale</span>
        </div>
        <table className="w-full text-[11.5px]">
          <tbody>
            {used.map((c) => (
              <tr key={c.key} className="border-t border-[#f3f6fb] first:border-0">
                <td className="py-1 text-[#3a4256]">{c.label}</td>
                <td className="py-1 text-right tabular-nums text-[#6b7894] pr-2">
                  {c.rawValue == null ? "—" : c.rawValue.toLocaleString()}
                </td>
                <td className="py-1 text-right tabular-nums text-[#174be8] font-semibold w-[60px]">
                  → {c.normalized == null ? "—" : c.normalized.toFixed(0)}
                </td>
              </tr>
            ))}
            {skipped.map((c) => (
              <tr key={c.key} className="border-t border-[#f3f6fb] text-[#b6bfd0]">
                <td className="py-1 italic">{c.label}</td>
                <td className="py-1 text-right tabular-nums pr-2">n/a</td>
                <td className="py-1 text-right text-[10.5px] italic w-[60px]">skipped</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Step 2 */}
      <div className="rounded border border-[#e5eaf2] bg-white px-3 py-2.5">
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="text-[11px] font-bold text-[#174be8]">STEP 2</span>
          <span className="text-[12px] text-[#1a2540] font-medium">Multiply each score by its weight (your sliders)</span>
        </div>
        <table className="w-full text-[11.5px] font-mono">
          <tbody>
            {used.map((c) => (
              <tr key={c.key} className="border-t border-[#f3f6fb] first:border-0">
                <td className="py-1 text-[#3a4256] truncate max-w-[200px] font-sans" title={c.label}>{c.label}</td>
                <td className="py-1 text-right tabular-nums text-[#6b7894] w-[140px]">
                  {c.normalized == null ? "—" : c.normalized.toFixed(0)} × {(c.subShare * 100).toFixed(0)}%
                </td>
                <td className="py-1 text-right tabular-nums text-[#1a2540] font-semibold w-[60px]">
                  = {c.contribution.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#cfdcff]">
              <td colSpan={2} className="py-1.5 text-right text-[12px] font-sans font-semibold text-[#1a2540]">
                {categoryLabel} category score =
              </td>
              <td className="py-1.5 text-right tabular-nums text-[14px] font-bold text-[#174be8]">
                {categoryScore == null ? "—" : categoryScore.toFixed(1)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Step 3 */}
      {masterWeightPct != null && categoryScore != null && compositeContribution != null && (
        <div className="rounded border border-[#cfdcff] bg-[#eef4ff] px-3 py-2.5">
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-[11px] font-bold text-[#174be8]">STEP 3</span>
            <span className="text-[12px] text-[#1a2540] font-medium">
              {categoryLabel} is {masterWeightPct.toFixed(0)}% of the overall city score
            </span>
          </div>
          <div className="text-[12.5px] font-mono text-[#1a2540] text-center py-1">
            {categoryScore.toFixed(1)} × {masterWeightPct.toFixed(0)}% ={" "}
            <span className="font-bold text-[14px] text-[#174be8]">
              {compositeContribution.toFixed(1)} points
            </span>
          </div>
          <p className="text-[10.5px] text-[#526078] text-center mt-1 leading-snug">
            …toward {cityLabel ?? "this city"}'s composite score. The other{" "}
            {(100 - masterWeightPct).toFixed(0)}% comes from the other categories (see their drawers).
          </p>
        </div>
      )}
    </div>
  );
}

