## Why two cards are "Computing…" on every reload

The two slow cards are the **calibration anchors** (Trinity Episcopal + LeafSpring Plano). The other two (St. Francis, Trinity Christian) hydrate instantly because they're read from `site_analyses` in the DB.

In `src/pages/SiteAnalysis.tsx`:

- `useEffect` at line 743 always calls `runSlot()` for any slot with `calibrationRole` on mount → fires `compute-sas` (Mapbox geocode + isochrones + ACS + ecosystem ≈ 30–60s each).
- The DB-hydration `useEffect` at line 756 **explicitly skips** the two anchor addresses (`anchorAddrs` set at line 768), so even though Trinity/LeafSpring rows exist in `site_analyses`, we ignore them.
- Comment on line 755 states the intent: *"Calibration anchors are NOT rehydrated; they always re-run live for reproducibility."*

So this is by design today, not a bug. Nothing about the score changes per user at runtime — the engine is deterministic for a given address + school type + grade band + enrollment, and Sam's weights are client-locked. The 60s cost is purely Mapbox + ACS network calls.

## Proposed change

Treat anchors the same as the other cards: hydrate from the latest ready DB row on mount, and only run `compute-sas` if no cached row exists (or if the user hits ↻ Re-run). Calibration reproducibility is preserved because the anchor inputs are frozen — the cached row IS the last engine output for those exact inputs.

### Edits (one file: `src/pages/SiteAnalysis.tsx`)

1. **Remove the auto-run effect** at lines 742–751 (the `slots.forEach` that calls `runSlot` for every `calibrationRole` slot on mount).
2. **Extend the hydration effect** at lines 756–824:
   - Drop the `anchorAddrs` exclusion (line 768). Allow anchor addresses to hydrate.
   - When a DB row matches an anchor address, **patch the existing anchor slot in place** (set `status: "ready"`, `result: …`) instead of pushing a new slot. Keep the anchor's frozen `id`, `calibrationRole`, `schoolName`, `schoolType`, `gradeBand`, `enrollment` from the constants so calibration labels and the "Positive/Negative anchor" badge keep rendering.
   - For non-anchor rows, keep current behavior (append as new slots up to 4 total).
3. **Fallback**: after hydration completes, if either anchor slot is still `status: "idle"` (no cached row found), call `runSlot()` for just that anchor. This handles a fresh database with no prior compute.
4. **Calibration evidence row** (CalibrationRunsTable) already reads from `scored` / `trinityScored` / `leafScored`, so it will show the hydrated numbers immediately with no further change.
5. **Re-run button** on the anchor cards stays wired to `runSlot(id)` so the user can force a fresh compute any time.

### What the user sees after this change

- Page load: all four cards (including Trinity + LeafSpring) render their last-saved scores instantly. No 60s spinner on reload.
- "Computing calibration anchors…" banner only appears the first time an anchor has never been computed, or when the user clicks ↻ Re-run.
- The calibration delta (Trinity vs LeafSpring) in the evidence table is identical to what it was on the previous successful run — same engine output, same numbers.

### Not changed

- `compute-sas` engine, weights, pillar formulas, `sasMath` recompute helper, decision summary, export pack.
- Trinity/LeafSpring input constants stay frozen (`TRINITY_CANDIDATE`, `LEAFSPRING_CANDIDATE`) — only the *display* uses the cached engine output instead of re-running.
- Non-anchor card behavior is unchanged.
