// Scoring model presets — drive the master category weights.
// "Custom" is auto-selected when the active master weights don't match any preset.
// 3-key shape after Sam+Brett 2026-05-21 final purge.

import type { CategoryKey } from "@/stores/cityScoringStore";

export type PresetName = "Balanced" | "Demand-Heavy" | "TAM-Heavy" | "Custom";

export const SCORING_PRESETS: Record<Exclude<PresetName, "Custom">, Record<CategoryKey, number>> = {
  // Even-ish split across the 3 active categories.
  "Balanced": {
    demand: 34,
    franchiseeSupply: 33,
    competitiveLandscape: 33,
  },
  // Demand dominant.
  "Demand-Heavy": {
    demand: 60,
    franchiseeSupply: 20,
    competitiveLandscape: 20,
  },
  // TAM Teachers (franchiseeSupply) dominant.
  "TAM-Heavy": {
    demand: 25,
    franchiseeSupply: 50,
    competitiveLandscape: 25,
  },
};

export const PRESET_DESCRIPTIONS: Record<PresetName, string> = {
  "Balanced": "Roughly equal weighting across Demand, TAM Teachers, and Competitive Landscape.",
  "Demand-Heavy": "Demand is the dominant factor (60%). TAM Teachers and Competitive Landscape share the rest.",
  "TAM-Heavy": "TAM Teachers is the dominant factor (50%). Demand and Competitive Landscape share the rest.",
  "Custom": "Manually adjusted master weights — no preset matches.",
};

export const PRESET_NAMES: PresetName[] = ["Balanced", "Demand-Heavy", "TAM-Heavy", "Custom"];

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
