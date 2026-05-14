# Build A–D + answer the 25% vs 8% question

## Why the drawer says 25% but the card slider shows 8%

I traced the code. The drawer reads from `appliedWeights` (the master weights you've **clicked Apply on**). The card slider shows `weights` (what you're **currently dragging**). They're two different states.

So right now: you dragged Demand's master slider down to 8% on the card, but you didn't click the **"Apply Weights"** button at the top-right of the Scoring Weights section. Until you click it, the drawer keeps using the previously-applied 25%, and the composite score is also still computed with 25%.

This is by design (typing/dragging shouldn't immediately re-rank everything), but it's invisible to you — there's no signal that pending master edits exist.

**Fix added to plan (item F):** when `weights ≠ appliedWeights`, show an inline "Pending master edits — click Apply Weights to use 8%" hint inside the drawer's master-weight line, in amber, so you know exactly which number is being used and why.

---

## Build items

### A. Fix the close (X) overlapping the action button
`src/components/ui/sheet.tsx` renders a built-in `<SheetPrimitive.Close>` X at `top-4 right-4`. Our drawer header puts "Show Formula" / "Edit Weights" in the same corner, so they collide. Add `pr-10` to the drawer's header action container in `SubMetricWeightsDrawer.tsx` so the action button sits left of the X with breathing room. No change to the shared `sheet.tsx`.

### B. Tooltips + legend on Raw / Norm / Share / Contrib
Wrap each `<th>` in `Tooltip` from `@/components/ui/tooltip`:
- **Raw** — Actual measured value for this city (e.g. 26,960 children).
- **Norm** — Raw value scaled to 0–100 using this metric's range.
- **Share** — This metric's slice of the category, after auto-normalizing your typed weights to 100%.
- **Contrib** — Norm × Share. Sum of Contrib = category score.

Add a one-line legend above the table: *"Raw → scaled to Norm (0–100) → weighted by your Share → contributes to category score."*

### C. Plain-English summary: explain the 25% line
Append to `summarizeCategory` in `clientSubWeightScoring.ts`. New optional args: `masterWeightPct`, `compositeContribution`. Adds one sentence:

> Demand counts for 25.0% of the overall composite, contributing 17.0 points to Frisco's composite score today.

If pending master edits exist (item F surfaces this), the sentence appends: *"(Master sliders have unsaved edits — click Apply Weights on the main screen to use the new value.)"*

### D. Score-delta toast after Save & Recalculate
In `handleApply`:
1. Capture `oldDemand` = current preview score (before normalize), `oldComposite` = current composite for selected city (from `compositeOverrides[selectedId]?.composite ?? serverComposite`).
2. After `setAppliedSubWeights`, compute `newDemand` from the just-normalized weights and `newComposite` via `recomputeComposite` using fresh per-category scores.
3. Replace existing `toast.success(...)` with:
   ```
   Demand updated: 71.4 → 68.1 · Composite updated: 78 → 77
   ```
   If composite unchanged (only this category drawer was edited but recompute rounds same): show only the category line. `duration: 4000`.

Note: `compositeOverrides` lives in `CityScoring.tsx`. Easiest path: pass `currentComposite` and an `onApplied(newComposite)` callback into the drawer, OR compute new composite inside the drawer using a new prop `allCategoryScoresExceptThis: Record<CategoryKey, number|null>`. I'll go with passing in the current composite plus a closure that returns recomputed composite given the new applied sub-weights — keeps the drawer self-contained.

### F. (NEW — closes the 25% vs 8% confusion) Show pending master-edits hint
In `SubMetricWeightsDrawer.tsx`, accept new prop `masterWeightPending?: { applied: number; pending: number }`. When present and `applied !== pending`, render a small amber line under the "× master weight 25.0% → composite contribution" row:

> ⚠ You've dragged this slider to 8.0% but haven't clicked **Apply Weights** yet. Composite still uses 25.0%.

Wire from `CityScoring.tsx` by computing both pending and applied master shares and passing both.

---

## Files touched
- `src/components/city-scoring/SubMetricWeightsDrawer.tsx` — A, B, C wiring, D, F
- `src/lib/clientSubWeightScoring.ts` — C (extend `summarizeCategory`)
- `src/pages/CityScoring.tsx` — D (pass `currentComposite` + recompute helper), F (pass pending vs applied master)

## Out of scope
- Auto-applying master sliders on drag (deliberate two-step UX).
- Changing how server composite is fetched.
- Master sliders themselves.

## Risk: Low. Undo: revert 3 files.
