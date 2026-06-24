## Executive summary (simple words)

We stopped using Firecrawl to find registration pages on provider websites.

Why? Because the "Market Absorption" score is retired. It was a pillar that checked how easy it is to sign up for care in each city. We turned it off on June 24, 2026. But the robot (Firecrawl) kept running anyway — searching every provider's website for a registration page, burning credits, and filling up a QA queue with 80 "not found" errors. Almost all of that work was wasted noise for a score no one sees anymore.

So we:
- Turned off the robot that searches for registration pages.
- Hid the QA queue page from the menu.
- Cleared all 80 old queue items.

We kept the code and the database table safe in case we ever bring Market Absorption back. Nothing else in the app changed. All five live scores still work the same.

---

## What we are changing and why

The Market Absorption pillar is retired (weight 0, excluded from composite since June 24). I traced the code: the `mvs_weeks` table is **only** read by `score2MarketAbsorption` in `computeMvs.ts`. No other pillar uses it.

But `mvs-extract-weeks` still runs on every pipeline run, still calls Firecrawl (search + scrape per provider) to find registration pages, and still writes failures into `mvs_qa_queue`. Today that produced **78 of 80 open QA items** about "no registration page found" — pure noise for a retired score.

We will stop the weeks pipeline, hide the QA queue page, and clear out the existing 80 rows.

## Scope and what could be affected

| Area | Change |
|---|---|
| `supabase/functions/mvs-run-pipeline/index.ts` | Skip the Stage 3 `mvs-extract-weeks` call. Mark step as "skipped (retired)" in the run log. |
| `supabase/functions/mvs-refresh-all/index.ts` | Same — skip the extract-weeks step. |
| `src/pages/MVSQAQueue.tsx` | Replace the page body with a short "Retired — Market Absorption is no longer in the composite" notice. Keep the route so old links don't 404. Remove "Re-run extraction" button. |
| `src/components/AppSidebar.tsx` (and any nav link to `/mvs-qa-queue`) | Hide the menu link. |
| DB | Mark all 80 open `mvs_qa_queue` rows resolved with reason `retired:absorption`. |
| `mvs-extract-weeks` edge function | Leave the code in place but unused, in case Absorption is ever revived. Do **not** delete. |
| `computeMvs.ts` / `score2MarketAbsorption` | No change — it already returns null and is excluded from composite. |
| `MVSSpec.tsx` / methodology docs | No change this phase. |

Not touched: scoring math, the five live pillars, the MVS table, any user-facing scores.

## Phase 1 — single phase, ~3 turns

**Turn 1** — Stop the pipeline calls
- Edit `mvs-run-pipeline/index.ts` to skip the `extract` step (still log it as `skipped`).
- Edit `mvs-refresh-all/index.ts` the same way.
- Deploy both functions.

**Turn 2** — Hide the QA page
- Replace `MVSQAQueue.tsx` body with a one-paragraph "Retired" notice + back link.
- Remove the sidebar/nav entry pointing to `/mvs-qa-queue`.

**Turn 3** — Clear the queue
- Run a single UPDATE to mark all open rows resolved with reason `retired:absorption` and `resolved_by = null`.
- Verify count goes to 0.

## Risks and what needs testing

- **Risk:** something else writes to `mvs_qa_queue`. I checked — only `mvs-extract-weeks` inserts. Safe.
- **Risk:** a future "revive Absorption" task. Mitigated by keeping the edge function code and the DB table intact.
- **Test after each turn:**
  - Turn 1: trigger a pipeline run on one city → confirm no Firecrawl spend on weeks, run record shows step skipped.
  - Turn 2: navigate to `/mvs-qa-queue` → see retired notice, no fetch errors.
  - Turn 3: open page → 0 items; old resolved rows still queryable with `Show resolved` if we keep that toggle (optional — I will keep it off for simplicity).

I will stop and wait for your approval before any of these turns.