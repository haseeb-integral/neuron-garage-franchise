# Market Validation Rollout — Reliability Plan

## Goal

Make the shortlist B3 refresh runner so reliable that you can hand it 50 cities, walk away, and come back to a completed run — with zero manual restarts, no silent failures, and no wasted Apify credits.

## Why this is needed

Today the runner fails ~50% of the time on multi-city runs. Every failure traces back to the same root cause: **Supabase edge functions die at ~15 minutes**, and our runner does long polling instead of fast hand-offs. Going "one city at a time" doesn't fix it — one big city (Austin, NYC) can exceed 15 minutes on its own.

---

## Phase 1 — Stop bleeding (highest impact, smallest change)

Ship these four fixes as one patch. Each city run will still be sequential, but the runner itself won't die mid-flight.

**1.1 Fire-and-chain instead of poll-and-wait**
- Runner kicks off B3 for city N.
- Immediately chains to city N+1 with a 45-second stagger (so we don't hammer Apify).
- No more per-city polling loop in the outer runner.
- The outer runner finishes in ~2 minutes total instead of 90.
- B3 keeps self-chaining internally per city, exactly as it does today.

**1.2 Real heartbeat, not fake `started_at` bump**
- Add `heartbeat_at timestamptz` column to `mvs_pipeline_runs`.
- Runner writes `heartbeat_at = now()` at every step.
- Update `mvs_sweep_stale_runs` to check `heartbeat_at < now() - interval '3 minutes'` instead of `started_at < now() - interval '25 minutes'`.
- A healthy 2-hour run is never killed. A truly stalled run is caught in 3 minutes instead of 25.

**1.3 Count real prices, not `updated_at` bumps**
- B3 writes error rows (`price_source = "B3 error: ..."`) that bump `updated_at` without producing a valid price. The poller counted these as "progress" and moved on.
- Change progress logic to count rows where `price_confidence IN ('high','medium','review')` written since the city's start time.
- Kills the false-completion bug that made 7/23 look successful when nothing had actually been refreshed.

**1.4 Normalize city labels at entry**
- Runner accepts bare names ("Carlsbad") OR full labels ("Carlsbad, CA").
- Bare names get looked up in `mvs_shortlist_cities` and expanded before anything else runs.
- Kills the "found 0 eligible providers" bug from the 7/23 run.

**Expected result after Phase 1:** ~10% failure rate, and every failure is diagnosable.

---

## Phase 2 — Make it self-healing

Add these once Phase 1 is stable.

**2.1 DB-backed queue (source of truth in the run row)**
- Move `queue`, `completed`, `current`, `results` from the request body into `mvs_pipeline_runs.source_counts` as the authoritative state.
- Every invocation re-reads the run row instead of trusting the incoming body.
- If a chain HTTP call is lost (network blip, cold start), no state is lost — the run row still knows what's left.

**2.2 Resume cron (every 5 minutes)**
- New pg_cron job runs `mvs_resume_stalled_runs()` every 5 min.
- Finds runs where `status='running' AND heartbeat_at < now() - interval '3 minutes' AND queue not empty`.
- Fires the runner again with the same `run_id` so it picks up where it left off.
- End state: **any interrupted run auto-resumes within 5 minutes, forever, until the queue is empty.**

**Expected result after Phase 2:** essentially zero manual restarts.

---

## Phase 3 — Fail fast & observe

Cheap polish that saves credits and makes you self-serve.

**3.1 Apify pre-flight and circuit breaker**
- Before the runner starts, hit Apify `/users/me` — check the account has credits and the actor is reachable.
- If pre-flight fails, refuse to start and write a clear reason into the run row.
- During the run, track consecutive Apify `TIMED-OUT` responses in B3. If 3 in a row for the same city → pause that city for 5 minutes, then retry once, then mark `partial` and move on.

**3.2 Per-city hard timeout**
- Even with fire-and-chain, one city could theoretically stall B3 forever.
- Add a 20-minute wall clock per city. If B3 hasn't finished by then, mark the city `partial` in results and let the queue continue.

**3.3 Rollout runs panel in the UI**
- Small panel on `/market-validation/rollout` showing latest run row: current city, completed, queued, heartbeat age, per-city status.
- You can see run health without asking me to query the DB.

**Expected result after Phase 3:** you can hand the runner 50 cities, watch progress in the UI, and never think about it again.

---

## What still won't be perfect (be honest)

- **Apify outages** — if their Google Maps actor is degraded, no runner change helps. Phase 3.1 makes us fail fast and stop wasting credits.
- **Lovable AI / Gemini quota** — big cities burn many Gemini calls. If we hit a daily quota, cities pause until quota resets. Out of scope for this plan.
- **Bad data from providers** — junk HTML → nonsense prices. That's a data-QA problem, separate work.

---

## Turn estimates

- **Phase 1:** 2 turns (1 for the code + migration, 1 for verification with a real 3-city test)
- **Phase 2:** 2 turns (1 for migration + runner refactor, 1 for cron + test)
- **Phase 3:** 3 turns (1 pre-flight/circuit-breaker, 1 per-city timeout, 1 UI panel)

**Total: ~7 turns across 3 phases.**

## What will not be touched

- Pricing logic (B3, Gemini extraction, gate rules) — untouched.
- Scoring logic (MBI, Market Depth, Premium classification) — untouched.
- `mvs_providers` schema — untouched.
- Any UI outside the new Rollout panel in Phase 3.

## What needs testing after each phase

- **Phase 1:** run 3 shortlisted cities end-to-end; confirm run row shows `completed`, all 3 cities have refreshed providers, heartbeat updated throughout.
- **Phase 2:** kill the edge function mid-run manually; confirm the cron picks it up within 5 minutes and finishes.
- **Phase 3:** trigger a run with a fake Apify key; confirm pre-flight refuses to start with a clear reason.

## Risks

- **Phase 1.1 (fire-and-chain):** if two cities' B3 chains overlap heavily, Apify could rate-limit. Mitigated by the 45-second stagger and Phase 3.1 circuit breaker.
- **Phase 2.1 (DB-backed queue):** need to be careful not to lose data during the migration from body-state to row-state. Will backfill the current running row if any exists.
- **Phase 2.2 (resume cron):** must not resume runs the user explicitly cancelled. Will check `status != 'cancelled'`.

## Approval

Please approve Phase 1 to start, or approve all 3 phases up front (I will still ship one phase per turn and pause for your review).
