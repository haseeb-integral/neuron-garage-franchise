# Make Enrollment optional with a neutral, honest default

## Why
Sam's PDF (page 9) lists Enrollment as **Optional**, but the current code throws if it is blank. We will match the spec and stop blocking the user.

## The default number: 475
- Sam's formula: `0.25 × normalize(Enrollment, range 150–800)`.
- Below 150 = clamps to 0 (silent penalty). Above 800 = clamps to 100 (silent gift).
- **475 is the exact midpoint of 150–800.** When blank, the enrollment slice scores 50/100 — perfectly neutral.
- Enrollment only moves the final SAS by at most **6.25%** (25% of one 25% pillar), so a neutral default is safe.
- NCES real-world averages (110 private elementary, 250 secondary) are shown as **hint text only**, not as the silent default, because they sit at or below the formula floor and would unfairly drop the score.

## What changes
**File:** `src/components/site-analysis/LiveEngineCard.tsx` only.

1. Remove the red `*` from the Enrollment label.
2. Remove the "Enrollment required" client-side block.
3. New placeholder: `Default 475 — leave blank for neutral score`.
4. Small grey helper line under the field: `Optional. Real averages: ~110 private elementary, ~250 secondary. Blank = neutral midpoint of the 150–800 scoring range.`
5. In `handleRun`, if Enrollment is empty/whitespace, fill it with **475** before sending to compute and before `onSaveToSlot`, and update the input so the user sees what was used.

## What is NOT touched
- `src/lib/sasMath.ts` and `supabase/functions/_shared/sas-math.ts` keep their "no fabrication" guard. The UI fills in 475 before calling them, so the guard never trips for blank input but still protects against real bugs.
- Scoring math, weights, pillar logic, ranges — unchanged.
- DB schema, snapshot shape, isochrones, Saved Sites, popovers, exports, Normalize button — unchanged.
- School name and address stay required.

## Risk
Very low. We always send a concrete number to the engine, and we show it to the user.

## Smoke test
1. Leave Enrollment blank, click Compute → field auto-fills `475`, School Profile pillar scores cleanly, composite renders.
2. Type `600`, Compute → field stays `600`, score reflects 600.
3. Type `90`, Compute → field stays `90`, enrollment slice clamps to 0 (expected, that's the formula).
4. Save to slot, reload page → saved card shows the number that was used (475 or user value).

## Estimate
1 Lovable turn.
