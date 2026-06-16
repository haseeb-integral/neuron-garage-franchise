## Decisions captured

- **Task 2 (calibration gate):** Accept v0.3 as calibrated, move on. Trinity 63.32 / LeafSpring 45.95 / gap 17.38 is now the accepted baseline.
- **Future options parked (no action now):**
  - (b) Add a second anchor pair to stress-test without touching weights.
  - (c) Authorize a weight rework — Brett/Sam only, brief v2.2 p.12 reserves this for the client.

These two are noted but not implemented this turn.

## Changes this turn

### 1. Remove the dev status banner

Edit `src/pages/SiteAnalysis.tsx`:
- Remove the `<Feature1BStatus />` render (the "For Dev Purposes Only — Internal Team Status Update for This Feature" panel at the bottom of the page).
- Remove its import.

Leave `src/components/phase2-demo/Feature1BStatus.tsx` on disk in case we want to restore it later — just unmount it from the page.

### 2. No other code changes

Calibration logic, anchors, engine, weights, and the rest of the page stay exactly as they are.

## Status check against your list (verified against current code)

| # | Task | Real status |
|---|------|------|
| 1 | Engine LIVE on /site-analysis | ✅ Done — `SAS_ENGINE_LIVE` referenced in `SiteAnalysis.tsx` + `LiveEngineCard.tsx`, all cards call `compute-sas`. |
| 1.5 | Urban Institute ecosystem + 50-state seed | ✅ Done per earlier turns (background seed). |
| 2 | Calibration gate ≥ 25 pt | ⚠️ Gate **not met** (gap 17.38). You've now decided to **accept v0.3 and move on** — treat as resolved/closed by decision, not by hitting the numeric threshold. |
| 3 | "One calibrated number everywhere" — `recomputeSiteScores` / `siteComposite` from `sasMath` wired into cards, calibration table, summary, export | ✅ Done for Site Analysis surfaces (cards, CalibrationRunsTable, decision summary, export all read the same helper). Market Validation table rows / RowScorePopover / compare modal are a separate page and are **not** in scope here — still ❌ for those surfaces. |
| 4 | Persist + always recompute (write to `site_analyses`, never trust stored composite at display) | ✅ Done — `compute-sas` writes rows; hydration reads pillars and recomputes composite via `siteComposite` in `useMemo` (`scored` in `SiteAnalysis.tsx`). |
| 5 | Decisions UI writing to `site_analysis_decisions` | ✅ Done — `useSiteDecisions` hook + `SiteDecisionControls` on each card; table has rows. |
| 6 | Polish + QA — loading/error states, Mapbox/Census fallback, side-by-side compare up to 4 | ✅ Largely done — cards have loading/error states, WebGL fallback shipped, anchors hydrate from cache, 4-slot compare works. Bad-address error UX and rate-limit retry surfacing could still be tightened — call ⚠️ partial. |
| 7 | Accessibility v0.2 (real Mapbox drive distances) | ✅ Done in engine v0.2 (drive-to-highway live via Mapbox Directions). |
| 8 | ACS polygon intersection v0.2 (full tract intersect) | ❌ Still the 5-point sampler. Future. |

### Open items left after this turn

- Task 3: extend "one calibrated number everywhere" to the **Market Validation** surfaces (table rows, RowScorePopover, selected-market panel, compare modal, exports) if/when you want that consistency outside Site Analysis.
- Task 6: harden bad-address + rate-limit UX.
- Task 8: ACS full tract intersection.
- Parked: (b) second anchor pair, (c) weight rework.

## Question

Anything to change in this plan, or shall I just remove the banner and call this turn done?
