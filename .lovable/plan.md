# Raise Firecrawl cap to 50

## Change
In `supabase/functions/mvs-run-pipeline/index.ts`:
- `MVS_PIPELINE_FIRECRAWL_CAP`: 30 → 50
- Add per-step sub-caps: discover ≤ 25, classify ≤ 15, extract ≤ 15
- If any step exceeds its sub-cap, fail the run with a clear message like `discover used 26 — over per-step limit (25)`

## Not touched
Scoring math, fallback logic, UI, frontend, database, other edge functions.

## Phases
**Phase 1 (1 turn):** Edit constants + add per-step check. Deploy `mvs-run-pipeline`.

## Test after
- Denver (~12 calls): succeeds as today.
- San Diego (previously 38): now succeeds.
- Confirm no UI change.

## Risk
Very low — constants + one small check. Revert in 1 turn if needed.
