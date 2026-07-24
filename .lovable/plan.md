# Phase 3 — Apify Circuit Breaker + Rollout UI Panel

## Why
When Apify is degraded (429, 5xx, credit exhausted, timeouts) our pipeline keeps hammering it. That wastes credits, burns edge-function time, and hides the real cause behind vague "failed" statuses. We also have no in-app switch to pause the pipeline when things are on fire. Phase 3 adds a **circuit breaker** in front of every Apify call and a small **control panel** on the Rollout page to see breaker state and pause/resume runs.

## What changes for the user
- On the Rollout page a new small panel shows: Apify status (green / warning / open), last failure reason, minutes until auto-retry, and a "Pause pipeline" toggle.
- When the breaker is **open**, new runs are blocked with a clear message ("Apify circuit open — retry in Xm") instead of failing silently mid-run.
- Nothing else in the UI moves. No route changes, no schema changes to scoring tables.

## What we are building (technical)
1. **New table `apify_breaker_state`** (single row, `id = true`):
   - `state` (`closed` | `half_open` | `open`)
   - `consecutive_failures` int
   - `opened_at`, `next_retry_at` timestamps
   - `last_error` text, `last_actor` text
   - `paused_by_user` bool (manual kill-switch)
   - `updated_at`
   - RLS: read for authenticated, write only via SECURITY DEFINER functions.

2. **Shared helper** `supabase/functions/_shared/apifyBreaker.ts`:
   - `checkBreaker()` → throws `BreakerOpenError` if open or paused.
   - `recordApifySuccess()` → resets failures, closes breaker.
   - `recordApifyFailure(err, actor)` → increments; opens breaker after **3 consecutive failures** OR any 402/429; sets `next_retry_at = now + 10 min` (exp back-off up to 60 min).
   - Wraps only Apify HTTP calls; not Firecrawl, not Gemini.

3. **Wire the helper** into the two callers:
   - `mvs-discover-providers/index.ts` (Google Maps runner)
   - `mvs-price-b3/index.ts` (Apify Website Content Crawler calls)
   Each call site: `await checkBreaker()` before, `recordApifySuccess/Failure` after.

4. **Rollout panel** (`src/pages/MarketValidationRollout.tsx`):
   - Small `ApifyBreakerCard` component above the city table.
   - Reads `apify_breaker_state` (polled every 15s while page open).
   - Shows dot + label, last error, countdown to auto-retry.
   - "Pause pipeline" / "Resume" button (manager+admin only) calls a new RPC `apify_breaker_set_paused(bool)`.
   - "Force close" button (admin only) calls `apify_breaker_force_close()` for manual override.

5. **DB functions (SECURITY DEFINER, staff-gated)**:
   - `apify_breaker_set_paused(_paused bool)`
   - `apify_breaker_force_close()`
   Both write to `apify_breaker_state` and log to `notifications`.

## What we are NOT touching
- Scoring math, MBI, tiers, providers table — untouched.
- `mvs-b3-shortlist-refresh` orchestrator — it inherits protection through the shared helper; no logic changes there.
- Firecrawl, Gemini, Google Maps direct calls — different providers, out of scope.
- No changes to `us_cities_scored`, `mvs_providers`, `city_briefs`.

## Risk / testing
- Risk: breaker opens too eagerly and blocks a real run. Mitigation: 3-strike rule + only 402/429 opens on first hit.
- Risk: paused toggle is forgotten and stops overnight runs. Mitigation: `paused_by_user=true` is shown in bright amber; auto-retry ignores manual pause.
- Smoke test after each phase step:
  1. Trigger a normal Denver refresh → breaker stays closed, panel green.
  2. Manually flip `paused_by_user=true` in DB → next Run click blocked with clear toast.
  3. Force an Apify 429 in one call → breaker opens, panel shows countdown, other cities blocked until timer expires.

## Turn breakdown
- **Turn 1 (this one after approval)**: migration for `apify_breaker_state` + two RPCs + shared helper file.
- **Turn 2**: wire helper into `mvs-discover-providers` and `mvs-price-b3`.
- **Turn 3**: `ApifyBreakerCard` component + hook into `MarketValidationRollout.tsx`.
- **Turn 4**: smoke test + polish copy.

Estimated: **~4 Lovable turns** total.

## What you should test after each turn
- Turn 1: migration approved, no red errors in logs.
- Turn 2: run any city; verify it still completes; check breaker row shows a recent `updated_at`.
- Turn 3: panel appears on `/market-validation/rollout`, pause toggle works, countdown renders.
- Turn 4: force a failure, verify blocking + auto-retry.

Waiting for your approval before I touch any code.