## Problem

The Re-run still fails because the edge function is still failing to boot. Logs show a **new** duplicate line — same pattern as before, different variable:

```
worker boot error: Uncaught SyntaxError: Identifier 'parking' has already been declared
    at compute-sas/index.ts:379:11
```

Lines 390 and 392 of `supabase/functions/compute-sas/index.ts` both say:

```ts
const parking = await parkingSignal(geo.lat, geo.lng);
const parking = await parkingSignal(geo.lat, geo.lng);
```

That is the only thing stopping the engine from booting.

## Fix in two parts

### Part 1 — Remove the duplicate (one-line change)

Delete one of the two `const parking = ...` lines so only one remains.

### Part 2 — Stop this from happening again (small one-time guard)

This is the **second** time in a row we hit a stray duplicate declaration in the same file. The cause is always the same — an edit landed twice in `compute-sas/index.ts`. To kill the class of bug, add a tiny safeguard:

- Run a one-shot scan over the file right now that grep-checks for any line that appears **twice in a row identically** at the top level. Fix all that are found in the same pass.
- That's it. No new tooling, no CI, no config. Just a careful sweep so no third duplicate is hiding somewhere later in the file.

## Verify

1. `compute-sas` edge function boots cleanly (no "already declared" error in logs).
2. Click **Re-run** on a saved card — red error banner disappears, score recomputes.
3. After Re-run, the ⓘ source icons and "Data Sources" chip strip appear (the trust UI from the earlier change).

No score math change. No UI change. No new files. Just removing duplicate lines and one defensive sweep.
