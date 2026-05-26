## Goal

Save the Nashville score-mismatch explanation + fix plan in TWO places so you can hand it to Brett later, while Tier 1 stays the priority. No code changes to the app.

## Files to create

### 1. `docs/pending-approval/2026-05-27-nashville-score-mismatch.md`
A dedicated doc for Brett's review. Self-contained so Brett can read it without any other context.

### 2. `.lovable/parked-fixes.md`
A running "parked, awaiting approval" list. The Nashville issue becomes the first entry. Future parked fixes append here so nothing gets lost.

Both files contain the same explanation in plain English, written exactly the way I explained it to you:

- **What the user sees** — table shows different Dem/TAM/Opp than the center panel for the same city (Nashville), while Overall Score can still match (e.g. both 100).
- **Grade-8 explanation** — report-card analogy. Original DB grade vs re-graded with your weights. Two slightly different category mixes can still round to the same overall, which is why the big number matches but the small ones don't.
- **Why this is troubling for a normal user** — feels like the app contradicts itself.
- **Role of presets / sliders** — master sliders change how much each category counts in the overall; sub-weight sliders change how a category itself is built. Both should update every visible number, but today they don't update every surface consistently.
- **Is it a bug?** — Yes. Not Brett-instructed. It's a leftover from the May-26 / May-27 fixes that solved the compare modal but didn't finish the table-row vs center-panel cleanup.
- **Did I (the AI) err earlier?** — Yes, partially. The earlier fixes were correct but incomplete.
- **Fix plan** — one shared scoring helper used by: ranked table row cells, center panel category bars, compare modal, exports. Files likely touched: `useCityRanking.ts`, `RankedMarketsList.tsx`, `CityScoring.tsx`, `recomputedPillars.ts`.
- **Risk** — display-only unification; no DB / edge function / formula / calibration changes.
- **Status** — PARKED. Tier 1 is priority. Do NOT implement until Brett approves.

## Reminder responsibility

I will add this line at the top of BOTH files in bold:

> **REMINDER FOR HASEEB:** Tier 1 is the current priority. After Tier 1 is finished, Lovable must remind Haseeb to get Brett's approval on this parked fix before any work begins.

I will also add a memory rule so I proactively surface this in future chats once Tier 1 is marked done. Memory entry:

- **Core rule added:** "Parked fix awaiting Brett approval: table vs center-panel category-score mismatch (docs/pending-approval/2026-05-27-nashville-score-mismatch.md). Remind Haseeb after Tier 1 is finished. Do not implement until Brett approves."

## Out of scope

- No changes to `.lovable/plan.md` content (that already holds the compare-modal fix).
- No code edits to scoring, table, panel, or modal.
- No DB / migration / edge function changes.

After you approve, I'll switch to build mode and create the two files + memory entry. Nothing else.