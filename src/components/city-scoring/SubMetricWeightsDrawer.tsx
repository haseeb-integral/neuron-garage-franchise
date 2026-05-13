import { Info, RotateCcw } from "lucide-react";
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryKey: CategoryKey | null;
  categoryLabel: string;
  categoryColor: string;
  categoryBg: string;
}

const STATUS_PILL: Record<SowMetricEntry["status"], { label: string; cls: string }> = {
  live:    { label: "Live",        cls: "bg-green-500/15 text-green-700" },
  proxy:   { label: "Proxy",       cls: "bg-blue-500/15 text-blue-700" },
  missing: { label: "No data yet", cls: "bg-gray-200 text-gray-600" },
  blocked: { label: "No data yet", cls: "bg-gray-200 text-gray-600" },
};

export function SubMetricWeightsDrawer({
  open, onOpenChange, categoryKey, categoryLabel, categoryColor, categoryBg,
}: Props) {
  const subWeights = useCityScoringStore((s) => s.subWeights);
  const setSubWeight = useCityScoringStore((s) => s.setSubWeight);
  const setAppliedSubWeights = useCityScoringStore((s) => s.setAppliedSubWeights);

  if (!categoryKey) return null;
  const metrics = METRICS_BY_CATEGORY[categoryKey] ?? [];
  const cur = subWeights[categoryKey] ?? {};
  const total = metrics.reduce((s, m) => s + (cur[m.key] ?? 0), 0);
  const totalOk = total === 100;

  const handleApply = () => {
    setAppliedSubWeights(subWeights);
    toast.success(`${categoryLabel} sub-weights applied`);
    onOpenChange(false);
  };

  const handleResetCategory = () => {
    const defaults = DEFAULT_SUB_WEIGHTS[categoryKey];
    Object.entries(defaults).forEach(([k, v]) => setSubWeight(categoryKey, k, v));
    toast.success(`${categoryLabel} weights reset to defaults`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[520px] p-0 flex flex-col bg-white">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-[#eef2f7] space-y-2">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: categoryColor }}
            />
            <SheetTitle className="text-[15px] text-[#07142f]">
              {categoryLabel} — Sub-Metric Weights
            </SheetTitle>
          </div>
          <SheetDescription className="text-[12px] leading-snug text-[#526078]">
            {CATEGORY_PURPOSE[categoryKey]}
          </SheetDescription>
          <p
            className="text-[11px] leading-snug rounded px-2.5 py-1.5"
            style={{ backgroundColor: categoryBg, color: "#3a4256" }}
          >
            Set the importance weight (0–100) for each signal. Total should equal 100.
            Hover the <Info size={11} className="inline -mt-0.5" /> icon to learn what each metric means.
          </p>
        </SheetHeader>

        <TooltipProvider delayDuration={150}>
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
            {metrics.map((m) => {
              const value = cur[m.key] ?? 0;
              const isDisabled = !m.enabled;
              const pill = STATUS_PILL[m.status];

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

                  <input
                    type="number"
                    min={0}
                    max={100}
                    disabled={isDisabled}
                    value={value}
                    onChange={(e) => setSubWeight(categoryKey, m.key, Number(e.target.value))}
                    className={`w-14 h-7 text-[12px] text-right rounded border px-1.5 focus:outline-none focus:ring-1 focus:ring-[#174be8]/30 ${
                      isDisabled
                        ? "border-[#eef2f7] bg-gray-50 text-[#9aa3b5] cursor-not-allowed"
                        : "border-[#e5eaf2] bg-white text-[#07142f]"
                    }`}
                  />

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

        <div className="border-t border-[#eef2f7] px-5 py-3 flex items-center justify-between gap-3 bg-[#fafbfd]">
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[#526078]">Total:</span>
            <span className={`text-[14px] font-bold ${totalOk ? "text-green-600" : "text-orange-600"}`}>
              {total} / 100
            </span>
          </div>
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
