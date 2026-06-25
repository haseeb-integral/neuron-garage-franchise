# Firecrawl Fallback — Use Recent Saved Data When Crawl Fails

## Goal (plain English)

If Firecrawl fails today, the MVS page must not break. Show the last good score from the database and tell the user the data is from an older date. Only show "failed" when there is no recent saved data at all.

## Freshness rules (approved)

- **0–30 days old** → "Fresh fallback" — green dot, normal trust, small note "Using saved data from {date}".
- **31–60 days old** → "Stale fallback" — amber dot, banner "Using saved data from {date} — new crawl failed".
- **> 60 days old** → Hard fail / "Needs review" — red, no score shown, ask user to retry.

## Pages / files that may be touched

- `supabase/functions/mvs-run-pipeline/index.ts` — wrap Firecrawl calls, downgrade fatal errors to soft failures, decide `done` vs `done_stale` vs `failed`.
- `supabase/functions/mvs-classify-tier/index.ts` — same soft-fail pattern if it calls Firecrawl.
- `mvs_pipeline_runs` table — write new `status` values (`done_stale`, `failed_no_data`) and a `fallback_reason` text. No schema change if `status` is already free-text; otherwise add one column.
- `useLiveMvs.ts` (hook) — read fallback status + saved-data age, expose to UI.
- `LiveCityDeepDive.tsx` — show amber/green dot, "Using saved data from {date}" line in the Trust section.
- `MarketValidation.tsx` / table — show small amber dot on rows using stale fallback.
- `RunPipelineButton.tsx` — toast message: "Crawl failed, using saved data from {date}" instead of red error.

## What will NOT change

- Scoring math, weights, default 475, registration scraper retirement, Saved Sites, exports, Site Analysis page.
- No new providers will be invented from stale data — we only re-use what was already saved.

## Phases

**Phase 1 — Backend soft-fail (1 turn)**
- In `mvs-run-pipeline`, wrap each Firecrawl call in try/catch.
- On failure, check `mvs_providers.updated_at` for the city.
- Pick status: `done` (fresh run), `done_stale` (used 0–60 day saved data), or `failed_no_data` (>60 days or empty).
- Write `fallback_reason` and `fallback_data_date` into `mvs_pipeline_runs`.
- Never overwrite saved provider rows with empty results.

**Phase 2 — UI status indicators (1 turn)**
- Hook reads run status + fallback date.
- Card Trust section: amber line "Using saved data from {Jun 20} — new crawl failed".
- Table row: small amber dot tooltip "Stale fallback — 42 days old".
- Run button toast: friendly message instead of red error.

**Phase 3 — Smoke test (1 turn)**
- Force a Firecrawl failure (bad URL or env flag) for one city.
- Confirm score stays visible, amber banner shows, no data loss.
- Confirm a >60 day case shows hard-fail correctly.

## Risks

- If `mvs_pipeline_runs.status` is a strict enum, Phase 1 needs a tiny migration to add `done_stale` and `failed_no_data`.
- Need to make sure soft-fail does not hide real bugs — every fallback writes a clear `fallback_reason` so we can audit.

## Turns estimate

3 turns total (one per phase). Stop after each phase for your review.

Approve and I'll start Phase 1.
