// Scoring model presets — drive the master category weights.
// "Custom" is auto-selected when the active master weights don't match any preset.
// 3-key shape after Sam+Brett 2026-05-21 final purge.
// May 22, 2026: expanded from 3 → 6 named presets (Blue Ocean, Quick Launch, High Upside added)
// to support 2×3 preset-tile grid UI on City Search.

import type { CategoryKey } from "@/stores/cityScoringStore";

export type PresetName =
  | "Balanced"
  | "Demand-Heavy"
  | "TAM-Heavy"
  | "Blue Ocean"
  | "Quick Launch"
  | "High Upside"
  | "Custom";

export const SCORING_PRESETS: Record<Exclude<PresetName, "Custom">, Record<CategoryKey, number>> = {
  "Balanced": {
    demand: 34,
    franchiseeSupply: 33,
    competitiveLandscape: 33,
  },
  "Demand-Heavy": {
    demand: 60,
    franchiseeSupply: 20,
    competitiveLandscape: 20,
  },
  "TAM-Heavy": {
    demand: 25,
    franchiseeSupply: 50,
    competitiveLandscape: 25,
  },
  "Blue Ocean": {
    demand: 20,
    franchiseeSupply: 20,
    competitiveLandscape: 60,
  },
  "Quick Launch": {
    demand: 15,
    franchiseeSupply: 45,
    competitiveLandscape: 40,
  },
  "High Upside": {
    demand: 45,
    franchiseeSupply: 15,
    competitiveLandscape: 40,
  },
};

export const PRESET_DESCRIPTIONS: Record<PresetName, string> = {
  "Balanced": "All three signals share roughly equal weight in the composite rank.",
  "Demand-Heavy": "Demand counts 60% in the composite — cities are still ranked by overall score, not by Demand alone.",
  "TAM-Heavy": "TAM Teachers counts 50% in the composite — cities are still ranked by overall score, not by TAM alone.",
  "Blue Ocean": "Competitive Opportunity counts 60% in the composite — cities are still ranked by overall score, not by saturation alone.",
  "Quick Launch": "TAM 45% + Competitive Opportunity 40% in the composite — cities are still ranked by overall score.",
  "High Upside": "Demand 45% + Competitive Opportunity 40% in the composite — cities are still ranked by overall score.",
  "Custom": "Manually adjusted master weights — no preset matches. Cities are still ranked by the composite overall score.",
};

// Short 1–2 word tags shown under each tile name in the grid UI.
export const PRESET_TAGLINES: Record<Exclude<PresetName, "Custom">, string> = {
  "Balanced": "Equal weight",
  "Demand-Heavy": "Most kids",
  "TAM-Heavy": "Most teachers",
  "Blue Ocean": "Low saturation",
  "Quick Launch": "Easy to open",
  "High Upside": "Best runway",
};

export const PRESET_NAMES: PresetName[] = [
  "Balanced",
  "Demand-Heavy",
  "TAM-Heavy",
  "Blue Ocean",
  "Quick Launch",
  "High Upside",
  "Custom",
];

// Ordered list of the 6 tiles rendered in the 2×3 preset grid (excludes "Custom",
// which is auto-applied as a chip when weights don't match any tile).
export const PRESET_TILE_ORDER: Exclude<PresetName, "Custom">[] = [
  "Balanced",
  "Demand-Heavy",
  "TAM-Heavy",
  "Blue Ocean",
  "Quick Launch",
  "High Upside",
];

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
