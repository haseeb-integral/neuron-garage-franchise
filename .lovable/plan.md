## Goal
Make the Scoring Weights sliders visibly drive the selected market's composite score in the center detail panel. Default weights match the official model. Frontend-only.

## Scope confirmation
- No DB write
- No Edge Function change
- No Census/BLS work

## Changes (all in `src/pages/CityScoring.tsx`)

### 1. Default weights → official model
`CATEGORIES.defaultWeight`: demand 25, pricingPower 20, competitiveLandscape 20, franchiseeSupply 15, easeOfOperations 10, parentMindset 10. UI keys already map 1:1 to DB keys via `DB_CAT_TO_UI`.

### 2. Add applied-weights state
`appliedWeights` initialized to defaults. Drives the displayed composite — sliders alone don't change the gauge until Apply is clicked. `resetWeights()` resets both `weights` and `appliedWeights`.

### 3. Compute weighted composite from visible category scores
Use `detailCategoryScores` (live DB scores w/ sample fallback) and `appliedWeights`:

```ts
const weightedComposite = appliedTotal > 0
  ? Math.round(
      CATEGORIES.reduce((s, c) => s + detailCategoryScores[c.key] * appliedWeights[c.key], 0)
      / appliedTotal
    )
  : detailScore;
```

Replace `detailScore` in gauge `strokeDasharray` and center text (~lines 690–693) with `weightedComposite`.

### 4. Recompute tier from weighted score (official thresholds)
- A = 85+
- B = 75–84
- C = 65–74
- D = below 65

Use `tierFromScore(weightedComposite)` for the tier badge near line 703 and its color.

### 5. Apply Weights behavior
- `applyWeights()`: if `totalWeight === 100`, copy `weights` → `appliedWeights` and toast "Composite score recalculated from current weights."
- Button disabled when `totalWeight !== 100` (already wired).
- Existing "Weights must total 100%" warning remains.

### 6. Helper text near the score
Under "Excellent Opportunity" (~line 695):
```
<p className="text-[10px] text-[#8794ab]">Score recalculated from current category weights.</p>
```

## Out of scope
- Census / BLS integration
- Persisting recalculated score to DB
- Ranked Markets list scores (still uses stored `compositeScore`)

## Test
1. Frisco, TX with default weights → gauge shows weighted composite of live category scores.
2. Move Demand=50, others=10 each → Apply → gauge + tier update; helper text visible.
3. Total ≠ 100 → Apply disabled, warning shown, gauge unchanged.
4. Reset to Default → returns to official-model composite.
