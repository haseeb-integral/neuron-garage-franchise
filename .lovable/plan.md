# Auto-Normalize Sub-Weights + Wire Into Composite + Show Formula — SHIPPED

Per May 8 transcript: sub-weights affect the composite. Per CLAUDE.md Rule 1: every calculated number must reveal its math. Both delivered.

## Files changed

- `src/lib/sowNormalize.ts` (new) — pure-function port of `normalizeSowMetric` + `parseSignalValue` text-to-number helper.
- `src/lib/clientSubWeightScoring.ts` (new) — `recomputeCategoryScore` + `recomputeComposite` with full per-metric contribution breakdown (Raw → Normalized → Share → Contribution).
- `src/stores/cityScoringStore.ts` — `setSubWeight` upper bound removed (sub-weights are relative importance, not capped percentages).
- `src/components/city-scoring/SubMetricWeightsDrawer.tsx` — total-badge replaced with per-row `→ effective%`, "Reset Category" now equal-splits across enabled metrics, Apply auto-normalizes to 100% before persisting, and a header `Show Formula ⇄ Edit Weights` toggle swaps the body to a 4-section formula panel.
- `src/pages/CityScoring.tsx` — `detailCategoryScores` now runs each category through `recomputeCategoryScore` against the user's `appliedSubWeights` and the live signal values; falls back to server-stored category score when sub-weights collapse to zero or no signals are present. Drawer receives `selectedCityLabel`, `rawValuesByKey`, `serverCategoryScore`, and `masterWeightPct` so Show Formula renders live numbers for the selected city.
- `CLAUDE.md` — Rule 5 rewritten to document the new normalization + scoring formula.

## Show Formula contents

Inside the drawer, "Show Formula" reveals four sections:

1. **Within-category normalization** — `sub_share_i = sub_i / Σ(enabled)` with the live denominator filled in.
2. **Category score** — `categoryScore = Σ (sub_share × normalized)` plus the server-fallback rule.
3. **Composite** — `composite = Σ (master_share × categoryScore)`.
4. **Live values for {City}** — table with one row per metric: Raw, Normalized, Share, Contribution. Footer shows the resulting category score, the master-weight multiplier, the composite contribution, and the server-stored category score for comparison.

## Edge-case handling

- All sub-weights zero in a category → that category falls back to its server-stored score (table footer is annotated "(server fallback)").
- Disabled / Unavailable metrics → locked at 0, excluded from sum, show "—".
- Signal value missing → that metric's contribution row shows "—" and is dropped from numerator + denominator.
- Stepper "+" no longer caps at 100 (relative-importance model).

## Risk / undo

Risk: medium. Composite math drives the selected-city ranking, but server values stay as fallback so reverts are safe. Undo: revert the 6 files; server data untouched.

## Out of scope (intentional)

- Per-row recompute in the city table — the table runs against mock `scoreBreakdown`, not per-metric signals; would need a per-row signal fetch first. Server `composite_score` continues to drive table ordering.
- Edge-function changes / DB columns — none.
- Master category slider behavior — unchanged.
