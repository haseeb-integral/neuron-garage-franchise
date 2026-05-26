## What you're seeing

**Table shows 100. Compare modal shows 99. Same city (Nashville), same moment.**

That is a bug — and it's the **same family of bug** we fixed on May 26 for the pillar numbers (Demand/TAM/Opportunity). Back then, the modal was reading stale DB pillar values instead of the recomputed ones. We fixed the pillars but **forgot to fix the Overall Score** on top.

## Grade-8 explanation

Think of it like a school report card:

1. The app starts with each city's **original score from the database** (let's call it "default homework grade").
2. When you change the sliders / pick a preset like *Demand-Heavy*, the app **re-grades every city** using your new rules. This new grade is what the **Ranked Markets table** shows you (the yellow banner literally says "Composite re-ranked with your weights").
3. The **Compare modal**, however, never got the memo. It still reads the **original default grade** from the database and just runs it through the display polish (the 0-100 calibration curve).

So for Nashville:
- Re-ranked grade → calibrates to **100** (table)
- Original DB grade → calibrates to **99** (modal)

One point difference today. With a heavier preset it could be a 5–10 point gap. The pillars below (83 / 73 / 68) are already correct because we fixed those last time — only the big number on top is wrong.

## Will this affect scoring math or other components?

**No.** This is purely a display fix in **one place** — the modal already receives `appliedSubWeights` and `appliedWeights`. We just need to use them.

- No database changes.
- No edge function changes.
- No change to the calibration curve, tier cutoffs, or the formulas.
- The table, drawer, Market Report, and Export buttons keep showing exactly what they show today.
- Tier (the "A" badge) is derived from the overall score, so it will also become consistent automatically.

## The fix (1 file, ~15 lines)

**File:** `src/components/city-scoring/MarketCompareModal.tsx`

Right now line 154 / 164 reads:
```ts
buildMarketView(m).composite          // uses DB compositeScore (stale)
```

Change it to use the **same recompute pipeline the pillars already use** inside the modal:

1. Import `buildRecomputedPillarScores` (already used in the modal for pillars) and `recomputeCompositeFromPillars` helper.
2. For each market in the modal:
   - Recompute the 3 pillar **raw** scores with `buildRecomputedPillarScores(m, appliedSubWeights)`.
   - Combine them with `appliedWeights` (master weights) into a raw composite — same math the ranking hook uses.
   - Pass that raw value through `calibrateCompositeForDisplay()` → the calibrated 0-100 number.
3. Use that number for **both** the Overall Score gauge AND the Tier derivation.

If `recomputeCompositeFromPillars` doesn't already exist as a shared helper, I'll extract the 4-line weighted-average from `useCityRanking` into `src/lib/recomputedPillars.ts` (next to the pillar helper we added on May 26) so the modal and the table call the **exact same function** — no second source of truth.

## Export side effect (good news)

The Excel and PDF exports we just shipped already call `buildMarketView(m).composite` for the Overall row. Once the modal switches to the recomputed composite, the exports will pick up the same fix automatically (they share the `assemble()` function in `compareExport.ts`).

## Risk

- **Low.** One display value in one modal. Tier letter on the same row will follow automatically.
- **No risk to:** ranking, table, drawer, Market Report, scoring formulas, DB, edge functions.

## Verification after fix

1. Open Nashville + Louisville with default preset → modal Overall Score should match the table SCORE column for each row.
2. Switch to **Demand-Heavy** preset → both numbers should still match (this is the case that exposed the bug).
3. Pillars (83/73/68) should remain unchanged.
4. Export Excel → "Overall Score" row in *Overview* sheet should match the modal and the table.

## Out of scope

- No changes to scoring math, calibration curve, presets, or tier cutoffs.
- No changes to the table, drawer, report, or any backend.
- No new tests beyond the existing `compareExport.test.ts` smoke check.

Awaiting your approval (or Brett's) before I switch to build mode and apply the one-file change.
