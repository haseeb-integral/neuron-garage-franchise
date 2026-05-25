Plan: Clarify preset behavior (weight recipes, not sort overrides) across the City Search UI

### Problem
Users select a preset like "Demand-Heavy" and expect the table to sort by Demand score descending. In reality, presets are **weight recipes** that feed the composite score — Demand-Heavy means Demand counts 60% in the composite, and the table is still sorted by that composite. This causes confusion.

### Solution
Keep the exact same ranking/composite behavior. Only change text/copy in 3 places to make the "weight recipe → composite rank" flow unmistakable.

### Changes

1. **Preset descriptions (`src/lib/scoringPresets.ts`)**
   Rewrite `PRESET_DESCRIPTIONS` so every description ends with an explicit "…counts X% toward the composite rank" clause instead of open-ended goal language.
   - "Balanced": "All three signals share roughly equal weight in the composite rank."
   - "Demand-Heavy": "Demand counts 60% in the composite — still ranked by overall score, not demand alone."
   - "TAM-Heavy": "TAM counts 50% in the composite — still ranked by overall score, not teachers alone."
   - "Blue Ocean": "Competition counts 60% in the composite — still ranked by overall score, not saturation alone."
   - "Quick Launch": "TAM 45% + Competition 40% in the composite — still ranked by overall score."
   - "High Upside": "Demand 45% + Competition 40% in the composite — still ranked by overall score."

2. **Preset tile explainer (`src/components/city-scoring/CityWeightsPanel.tsx`, line ~155)**
   Rewrite the paragraph inside the blue "6 Presets" callout. Replace the generic "recipe…re-rank cities" copy with a sentence that explicitly states the table stays sorted by the **composite score** and the preset only changes how much each category contributes to that composite.

3. **Yellow sub-metric override banner (`src/components/city-scoring/RankedMarketsList.tsx`, lines 123–124)**
   Rewrite from:
   > "Re-ranked with your weights — this page recomputed from your sub-metric edits."
   To something like:
   > "Composite re-ranked with your weights — cities ordered by the new overall score, not by any single metric."

### Out of scope
- No code/algorithm changes. Ranking, tiers, composite math stay exactly the same.
- No UI layout changes beyond the text strings above.

### Files touched
- `src/lib/scoringPresets.ts` (PRESET_DESCRIPTIONS copy)
- `src/components/city-scoring/CityWeightsPanel.tsx` (preset explainer paragraph)
- `src/components/city-scoring/RankedMarketsList.tsx` (yellow banner text)