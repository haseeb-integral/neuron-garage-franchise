# Phase 7 — Tier A rollout + calibration (1 turn)

Goal: extend the live MVS pipeline (currently Austin-only) to 7 more Tier A cities, gate the rollout on a Boston calibration check, and give Brett/Haseeb a single-page operator console to run the cities in sequence, flip flags, and unwind per city.

## Turn 7.1 — Tier A rollout console + per-city pipeline

### A. Unlock the pipeline for arbitrary cities (server)

`supabase/functions/mvs-run-pipeline/index.ts`
- Replace the `city !== AUSTIN` hard reject with a `TIER_A_CITIES` allow-list: `Austin, TX`, `New York, NY`, `Houston, TX`, `Chicago, IL`, `Boston, MA`, `San Antonio, TX`, `Philadelphia, PA`, `Los Angeles, CA`. Anything outside the list → 400 (Tier B stays sample).
- Keep the per-city in-flight guard (already keyed on `city`) and the 30-call Firecrawl cap unchanged. Cap is per-run, so 8 runs × 30 = 240 calls worst case — Brett's predictability bar.

`supabase/functions/mvs-extract-weeks-austin-all/index.ts`
- Rename to `mvs-extract-weeks-all` and remove the Austin literal: read `city` from the body, fall back to Austin for back-compat. Update `STEP_FUNCTIONS.extract` in the orchestrator to point at the new name.
- Discover + classify already take a `city` arg — no change.

### B. Tier A operator console (UI)

New page `src/pages/MarketValidationRollout.tsx`, route `/market-validation/rollout`, gated to manager/admin.

One table, 8 rows (Austin + 7 Tier A), columns:

| City | Data source | Last run | Status | Composite | Action |
|---|---|---|---|---|---|
| Boston, MA | sample/live badge | `finished_at` | done/failed/running | recomputed via `computeMvs` | Run · Flip to live · Unwind |

- Source of truth: `mvs_city_flags` for `mvs_data_source`, `mvs_pipeline_runs` (latest per city) for status, `useLiveMvs(city)` for composite — same helper as the rest of the app (Brett's rule, no stored composites).
- "Run" calls `mvs-run-pipeline` with that city. Disabled while any row is `running` to enforce sequential execution.
- "Flip to live" only enables after that city's latest run = `done`. Writes `UPDATE mvs_city_flags SET mvs_data_source='live' WHERE city=<x>`.
- "Unwind" writes `mvs_data_source='sample'` for that city. One-click reversal per the SOW.
- Auto-refresh row status every 5s while any run is `running`.

### C. Calibration gate (UI, advisory not blocking)

At the top of the rollout page, a calibration banner that activates once all 8 cities have at least one `done` run:

- Rank the 8 cities by current composite (recomputed live).
- Read Boston's rank. Top quartile = rank 1 or 2 of 8.
- If Boston is in top quartile → green banner "Calibration OK — safe to demo".
- If not → red banner "Calibration FAILED — Boston rank N/8. Halt Tier A flip; review weights before client meeting." The "Flip to live" buttons stay clickable (advisory only — Brett still decides), but the banner is unmissable.

### D. Human-test gate checklist

Inline checklist at the bottom of the rollout page, persisted to a new `mvs_rollout_signoff` JSON in `mvs_city_flags` (or a small `mvs_rollout_signoff` table — see Technical Details). Five checkboxes per signed-off city:

1. Table row composite matches detail panel
2. "Show Formula" drawer opens, numbers match
3. Composite changes when a weight slider moves (Brett's rule)
4. PDF exports cleanly, numbers match on-screen
5. Signed off by (Brett / Haseeb)

Signoff for at least 2 Tier A cities (not Austin) unlocks a "Ready for client meeting" pill at the top.

### E. Tier B untouched

No changes to Tier B (14 cities). They keep the Sample Data badge from `mvs_city_flags.mvs_data_source = 'sample'`. Confirmed by reading the flags table — no migration needed for them.

## Out of scope (deferred to v1.1)

- Tier B cities
- Weight re-calibration (only flagged, not changed, if Boston fails)
- Cross-city compare modal changes — already reads from `computeMvs`, no work needed
- Cost dashboard — `firecrawl_calls` on `mvs_pipeline_runs` is enough for this phase

## Technical details

- New page wired into the existing manager-only route guard used by `/market-validation`.
- Reuse `RunPipelineButton`'s invoke logic (factor out the fetch + toast into a small `useRunPipeline(city)` hook so the table reuses it row-by-row).
- Signoff storage: cheapest path is a new `mvs_rollout_signoff` table with `(city pk, checks jsonb, signed_by text, signed_at timestamptz)`, manager-only RLS. One migration, with the standard GRANT block.
- Edge function rename: deploy `mvs-extract-weeks-all` alongside the old name for one turn (no deletion) so a half-deployed state can't break Austin.

## Verification

1. `mvs-run-pipeline` accepts `{"city":"Boston, MA"}` and rejects `{"city":"Phoenix, AZ"}` with 400.
2. Rollout page renders 8 rows, Austin shows existing `done` run, others show "never run".
3. Click Run for Boston → status flips queued → running → done; `mvs_providers`/`mvs_weeks` get Boston rows.
4. Flip Boston to live → `mvs_data_source='live'` in DB; `LiveCityDeepDive` for Boston now reads live data; composite matches table row (Brett's rule).
5. Unwind Boston → flag reverts to sample in one click; UI immediately shows Sample Data badge again.
6. Calibration banner: simulate by running 8 cities and reading Boston's rank.

## Files touched

- `supabase/functions/mvs-run-pipeline/index.ts` — allow-list cities
- `supabase/functions/mvs-extract-weeks-all/index.ts` — new (copy of austin-all, city-parametrized)
- `src/pages/MarketValidationRollout.tsx` — new operator console
- `src/hooks/useRunPipeline.ts` — extracted from existing `RunPipelineButton`
- `src/App.tsx` — register `/market-validation/rollout` route
- One migration — `mvs_rollout_signoff` table + GRANT + RLS (manager/admin)
