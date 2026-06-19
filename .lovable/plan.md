## Quick clarification before building

- **PDF Market Brief**: ✅ done. Code path: `src/lib/mvsBrief/MvsBriefDocument.tsx` renders the 12-section brief; **Export PDF** button is wired in `LiveCityDeepDive.tsx` (per-city panel) and on `MarketValidation.tsx`. Slider weights are already passed into the renderer. Only thing left is a 5-minute manual eyeball after the Re-run All run finishes.
- **4b "Auto-derive Live badge"**: ✅ already done. `ShortlistTable` reads `liveOverlays` and shows the "Live" pill whenever `useLiveMvs` returns a `result` for that city (i.e. the pipeline has produced data). No manual flip exists.

So the only real build task this turn is the Boston calibration gate.

---

## What to build: Boston calibration gate

**Goal:** Once Boston has live data, warn the user if Boston's composite isn't in the top quartile of the 8 other Tier A cities — so we don't ship a client deck where Boston looks weak.

**Where it shows:** A single dismissible banner above the shortlist table on `/market-validation`, only when:
1. Boston has a live composite (`liveOverlays.has("boston-ma")`), AND
2. At least 6 of the other 8 Tier A cities also have live composites (otherwise the ranking isn't statistically meaningful — quietly skip), AND
3. Boston's composite is NOT in the top 25% of the live set.

Banner copy (red/amber, with the actual numbers):
> ⚠ **Boston calibration check failed.** Boston composite **62** ranks **6 of 9** Tier A cities (top quartile cutoff: **74**). Review pillar weights before showing this set to a client.

When Boston IS in the top quartile, show a small green check below the table title: "Boston calibration: OK (rank 2/9)".

**Files changed:** `src/pages/MarketValidation.tsx` only. ~30 lines (one `useMemo` to compute the rank + quartile, one small banner component inline).

**Out of scope:**
- Blocking any UI action (the spec said "warn", not "lock").
- Persisting the dismissal across sessions — session-scoped only.
- Any change to scoring, weights, or pipeline functions.

## Verification
1. Refresh `/market-validation` after the current Re-run All finishes.
2. If Boston composite < cutoff: red banner appears with rank + cutoff numbers.
3. If Boston composite ≥ cutoff: green "calibration OK" note appears instead.
4. Drag weight sliders → both banner numbers update live (same `computeMvs` source).

OK to build?