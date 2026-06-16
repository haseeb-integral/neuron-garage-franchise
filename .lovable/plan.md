## Goal — Brett's "one calibrated number everywhere" for Feature 1B

Today, every surface on `/site-analysis` reads a **stored** number off the demo object. The big `composite: 86` on a card and the `value: 85, 92, 78, 84, 88` pillar bars on the same card are independently written constants — nothing guarantees they actually add up. If anyone edits a pillar and forgets to update the composite, the page silently lies.

Brett's rule says: **every surface (card composite, pillar bars, calibration banner, winner banner, decision summary table, export pack) reads from one helper that recomputes the composite from the pillars at render time.**

This turn is **pure plumbing** — no model change, no new data, no calibration tuning.

## In plain English (what the user will see)

- **Before:** Composite "86" was a hand-typed number sitting next to five hand-typed pillar bars. They could drift.
- **After:** Composite is computed live from the pillar values using the same formula the live engine uses (`0.25 × Profile + 0.25 × Affluence + 0.20 × Density + 0.15 × Ecosystem + 0.15 × Accessibility`). Edit any pillar → composite updates everywhere automatically (cards, banner, winner pill, summary table, exported PDF).
- The number doesn't *change* on screen today (the demo values already add up to ~86 and ~41 for Trinity / LeafSpring). The win is that **the page can no longer drift** and Brett's rule is satisfied.

## Scope (5 files)

```text
src/lib/sasMath.ts                              # add recomputeSiteScores() helper
src/data/phase2DemoData.ts                      # no schema change, just a type re-export
src/pages/SiteAnalysis.tsx                      # all 4 surfaces use the helper
src/components/site-analysis/LiveEngineCard.tsx # also route through the same helper
src/lib/decisionsExport.ts                      # export reads recomputed values
```

## Technical details

1. **Add `recomputeSiteScores(input)` to `src/lib/sasMath.ts`.**
   - Input: an object with the 5 pillar values (already on the demo + already returned by the live engine).
   - Output: `{ pillars: {schoolProfile, affluence, familyDensity, ecosystem, accessibility}, composite }`.
   - Internally calls existing `compositeSas()`. Rounded with existing `round2()`.

2. **Refactor `SiteCard`** in `src/pages/SiteAnalysis.tsx`:
   - Stop reading `site.composite`. Read `recomputeSiteScores(site.subScores).composite`.
   - Pillar bars read the same `pillars` object so the bars and the composite are guaranteed consistent.

3. **Refactor `CalibrationGateBanner`, `WinnerBanner`, `DecisionSummary`:**
   - All three currently read `s.composite`. Switch them to the recomputed value via a small `siteComposite(site)` accessor.

4. **Refactor `exportSiteDecisionPack`** in `src/lib/decisionsExport.ts`:
   - Same swap — the printed pack must show the same number as the on-screen card.

5. **Refactor `LiveEngineCard`:**
   - It already gets pillar values from `compute-sas`. Route the displayed composite through `recomputeSiteScores()` so the live path and demo path are byte-identical in how they derive the headline number.

6. **No schema change. No SOW math change. No SOW weight change.**

## Out of scope (explicit, so I don't drift)

- Not touching `compute-sas` (engine math stays as-is).
- Not touching the LeafSpring < Trinity calibration failure — that's a separate Brett conversation.
- Not changing demo pillar values.
- Not wiring the "Analyze a site" disabled form (that's a later turn).
- Not adding new tables, secrets, or migrations.

## Human manual test after this turn

Hard-refresh `/site-analysis`, then:

1. **Cards still show the same composite numbers** (Trinity ≈ 86, LeafSpring ≈ 41). ✅ if so.
2. **Open DevTools → Console.** No new errors.
3. **Open** `src/data/phase2DemoData.ts`, change Trinity's `schoolProfile.value` from `85` → `30`, save.
4. **Reload the page.** Trinity's composite **should drop automatically** (the card, the calibration banner, the winner pill in the summary table, and the exported decision pack should all show the new lower number — no other code change needed).
5. **Revert the edit** so we don't ship a tampered demo.
6. **Click "Compute SAS"** in the Live Engine on Trinity's preset. Confirm the headline composite still matches the pillar bars.

If all six pass, Brett's "one calibrated number everywhere" rule is satisfied for Feature 1B.

## Status updates I'll log

- Update `.lovable/phase-2/phase-2-status.md` row 2 → "in-progress · one-number plumbing".
- Append entry to `.lovable/phase-2/CHANGELOG.md` with date/who/what/why.

## What comes after this turn (preview, not part of this plan)

- **Next:** Decision capture refactor — `site_analysis_decisions` writes from both the demo and live engine.
- **After that:** Bring the LeafSpring < Trinity failure to Brett with concrete options (customer-proximity pillar, competitive-saturation penalty, or reweight).
- **Then:** Per-site branded PDF (SOW Item 2 acceptance criterion #5).
