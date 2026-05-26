# Parked Fix — Awaiting Brett's Approval

**Date filed:** 2026-05-27
**Filed by:** Haseeb (via Lovable)
**Status:** PARKED. Do NOT implement until Brett approves.

> **REMINDER FOR HASEEB:** Tier 1 is the current priority. After Tier 1 is finished, Lovable must remind Haseeb to get Brett's approval on this parked fix before any work begins.

---

## What the user sees (the issue, in very easy English)

Open the City Scoring page. Pick Nashville, Tennessee.

- In the **table row** for Nashville, the small category numbers are:
  - DEM = `100`, TAM = `79`, OPP = `68`
- In the **center "Selected Market" panel** for the **same Nashville**, the small category numbers are different:
  - Demand = `72`, TAM Teachers = `78`, Competitive Opportunity = `67`
- And yet, the **Overall Score on top is the same `100` in both places**.

So a normal user looks at this and thinks:
> "If the small numbers are different, how can the big number be the same? And which set of small numbers is real?"

That is troubling. The app looks like it is contradicting itself.

---

## Grade-8 explanation (report card analogy)

Think of every city as a student with a report card.

1. The app first loads each city's **original grade from the database** — call it the "default homework grade."
2. When you change the sliders or pick a preset like *Demand-Heavy*, the app is supposed to **re-grade every city with your new rules**.
3. The **table ranking** is using the **re-graded** numbers (you can see the yellow banner that says "Composite re-ranked with your weights").
4. But the **table's small Dem/TAM/Opp cells** can still be showing the **original** grade for the categories.
5. Meanwhile the **center panel** is showing the **re-graded** category numbers.

So the table and the center panel are pulling from two different "report cards" for the same student.

### Why the big number can still match (e.g. both 100)

Two slightly different sets of small grades can still add up to the same big grade after weighting, calibration, and rounding — especially near the top of the scale where many strong cities land at `100`. So the big number matching is **not proof** that the small numbers are the same.

That's exactly why this feels confusing instead of obvious.

---

## What is the role of the preset and the sliders?

- **Master sliders / presets** — change how much each big category (Demand, TAM Teachers, Competitive Opportunity) counts toward the Overall Score.
- **Sub-weight sliders** — change how a single category is built from its underlying signals.

**What users expect:** when they change either of these, **every visible score on the page** should update consistently — table ranking, table small numbers, center panel big number, center panel small numbers, compare modal, exports.

**What the app does today:** some surfaces update, some still show the old stored values. That mismatch is the bug.

---

## Is this a bug? Was Brett's instruction to do it this way?

- **Yes, it is a bug.** Not a feature. Not "by design."
- It is **not** something Brett instructed. The code comments preserve Brett's May-24 rule: **"one calibrated number everywhere."**
- The May-26 fix solved the compare modal pillars.
- The May-27 fix solved the compare modal overall score.
- **Neither fix finished the cleanup for the ranked table row cells vs the center panel.** That's what's still leaking through.

So this is an honest leftover from the earlier incremental fixes. Lovable should have caught and finished it then. Filing it now so Brett can approve closing it out.

---

## Fix plan (for when Brett approves)

One shared scoring helper used by every visible surface:

1. **Create one shared market-score builder** that returns, for any city:
   - recomputed category scores (Dem / TAM / Opp)
   - recomputed raw composite
   - calibrated display values

2. **Make the ranked table row** read its Dem / TAM / Opp cells from that helper (stop reading the stale stored `categoryScores`).

3. **Make the selected market center panel** read its category bars, driver text, formula popover, and overall score from the same helper.

4. **Verify presets and sliders** keep these all in sync after changes:
   - ranking order
   - table overall score
   - table Dem / TAM / Opp
   - center panel overall score
   - center panel Dem / TAM / Opp
   - compare modal
   - Excel + PDF exports

### Files likely touched

- `src/hooks/citySearch/useCityRanking.ts`
- `src/components/city-scoring/RankedMarketsList.tsx`
- `src/pages/CityScoring.tsx`
- `src/lib/recomputedPillars.ts` (or a new shared scoring helper next to it)

### Risk

- **Low.** Display-only unification.
- **No changes** to: database, edge functions, scoring formulas, calibration curve, tier cutoffs, presets, or any backend.

### Success condition

For Nashville (and every city), the ranked row and the center panel show the **same Dem / TAM / Opp** under the same weights. The table is ranked by the same score family it visibly shows. Compare modal + exports continue to match the UI.

---

## Did Lovable err earlier?

Yes — partially. The May-26 and May-27 fixes were correct but incomplete. They closed the compare-modal mismatch and left the ranked-table-row vs center-panel mismatch unaddressed. Filing this so the cleanup can be finished properly with Brett's sign-off.
