// CityWeightsPanel — Scoring Weights card extracted from CityScoring.tsx.
// Renders the budget pie, header copy, action buttons, preset tile grid, and
// the three master-weight sliders. State and handlers live in the parent.
import { Bookmark, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { PreviewBadge } from "@/components/city-scoring/PreviewBadge";
import {
  SCORING_PRESETS, PRESET_DESCRIPTIONS, PRESET_TAGLINES, PRESET_TILE_ORDER,
  detectPreset, type PresetName,
} from "@/lib/scoringPresets";
import { COMPOSITE_CATEGORIES, rebalanceWeights } from "@/lib/cityScoringPageHelpers";

// Tier 1 rework (2026-07-07) Phase 3b: this panel now renders ONLY the
// categories that actually count toward the composite (Demand + TAM). The
// CSI slider was removed — it had no effect after Phase 2.
const VISIBLE_CATEGORIES = COMPOSITE_CATEGORIES;
import type { TierCounts } from "@/components/city-scoring/TierCountsBar";
import type { CategoryKey } from "@/stores/cityScoringStore";

type Weights = Record<CategoryKey, number>;

interface Props {
  weights: Weights;
  setWeights: (updater: (w: Weights) => Weights) => void;
  totalWeight: number;
  weightsPending: boolean;
  previewTierCounts: TierCounts;
  committedTierCounts: TierCounts;
  resetWeights: () => void;
  openSaveDialog: () => void;
  applyWeights: () => void;
  scoringModel: string;
  setScoringModel: (m: string) => void;
  applyPresetByName: (name: PresetName) => void;
  presetTweening: boolean;
  customCriteria: { category: string }[];
  supabaseCustomCriteria: { category: string }[];
  setOpenSubMetricsFor: (k: CategoryKey) => void;
}

export function CityWeightsPanel({
  weights, setWeights, totalWeight, weightsPending, previewTierCounts, committedTierCounts,
  resetWeights, openSaveDialog, applyWeights, scoringModel, setScoringModel,
  applyPresetByName, presetTweening, customCriteria, supabaseCustomCriteria,
  setOpenSubMetricsFor,
}: Props) {
  const segs = VISIBLE_CATEGORIES.map((c) => ({ key: c.key, color: c.color, value: weights[c.key] || 0 }));
  const total = segs.reduce((s, x) => s + x.value, 0) || 1;
  const cx = 28, cy = 28, r = 24;
  let startAngle = -Math.PI / 2;
  const slices = segs.map((s) => {
    const frac = s.value / total;
    const endAngle = startAngle + frac * Math.PI * 2;
    const large = frac > 0.5 ? 1 : 0;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const d = frac >= 0.999
      ? `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`
      : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    const el = (
      <path key={s.key} d={d} fill={s.color} stroke="#ffffff" strokeWidth={2}
        strokeLinejoin="round" style={{ transition: "d 200ms ease" }} />
    );
    startAngle = endAngle;
    return el;
  });

  return (
    <div className="mb-4 rounded-lg bg-white border border-[#eef2f7] p-4">
      <div className="mb-3 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="relative shrink-0" style={{ width: 56, height: 56 }} aria-hidden>
            <svg width="56" height="56" viewBox="0 0 56 56">
              <circle cx={cx} cy={cy} r={r} fill="#eef2f7" />
              {slices}
            </svg>
            <div
              className="absolute inset-0 flex items-center justify-center text-[8.5px] font-bold text-white tabular-nums pointer-events-none"
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}
            >
              {totalWeight}%
            </div>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#07142f]">How should we rank cities?</h3>
            <p className="text-[11px] text-[#07142f] leading-snug mt-1 max-w-[640px]">
              Every city gets one overall score (0–100) built from two things: <strong style={{ color: VISIBLE_CATEGORIES[0].color }}>Demand</strong> (are families looking for tutoring?) and <strong style={{ color: VISIBLE_CATEGORIES[1].color }}>Operator & Venue Supply</strong> (can you hire enough tutors?). The sliders below decide how much each one counts — they always add up to 100%.
            </p>
            <p className="text-[10px] text-[#8794ab] leading-snug mt-1">
              Each of the three categories is built from several signals (population, income, competitor density, etc). Pick a preset to start, or fine-tune any category with <span className="font-medium">Configure metrics</span>.
            </p>
            {totalWeight !== 100 && (
              <p className="text-[11px] text-[#ea580c] mt-1">Weights must total 100% to apply scoring.</p>
            )}
          </div>

        </div>
        <div className="flex md:shrink-0 flex-col md:items-end gap-2 w-full md:w-auto">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 w-full md:w-auto md:justify-end">
            <span className="text-xs text-[#526078]">
              Total Weight: <span className={totalWeight === 100 ? "text-[#0ea66e] font-medium" : "text-[#ea580c] font-medium"}>{totalWeight}%</span>
            </span>
            <button onClick={resetWeights} className="text-xs font-medium text-[#174be8] hover:underline">Reset to Default</button>
            <div className="ml-auto md:ml-0">
              <PreviewBadge pending={weightsPending && totalWeight === 100} preview={previewTierCounts} committed={committedTierCounts} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 w-full md:flex md:w-auto md:items-center md:gap-3">
            <Button
              size="sm"
              variant="outline"
              disabled={totalWeight !== 100}
              onClick={openSaveDialog}
              className="h-8 md:h-7 border-[#dbe4f2] text-[#174be8] text-[11px] px-3 gap-1 disabled:opacity-50 w-full md:w-auto"
            >
              <Bookmark size={12} /> Save Search
            </Button>
            <Button
              size="sm"
              disabled={totalWeight !== 100}
              onClick={applyWeights}
              title={weightsPending ? "Click to commit slider changes to the table" : "No pending changes"}
              className={cn(
                "h-8 md:h-7 bg-[#174be8] hover:bg-[#1240c9] text-white text-[11px] px-3 disabled:opacity-50 transition-all w-full md:w-auto",
                weightsPending && totalWeight === 100 && "ring-2 ring-[#174be8]/40 ring-offset-1 shadow-md",
              )}
            >
              Apply Weights
            </Button>
          </div>
          {weightsPending && totalWeight === 100 && (
            <p className="text-[11px] text-[#526078] leading-snug md:text-right max-w-[360px]">
              <span className="font-semibold text-[#07142f]">Showing previous results.</span> Click <span className="font-semibold text-[#174be8]">Apply Weights</span> to recompute the table, map, and scores.
            </p>
          )}
        </div>
      </div>

      <div className="mb-3">
        <div className="mb-2.5 rounded-md bg-[#f5f8ff] border border-[#dbe4f2] px-3 py-2.5">

          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="inline-flex h-5 items-center rounded-md bg-[#174be8] px-1.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Step 1
            </span>
            <span className="text-[12.5px] font-bold text-[#07142f]">
              Pick a starting strategy ↓
            </span>
            {scoringModel === "Custom" ? (
              <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#f1ebff] text-[#7c3aed]">
                Custom — you adjusted a slider
              </span>
            ) : (
              <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#eaf0ff] text-[#174be8]">
                Active: {scoringModel}
              </span>
            )}
          </div>
          <p className="text-[11.5px] text-[#526078] leading-snug">
            Each preset is a recipe that sets the three sliders for you. For example, <span className="font-semibold text-[#07142f]">Demand-Heavy</span> makes Demand worth 60% of every city's overall score — so cities with lots of families looking for tutoring rise to the top, while Operator & Venue Supply and Competition act as tie-breakers. Clicking a preset <span className="font-semibold">previews</span> the new ranking; click <span className="font-semibold">Apply Weights</span> to commit it. Drag any slider yourself and the strategy switches to <span className="font-semibold text-[#7c3aed]">Custom</span>.
          </p>
        </div>


        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PRESET_TILE_ORDER.map((name) => {
            const w = SCORING_PRESETS[name];
            const isActive = scoringModel === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => applyPresetByName(name)}
                aria-pressed={isActive}
                className={cn(
                  "group relative text-left rounded-lg border p-2.5 transition-all bg-white hover:border-[#174be8]/60 hover:shadow-sm",
                  isActive
                    ? "border-[#174be8] ring-2 ring-[#174be8]/30 bg-[#f5f8ff] shadow-sm"
                    : "border-[#eef2f7]",
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[12.5px] font-bold text-[#07142f] leading-tight">{name}</span>
                  <span className="text-[9.5px] uppercase tracking-wide text-[#8794ab] font-semibold">{PRESET_TAGLINES[name]}</span>
                </div>
                <p className="text-[10.5px] text-[#526078] leading-snug mt-0.5">
                  {PRESET_DESCRIPTIONS[name]}
                </p>
                <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-[#eef2f7]">
                  {VISIBLE_CATEGORIES.map((cat) => (
                    <div
                      key={cat.key}
                      style={{ width: `${w[cat.key]}%`, backgroundColor: cat.color }}
                      title={`${cat.label}: ${w[cat.key]}%`}
                    />
                  ))}
                </div>
                <div className="mt-1 flex items-center justify-between text-[9.5px] tabular-nums text-[#8794ab] font-semibold">
                  <span style={{ color: VISIBLE_CATEGORIES[0].color }}>{w.demand}</span>
                  <span style={{ color: VISIBLE_CATEGORIES[1].color }}>{w.franchiseeSupply}</span>
                </div>
                {isActive && (
                  <span
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute left-1/2 -translate-x-1/2 -bottom-[7px] h-3 w-3 rotate-45 border-r border-b border-[#174be8] bg-[#f5f8ff]",
                      presetTweening && "animate-pulse",
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
        <div className="h-4 mt-1 flex items-center justify-center">
          {presetTweening && (
            <span className="text-[10px] font-semibold text-[#174be8] tracking-wide animate-pulse">
              ↓ syncing sliders ↓
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {VISIBLE_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const customCount =
            customCriteria.filter((c) => c.category === cat.label).length +
            supabaseCustomCriteria.filter((c) => c.category === cat.label).length;
          return (
            <div
              key={cat.key}
              className={cn(
                "rounded-lg border bg-white p-3 flex flex-col gap-2 transition-all",
                presetTweening
                  ? "border-[#174be8] ring-2 ring-[#174be8]/30 shadow-sm"
                  : "border-[#eef2f7] hover:border-[#174be8]/40",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <span className="flex items-center justify-center rounded-lg flex-shrink-0 mt-0.5" style={{ width: 28, height: 28, backgroundColor: cat.bg }}>
                    <Icon size={15} style={{ color: cat.color }} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-semibold text-[#07142f] leading-tight">{cat.label}</div>
                    <p className="text-[11px] text-[#526078] leading-snug mt-1">{cat.description}</p>
                  </div>
                </div>
              </div>
              <div className="mt-1 pt-2 border-t border-[#f3f5f9]">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] uppercase tracking-wide text-[#8794ab] font-semibold">Weight in ranking</span>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={weights[cat.key]}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === "") return;
                        const parsed = Number(raw);
                        if (!Number.isFinite(parsed)) return;
                        const clamped = Math.max(0, Math.min(100, Math.round(parsed)));
                        setWeights((w) => {
                          const subset = VISIBLE_CATEGORIES.reduce((acc, c) => {
                            acc[c.key] = w[c.key] || 0;
                            return acc;
                          }, {} as Record<CategoryKey, number>);
                          const rebalanced = rebalanceWeights(subset, cat.key, clamped);
                          const next = { ...w, ...rebalanced, competitiveLandscape: 0 };
                          const detected = detectPreset(next);
                          if (detected !== scoringModel) setScoringModel(detected);
                          return next;
                        });
                      }}
                      onBlur={(e) => {
                        const parsed = Number(e.target.value);
                        if (!Number.isFinite(parsed)) {
                          e.target.value = String(weights[cat.key]);
                        }
                      }}
                      className="h-7 w-14 text-right text-[13px] font-bold text-[#07142f] tabular-nums px-1.5"
                      aria-label={`${cat.label} weight percent`}
                    />
                    <span className="text-base font-bold text-[#07142f]">%</span>
                  </div>
                </div>
                <Slider
                  value={[weights[cat.key]]}
                  onValueChange={([v]) => {
                    setWeights((w) => {
                      const subset = VISIBLE_CATEGORIES.reduce((acc, c) => {
                        acc[c.key] = w[c.key] || 0;
                        return acc;
                      }, {} as Record<CategoryKey, number>);
                      const rebalanced = rebalanceWeights(subset, cat.key, v);
                      const next = { ...w, ...rebalanced, competitiveLandscape: 0 };
                      const detected = detectPreset(next);
                      if (detected !== scoringModel) setScoringModel(detected);
                      return next;
                    });
                  }}
                  max={100}
                  step={1}
                  className="[&>span:first-child]:bg-[#eaf0ff] [&>span:first-child]:h-1.5 [&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5 [&_[role=slider]]:border-[#174be8] [&_[role=slider]]:bg-white [&>span:first-child_span]:bg-[#174be8]"
                />
              </div>
              {customCount > 0 && (
                <button
                  type="button"
                  onClick={() => setOpenSubMetricsFor(cat.key)}
                  className="text-[10px] text-[#174be8] font-medium hover:underline self-start"
                >
                  +{customCount} custom metric{customCount > 1 ? "s" : ""}
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpenSubMetricsFor(cat.key)}
                className="mt-auto pt-1 inline-flex items-center gap-1 text-[10.5px] font-medium text-[#174be8] hover:underline self-start"
              >
                <Settings2 size={11} />
                Configure metrics
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
