# Auto-Normalize Sub-Weights + Wire Into Composite + Show Formula

Per May 8 transcript: sub-weights must affect the composite score. Per CLAUDE.md Rule 1: every calculated number must reveal its math. This plan delivers both in one sprint.

## Validation answers

1. **Conflict with master category sliders?** No. They layer cleanly.
   - Sub-weights normalize to sum=100 *within each category*.
   - Master weights normalize to sum=100 *across categories*.
   - Final: `composite = Σ_c (master_c/100) × categoryScore_c` where `categoryScore_c = Σ_i (sub_i/100) × normalizedMetric_i`.

2. **Live effective % without re-scoring on every keystroke?** Yes.
   - Inside drawer: pure local arithmetic over ~8 numbers, no store writes.
   - City list re-score: triggered only on **Apply Weights** (single memoized recompute).

3. **Edge cases:**
   - **Category all-zero** → that category falls back to server-stored `category_score`.
   - **All categories all-zero** → use server composite as-is.
   - **Single non-zero** → that metric = 100% of category contribution.
   - **Disabled / Unavailable** → locked at 0, excluded from sum, show "—".
   - **Server value missing** → metric excluded from numerator + denominator.
   - **Rounding** → 1 decimal in UI, full precision in math.

## Architecture: client-side recompute

Server-side scoring engine (`supabase/functions/_shared/scoring.ts`) keeps writing per-metric normalized values + per-category fallback scores to the DB. Client multiplies those by the user's sub-weights + master weights at render time. No edge-function changes, no migrations, no refresh-pipeline rebuild. Server `composite_score` becomes the fallback when user weights collapse to zero.

## Changes

### 1. `src/components/city-scoring/SubMetricWeightsDrawer.tsx`

- Remove the "Total: X/100" badge + green/orange coloring.
- Add live `effectivePct` next to each stepper as muted `→ 62.5%` (~52px). Shows `→ —` for disabled rows or when `enabledSum === 0`.
- Footer copy: *"Numbers express relative importance — auto-normalized to 100% on Apply"*.
- Apply Weights:
  - `enabledSum = Σ enabled values`
  - `normalized[key] = enabled && sum>0 ? value/sum*100 : 0`
  - `setAppliedSubWeights({ ...appliedSubWeights, [categoryKey]: normalized })`
  - Always enabled (all-zero falls back silently).
- Reset Category: equal split across enabled metrics.
- Stepper: drop `value >= 100` cap on `+`. Keep `value <= 0` on `−`.

### 2. `src/stores/cityScoringStore.ts`

- `setSubWeight`: drop `Math.min(100, ...)`. Keep `Math.max(0, Math.round(...))`.

### 3. `src/lib/sowNormalize.ts` (new)

Pure-function port of `normalizeSowMetric` from `supabase/functions/_shared/scoring.ts` (~80 lines, verbatim). Lets the client convert raw signal values → 0..100 normalized scores without an extra DB column.

### 4. `src/lib/clientSubWeightScoring.ts` (new)

```ts
recomputeCategoryScore(
  metricsInCategory, normalizedValues, appliedSub, serverFallback,
): number | null
// usable = enabled && finite normalized && appliedSub > 0
// wsum > 0 ? Σ(normalized × sub) / wsum : serverFallback

recomputeComposite(
  categoryScores, masterWeights,
): number
// Σ(score × master) / Σ(master usable)
```

Both are pure, deterministic, and exported with a sibling `formula` string for the Show-Formula UI to display.

### 5. Wire into `CityScoring.tsx` + detail views

`useMemo` keyed on `appliedSubWeights + appliedWeights + raw signals` returns recomputed `compositeScore / categoryScores / tier` per row. Server values shown only when no signals available.

### 6. Show Formula affordance (Rule 1)

Add a **"Show Formula"** toggle (small button, lower-right of the flip-card back, next to "Adjust sub-weights"). Click flips a small panel inside the back face that reveals:

```
Normalization
  weight_i = raw_i / Σ(raw enabled) × 100

Category score
  categoryScore_c = Σᵢ (sub_i / 100) × normalizedMetric_i
  → falls back to server-stored score when Σsub_i = 0

Composite
  composite = Σ_c (master_c / 100) × categoryScore_c

Live values for {City}
  • {Metric A}: raw 42 → normalized 67.5 × sub 30% = 20.25
  • {Metric B}: raw 15 → normalized 41.0 × sub 70% = 28.70
  ───────────────────────────────────
  Demand category score = 48.95
  × master weight 25% = 12.24 → composite contribution
```

Implementation:
- Add `<ShowFormulaPanel />` component in `src/components/city-scoring/ShowFormulaPanel.tsx`. Takes `categoryKey`, `cityId`, reads from store + recompute helpers, renders a scrollable mono-font block.
- Mount inside the existing flip-card back face (the same one that holds "Adjust sub-weights"). Toggled by a `useState<"weights" | "formula">` switcher at the top of the back face.
- Mirror the same affordance on the SubMetricWeightsDrawer header — small "Show Formula" link next to the title.

### 7. CLAUDE.md update

Replace the "Sub-metric weights are display-only" caveat with: *"Sub-metric weights are normalized within each category on Apply, and feed into composite scoring client-side. Server stores raw + normalized per-metric values; client multiplies by user's sub-weights and master category weights. Every calculated number exposes its formula via Show Formula (Rule 1)."*

## Risk / effort

- **Risk: medium.** Composite math drives ranking. Mitigation: server `composite_score` stays as fallback; add a unit test in `src/test/` asserting that default sub-weights (equal split) produce a composite within ±1 of the server value.
- **Effort: ~3–4 hrs** (drawer + 2 helpers + wiring + ShowFormulaPanel + 1 test).
- **Undo**: revert ~6 files; server data untouched, behavior restores instantly.

## Out of scope

- Server-side refresh pipeline / new DB columns.
- Master category slider behavior.
- A separate "Show Formula" for the master category sliders (already trivially `Σ master × category`; revisit if Sam asks).
