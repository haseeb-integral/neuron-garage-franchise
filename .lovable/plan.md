# Fix: duplicate weeks + opaque pipeline toast

Two small, scoped fixes so the human smoke test gives real signal.

## 1. Stop duplicate week rows

**Problem:** `mvs_weeks` has no unique constraint on `(provider_id, week_start)`. The `mvs-extract-weeks-austin-all` function inserts plain rows, so each Run Pipeline click adds 5 more copies (5 → 10 → 15 → 20 …).

**Migration:**
- Dedupe existing Austin rows: keep the newest row per `(provider_id, week_start)`, delete the rest.
- Add `UNIQUE (provider_id, week_start)` on `mvs_weeks`.

**Edge function edit (`mvs-extract-weeks-austin-all/index.ts`):**
- Change the week insert to `.upsert(..., { onConflict: "provider_id,week_start" })` so re-runs update the existing row instead of appending.

## 2. Informative Run Pipeline toast

**Problem:** Toast only says "Pipeline complete · 1 Firecrawl calls" — user can't tell what actually happened.

**Edge function edit (`mvs-run-pipeline/index.ts`):**
- After each step, read the child function's JSON response and collect counts.
- Return a `summary` block: `{ providers_discovered, providers_classified, weeks_upserted, screenshots_stored, firecrawl_calls }`.

**Client edit (`RunPipelineButton.tsx`):**
- Show the summary in the success toast, e.g.:
  `Pipeline complete · 1 provider · 5 weeks upserted · 1 screenshot · 1 Firecrawl call`

## What stays out of scope
- No new providers, no new cities, no scoring changes.
- No UI redesign of the MVS preview cards.
- Composite score will still be 42.0 until Sawyer's data actually changes — that is correct behavior.

## How you verify after I ship
1. Note current week count in the LIVE MVS caption (should still say "5 weeks" once dedupe migration runs).
2. Click **Run Pipeline**. Toast should show the breakdown above.
3. Refresh — caption stays "5 weeks" (no more drift to 10/15/20).
4. Open `https://www.hisawyer.com/marketplace/activity-set/1733799` in any browser (no login). Confirm camp weeks ~$850 starting June 15 — matches our `medianPrice=850, pctAtLeast500=100`.
