// Scoring model presets — drive the master category weights.
// "Custom" is auto-selected when the active master weights don't match any preset.
//
// Tier 1 rework (Sam+Brett 2026-07-07) Phase 3b: CSI-derived Competitive
// Opportunity was removed from the composite. Presets now only distribute
// weight across Demand + Operator & Venue Supply (sum to 100). The three CSI-heavy
// tiles (Blue Ocean, Quick Launch, High Upside) were dropped because they
// only made sense when CSI counted.

import type { CategoryKey } from "@/stores/cityScoringStore";

export type PresetName =
  | "Balanced"
  | "Demand-Heavy"
  | "Operator-Heavy"
  | "Custom";

export const SCORING_PRESETS: Record<Exclude<PresetName, "Custom">, Record<CategoryKey, number>> = {
  "Balanced": {
    demand: 50,
    franchiseeSupply: 50,
    competitiveLandscape: 0,
  },
  "Demand-Heavy": {
    demand: 70,
    franchiseeSupply: 30,
    competitiveLandscape: 0,
  },
  "Operator-Heavy": {
    demand: 30,
    franchiseeSupply: 70,
    competitiveLandscape: 0,
  },
};

export const PRESET_DESCRIPTIONS: Record<PresetName, string> = {
  "Balanced": "Demand and Operator & Venue Supply count equally in the composite rank.",
  "Demand-Heavy": "Demand counts 70% in the composite — cities with more target families rise to the top.",
  "Operator-Heavy": "Operator & Venue Supply counts 70% in the composite — cities with a large teacher pool rise to the top.",
  "Custom": "Manually adjusted master weights — no preset matches. Cities are still ranked by the composite overall score.",
};

// Short 1–2 word tags shown under each tile name in the grid UI.
export const PRESET_TAGLINES: Record<Exclude<PresetName, "Custom">, string> = {
  "Balanced": "Equal weight",
  "Demand-Heavy": "Most kids",
  "Operator-Heavy": "Most teachers",
};

export const PRESET_NAMES: PresetName[] = [
  "Balanced",
  "Demand-Heavy",
  "Operator-Heavy",
  "Custom",
];

// Ordered list of the tiles rendered in the preset grid (excludes "Custom",
// which is auto-applied as a chip when weights don't match any tile).
export const PRESET_TILE_ORDER: Exclude<PresetName, "Custom">[] = [
  "Balanced",
  "Demand-Heavy",
  "Operator-Heavy",
];

// Returns the preset that exactly matches the given master weights (within ±1% tolerance per category),
// or "Custom" if none match. Ignores competitiveLandscape since it no longer counts in the composite.
export function detectPreset(weights: Record<CategoryKey, number>): PresetName {
  const compositeKeys: CategoryKey[] = ["demand", "franchiseeSupply"];
  for (const [name, preset] of Object.entries(SCORING_PRESETS) as [Exclude<PresetName, "Custom">, Record<CategoryKey, number>][]) {
    const isMatch = compositeKeys.every(
      (k) => Math.abs((weights[k] ?? 0) - preset[k]) <= 1,
    );
    if (isMatch) return name;
  }
  return "Custom";
}
