## Problem

The freshness pre-check (skip re-crawl if saved data ≤ 30 days) is only wired into the `RunPipelineButton` on the city deep-dive panel.

The **Run buttons in the City Scoring Console table** (`MarketValidationRollout.tsx`, the page in your screenshot) bypass that check completely — they call the pipeline edge function directly. So clicking Run on Denver started a fresh crawl even though Denver's last good run was 2 hours old.

This is the same page where you saw "Denver, CO — running" after my earlier message said the crawl would be skipped. My earlier answer was wrong for this page.

## Goal

Apply the same 3-tier freshness rule to the per-row Run button in the City Scoring Console table, so behavior is consistent everywhere:

- 0–30 days old → skip crawl, toast "Using saved data from {date}", keep score visible.
- 31–60 days old → show "Use saved data / Run fresh crawl" prompt.
- 60+ days old → run fresh crawl automatically.
- Always allow a manual "Force fresh crawl" override.
- Judge age from `fallback_data_date` for `done_stale` runs, `finished_at` for `done` runs.

## Plan (one phase, one file)

**File:** `src/pages/MarketValidationRollout.tsx`

1. Extract the small shared helper logic (already in `RunPipelineButton.tsx`) into a new helper file `src/lib/mvs/preCrawlFreshness.ts`:
   - `findLastGoodRun(city)` — query latest `done`/`done_stale` row, return effective data date.
   - `ageDays(iso)` — number of whole days since `iso`.
   - Constants `FRESH_SKIP_DAYS = 30`, `FRESH_PROMPT_DAYS = 60`.
   Refactor `RunPipelineButton.tsx` to import from this helper (no behavior change there).

2. In `MarketValidationRollout.tsx`:
   - Update the row's `handleRun(city, state)` to first call `findLastGoodRun`, then branch the same way:
     - ≤30 days → skip crawl, toast "Using saved data from {date} — skipped fresh crawl", call the existing refresh path so the table re-reads the composite, do NOT invoke the edge function.
     - 31–60 days → open a confirm dialog (`AlertDialog`) asking "Use saved data / Run fresh crawl".
     - >60 days → invoke pipeline as today.
   - Add a small **"Force fresh"** link next to each row's Run button (icon-only on small screens, text on wider) so the user can always override.
   - Lift one shared `AlertDialog` to the page level so we don't render one per row.

3. Smoke check:
   - Click Run on a city with `done` today → should toast "Using saved data" and NOT flip to "running".
   - Click "Force fresh" on the same row → should crawl normally.
   - Click Run on a city with `done_stale` from today (where `fallback_data_date` is older) → should judge age from `fallback_data_date`, not today.

## What I will NOT touch

- Scoring math, computeMvs, Firecrawl fallback logic (already shipped).
- `mvs-run-pipeline` edge function — the check stays purely client-side.
- Database schema.
- The deep-dive panel's existing Run button (only refactor to use the shared helper; same behavior).
- Other pages (Site Analysis, Saved Sites, etc.).

## Risk

Very low — adds a pre-check before an existing call. If the helper fails, we fall through to running the pipeline as today, so worst case is "behaves like before the fix". Easy to revert.

## Estimated turns

1 turn to ship Phase 1 + small smoke test.
