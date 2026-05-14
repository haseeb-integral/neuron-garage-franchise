## Root cause

`handleSaveSearch` writes `appliedWeights` + `appliedSubWeights` (the last "Apply Weights" snapshot). The sliders show `weights` (draft). So if you drag sliders and click **Save Search** without first clicking **Apply Weights**, you save the *old* applied numbers — which is why both your rows are `demand: 100` even though the sliders looked different.

DB confirms it:
```
sample save search                  → demand:100, others:0
heavy demand based score frisco tx  → demand:100, others:0
```

## Fix (one file: `src/pages/CityScoring.tsx`)

1. **Save the draft, not the applied snapshot.** Change `handleSaveSearch` to insert the live `weights` and `subWeights` (what the sliders actually show).
2. **Apply on save.** Also call `setAppliedWeights(weights)` + `setAppliedSubWeights(subWeights)` so saving doubles as Apply — eliminates the "saved but didn't take effect" footgun.
3. **No DB / RLS / scoring changes.** Existing two rows can stay or you can delete them from the new dropdown.

## Verification
1. Set sliders to A (e.g. demand 50 / pricing 50), Save as "A" — without clicking Apply first.
2. Set sliders to B (e.g. competitive 100), Save as "B".
3. Pick A from the Saved dropdown → sliders show A. Pick B → sliders show B.
4. Re-open DB: the two rows now have different `master_weights`.

Risk: low. ~4 line change.