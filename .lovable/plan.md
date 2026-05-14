# Close the gap between sub-weight edits and what the user sees

Sam types `55` for Children, hits Apply, and the drawer + main screen don't visibly tell her what changed. This plan fixes the four gaps you found.

## What changes (user-facing)

### 1. Show Formula previews pending edits, not just applied
Today the formula panel reads from `appliedSubWeights` (last Apply). It will read from the live `subWeights` (what's typed right now), so the Raw/Norm/Share/Contrib table updates as Sam types. The category score in the footer updates live too. Apply still controls what actually scores the city — preview is just visual.

A small "Pending edits — not yet applied" pill appears at the top of the table whenever live values differ from applied. After Apply, the pill disappears.

### 2. Plain-English summary above the math
Above the Raw/Norm/Share/Contrib table, 2–3 dynamically generated sentences:

> **Frisco scores 71.9 on Demand.** Median Household Income is your heaviest metric at 28.4% weight, contributing 20.0 points. 4 metrics are unavailable and excluded from scoring.

Generated from the same live values that drive the table. The math table stays exactly as-is below it.

### 3. Sub-weight changes re-rank the visible city table page
On Apply, we recompute composite for the ~25 cities currently visible (current page only, not all 500+). Re-ranking happens on that slice. Cities off-page keep their server composite until they scroll into view.

Implementation: batch-fetch `city_market_signals` for the visible city IDs, run each through `recomputeCategoryScore` + `recomputeComposite` using `appliedSubWeights` and `appliedWeights`, and override the displayed `composite_score` for those rows. Cached per-page so re-renders are cheap.

A subtle "Re-ranked with your weights" indicator appears in the table header once an override is active, with a "Reset to default scoring" link.

### 4. Button rename: "Apply Weights" → "Save & Recalculate"
Inside the sub-metric drawer only. The main city screen's "Apply Weights" (master sliders) keeps its name. The two buttons no longer collide visually or in meaning.

## Technical detail

**Files to edit**
- `SubMetricWeightsDrawer.tsx` — switch `previewRecompute` source from `appliedSubByKey` to live `subByKey`; add `<PendingPill>` when they differ; add summary block above the table; rename button.
- `CityScoring.tsx` — add `useVisiblePageRescoring(visibleCityIds, appliedSubWeights, appliedWeights)` hook that:
  1. Reads `city_market_signals` for those city IDs (single Supabase query, `.in('city_id', ids)`).
  2. Pivots rows to `Record<cityId, Record<signalKey, number>>` via `parseSignalValue`.
  3. Runs each city through all 6 categories' `recomputeCategoryScore`, then `recomputeComposite`.
  4. Returns `Record<cityId, { composite, perCategoryScores }>` overrides.
- `CityTable.tsx` — accept `compositeOverrides` prop; merge over server `composite_score`; sort using overrides when present; render the "Re-ranked" indicator.
- `clientSubWeightScoring.ts` — already exports the math; small helper `summarizeCategory(contributions, score)` returns the plain-English string for the summary block.
- `cityScoringStore.ts` — no schema change. (Pending vs applied already exists as `subWeights` vs `appliedSubWeights`.)

**Performance notes**
- Visible-page rescoring is at most 25 cities × 6 categories × ~8 metrics = ~1.2k pure-function ops per Apply. Negligible.
- Single signals query keyed on visible IDs. Result cached in a `useMemo` keyed on `[visibleIds.join, appliedSubWeights, appliedWeights]`.
- No edge-function changes, no DB migration.

**Edge cases**
- Visible city has no signals row → falls back to server `composite_score` (no override).
- All sub-weights zero in a category → that category falls back to server score, exactly like the selected-city math today.
- Pending = applied → no pill, no override indicator.

## Out of scope

- Re-ranking the **entire** dataset (500+ cities). You picked visible-page only; full re-rank would need a server job and is deferred.
- Changing the math itself (formulas, normalization ranges, master weight behavior).
- The main city screen's "Apply Weights" button — kept as-is.

## Risk / undo

Risk: **medium**. Touches the table that users sort and click on. Server composite stays untouched as fallback, so disabling the override hook reverts behavior instantly. Undo: revert the 4 files; no DB or edge changes.
