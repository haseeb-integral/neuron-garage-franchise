## Decisions
- Drop Item 6 (`/mvs-preview`) — pages are live, demo column not needed.
- Pillar/composite scores recompute on read, so no "score refresh" job needed.
- The improved extractor only helps cities whose pipeline is re-run, so trigger a fresh `mvs-run-pipeline` per city.

## What to build (one turn)

**New edge function `mvs-refresh-all`** (manager-only):
1. Query distinct cities that already have rows in `mvs_providers` (i.e. cities previously run), intersected with the Tier A allow-list so we never accidentally crawl a non-shortlist city.
2. For each city, in sequence:
   - Skip if a pipeline run for that city is still in flight (`mvs_pipeline_runs` queued/running, <3 min old).
   - Otherwise POST to `mvs-run-pipeline` with `{ city }`.
   - Wait ~2 seconds between cities to avoid Firecrawl burst.
3. Return a summary `{ triggered: [...], skipped: [...] }`.

Background execution model already used by `mvs-run-pipeline` is reused — each per-city call returns immediately and the work continues in the background, so this function finishes in a few seconds.

**Trigger UI**: add a single button "Re-run pipeline for all live cities" on `/market-validation` (manager-only), next to the existing scoring console link. Clicking it calls the new function, shows a toast with the triggered/skipped counts, and tells the user to watch the existing pipeline-runs table for progress. No new status UI — re-uses the polling that already exists.

## Files changed
- `supabase/functions/mvs-refresh-all/index.ts` — new
- `src/pages/MarketValidation.tsx` — add the button + handler

## Out of scope (intentionally)
- Cron / scheduled refresh.
- New scoring logic.
- Any change to `mvs-run-pipeline` itself.
- `/mvs-preview` page.

## Verification
1. Click the new button, confirm response lists Tier A cities that have providers.
2. Watch `mvs_pipeline_runs` table — one row per city flips `queued → running → done`.
3. Spot-check Philly Art Center: its weeks now show a real registration URL in `source_url`, not the homepage.

OK to build?