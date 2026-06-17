## Fix plan

1. **Immediate root-cause fix**
   - `mvs-discover-providers` is currently failing at boot because `SCREENSHOT_BUCKET` is declared twice.
   - Remove the duplicate declaration so the function can start again.

2. **Prevent duplicate-constant boot failures**
   - Add a lightweight edge-function syntax check / lint-style verification for the touched function before finishing.
   - Specifically confirm there are no duplicate top-level declarations for `SCREENSHOT_BUCKET` or other constants in `mvs-discover-providers`.

3. **Make pipeline failures diagnosable in the UI/backend records**
   - Keep the orchestrator behavior, but ensure the failure written to `mvs_pipeline_runs.error` includes the actual step and returned detail, not only “non-2xx”.
   - This way future failures show whether it was discover boot, empty Sawyer scrape, classify, or extract.

4. **Verify end-to-end after the code fix**
   - Re-check edge function logs for `mvs-discover-providers` to confirm the boot error is gone.
   - Run/test at least one Tier A city path through the backend function call if available, and confirm it no longer fails immediately at startup.

## Technical scope

Files expected to change:
- `supabase/functions/mvs-discover-providers/index.ts`
- Possibly `supabase/functions/mvs-run-pipeline/index.ts` only if the current returned error is too generic after inspection.

No UI redesign, no Sawyer box retuning, no new database tables, no migration.