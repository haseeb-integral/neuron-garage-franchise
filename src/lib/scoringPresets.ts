// Scoring model presets — drive the master category weights.
// "Custom" is auto-selected when the active master weights don't match any preset.

import type { CategoryKey } from "@/stores/cityScoringStore";

export type PresetName = "Balanced" | "Demand-Heavy" | "Pricing-Heavy" | "Custom";

export const SCORING_PRESETS: Record<Exclude<PresetName, "Custom">, Record<CategoryKey, number>> = {
  // Even-ish split summing to 100 (17+17+17+17+16+16)
  "Balanced": {
    demand: 17,
    pricingPower: 17,
    competitiveLandscape: 17,
    franchiseeSupply: 17,
    easeOfOperations: 16,
    parentMindset: 16,
  },
  // Demand at 40, others split 60 / 5 = 12
  "Demand-Heavy": {
    demand: 40,
    pricingPower: 12,
    competitiveLandscape: 12,
    franchiseeSupply: 12,
    easeOfOperations: 12,
    parentMindset: 12,
  },
  // Pricing Power at 40, others split 60 / 5 = 12
  "Pricing-Heavy": {
    demand: 12,
    pricingPower: 40,
    competitiveLandscape: 12,
    franchiseeSupply: 12,
    easeOfOperations: 12,
    parentMindset: 12,
  },
};

export const PRESET_DESCRIPTIONS: Record<PresetName, string> = {
  "Balanced": "Equal weighting across all six scoring categories.",
  "Demand-Heavy": "Demand is the dominant factor (40%). Other categories share the remaining 60% equally.",
  "Pricing-Heavy": "Pricing Power is the dominant factor (40%). Other categories share the remaining 60% equally.",
  "Custom": "Manually adjusted master weights — no preset matches.",
};

export const PRESET_NAMES: PresetName[] = ["Balanced", "Demand-Heavy", "Pricing-Heavy", "Custom"];

// Returns the preset that exactly matches the given master weights (within ±1% tolerance per category),
// or "Custom" if none match.
export function detectPreset(weights: Record<CategoryKey, number>): PresetName {
  for (const [name, preset] of Object.entries(SCORING_PRESETS) as [Exclude<PresetName, "Custom">, Record<CategoryKey, number>][]) {
    const isMatch = (Object.keys(preset) as CategoryKey[]).every(
      (k) => Math.abs((weights[k] ?? 0) - preset[k]) <= 1,
    );
    if (isMatch) return name;
  }
  return "Custom";
}
