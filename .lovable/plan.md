# Turn 5.2 — Run Pipeline button + status surface

We are aligned. Phases 0–4 complete, Turn 5.1 signed off. Next per the build plan: **Turn 5.2 only** (Phase 6 PDF and Phase 7 rollout come later).

## Scope (exactly what the plan says)

- Admin-only "Run Pipeline" button on the Austin city detail panel (manager role via `has_role`).
- New orchestrator edge function `mvs-run-pipeline` that runs discover → classify → extract sequentially.
- Writes one row to `mvs_pipeline_runs` with status: `queued → running → done | failed`, plus timing + error message.
- Button disabled while a run is in flight for that city (polled from `mvs_pipeline_runs`).
- Toast on completion (success / failure).
- Hard cost ceiling: max **30** Firecrawl calls per run (configurable via env, default 30).
- Gated by `MVS_PIPELINE_ENABLED` kill switch (already in place).

## Build steps

1. **Edge function `mvs-run-pipeline`** (`supabase/functions/mvs-run-pipeline/index.ts`)
   - Validates JWT, checks `has_role(user, 'admin' | 'manager')`, checks `MVS_PIPELINE_ENABLED`.
   - Validates body: `{ city: string }`.
   - Inserts `mvs_pipeline_runs` row (status=`queued`), flips to `running`.
   - Calls existing functions in sequence: `mvs-discover-providers` → `mvs-classify-tier` → `mvs-extract-weeks-austin-all` (or generic city variant for Austin only this turn).
   - Tracks Firecrawl call count; aborts with `failed` + reason if cap exceeded.
   - On completion, updates row to `done` with `finished_at`, counts (providers, weeks, qa queued).
   - On any throw, sets `failed` + error message.

2. **Frontend: Run Pipeline button** in `src/components/phase2-demo/LiveCityDeepDive.tsx` (Austin live panel only)
   - Visible only when `mvs_data_source='live'` AND user has admin/manager role (use existing role hook or query `user_roles`).
   - Polls latest `mvs_pipeline_runs` row for the city every 3s while `queued`/`running`.
   - Disabled + spinner during in-flight run; toast on terminal state; refetches live data on `done`.

3. **No schema changes** — `mvs_pipeline_runs` table already exists (Phase 1). Confirm columns match needs; if a column is missing (e.g. `firecrawl_calls`), add via single small migration.

## Out of scope (later turns)

- Phase 6 (PDF Market Brief)
- Phase 7 (Tier A rollout to 7 cities + calibration)
- Any UI changes to non-Austin cities

## Unwind

Delete the button, delete `mvs-run-pipeline` function, `DELETE FROM mvs_pipeline_runs`. Underlying data tables and Turn 5.1 wiring stay intact.

## Human-test gate (end of Phase 5)

Brett or Haseeb clicks Run Pipeline on Austin → pipeline completes → fresh numbers appear on the live panel → every score traces to a stored screenshot.

## One question before I build

The plan says cost ceiling default = **30 Firecrawl calls/run**. Lock at 30, or pick another number?
