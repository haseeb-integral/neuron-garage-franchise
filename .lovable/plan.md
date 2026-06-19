## Part 1 — Is Turn 2.2 (tier classifier) done?

**Status: still a real gap.** What we did was different:

- **Turn 2.1 (discover)** was expanded to 4 sources (Sawyer + ActivityHero + Google Maps via Apify + Yelp). That widened the *input* — more providers per city, with a `sources` jsonb column tracking cross-source presence.
- **Turn 2.2 (`mvs-classify-tier`)** is the function that *labels* each discovered provider as Premium / Mid / Budget / Community. The function file exists and the orchestrator calls it, but its classification logic was never reviewed against Sam's brief, and it doesn't yet use the new `sources` signal (cross-source presence is a strong "real / scaled" indicator for Premium vs Community).

**Significance:** the composite score weights Premium providers more heavily. If tier classification is weak, the composite is noisy even though we now have more raw providers. Widening discovery without sharpening classification can actually *hurt* signal quality.

So 2.2 stays on the open list; the 4-source expansion does not close it.

## Part 2 — Why "Run" failed for Austin and how to remove the foot-guns

### What I found in the data and code

- Last Austin run that completed (`7f226a3f`) took **94 seconds** end-to-end.
- The failing click left a `mvs_pipeline_runs` row in `status='running'` with `started_at = NULL`. That null is the smoking gun — see audit item 3 below.
- Toast text "Edge Function returned a non-2xx status code" comes from `supabase.functions.invoke`, which means the orchestrator HTTP response was 4xx/5xx (not a step failure — step failures return 200 with `ok: false`).

### Root causes (audit)

1. **Wall-clock timeout on the orchestrator (most likely cause).** `mvs-run-pipeline` runs `discover → classify → extract` sequentially with `await fetch(...)`. Discover alone already takes ~94s (4 sources, Firecrawl + Apify, Gemini extractions). Add classify + extract and we are well past Supabase Edge wall-clock limits. When the runtime kills the function, the client sees a non-2xx with no JSON body. The run row is left as `running` forever (the 10-min stale-clear only helps on the *next* call).
2. **Two functions write to `mvs_pipeline_runs`.** Orchestrator inserts a parent row; `mvs-discover-providers` *also* inserts its own row when invoked directly. This double-counting (a) confuses the rollout UI (extra "running" rows), (b) makes the stale-clear logic unreliable, and (c) is why we see rows with `started_at = NULL` (inserted by other internal callers that don't set it).
3. **No timeout / retry around per-source `fetch` calls.** Apify `run-sync-get-dataset-items` can hang up to 90 s by itself; Firecrawl scrape with `waitFor: 3000` can hang on slow pages. Any one of them stalling pushes the orchestrator past its limit.
4. **Toast says "Failed to start pipeline"** even when the real failure was mid-pipeline timeout. That's misleading — the run *did* start, it died partway.
5. **`MVS_PIPELINE_ENABLED` kill switch** is a silent 503. If anyone ever set it `false`, the rollout page would show this same toast with no hint why.
6. **`supabase.functions.invoke` doesn't surface the response body on non-2xx**, so the user never sees the actual error string.

### Fix plan (this turn)

**A. Make the orchestrator return immediately and run the pipeline in the background.**
- `mvs-run-pipeline` inserts the parent run row, returns `202 { ok: true, run_id, status: 'queued' }` within ~1 second.
- The actual `discover → classify → extract` sequence runs inside `EdgeRuntime.waitUntil(...)` so wall-clock timeout no longer affects the HTTP response.
- The background task updates `mvs_pipeline_runs.status` to `done` or `failed` exactly as today. The rollout UI already polls every 5 s, so behavior from the user's perspective is: click Run → "queued" pill instantly → "running" → "done" with composite ~90 s later. No more non-2xx toast.

**B. Stop `mvs-discover-providers` from inserting its own `mvs_pipeline_runs` row.**
- When invoked by the orchestrator (which is the only sanctioned caller now), accept an optional `parent_run_id` and write firecrawl-call deltas / debug into the parent row instead of creating a new row.
- Remove the standalone insert so the rollout table only ever sees one row per click.

**C. Add per-source timeouts.**
- Wrap each `fetch` (Firecrawl, Apify, AI gateway) in `AbortController` with a hard cap (Firecrawl 25 s, Apify 60 s, Gemini 20 s). On abort, that source returns empty + a debug error, the rest still run.

**D. Surface real error text in the rollout UI.**
- In `MarketValidationRollout.handleRun`, if `error` from `invoke` is present, try `await error.context?.json()` (or fall back to `error.message`) and toast that. So next time something does go wrong, the user sees the actual reason instead of "non-2xx".

**E. Auto-clear stale runs more aggressively.**
- Drop the stale cutoff from 10 minutes to **3 minutes** in both `mvs-run-pipeline` and the rollout page's `fetchAll` (treat any `running` row older than 3 min as `failed` for display). Pipeline never legitimately takes more than ~2 min.

**F. Make `MVS_PIPELINE_ENABLED` failures explicit.**
- Return `{ error: "pipeline disabled by admin kill switch (MVS_PIPELINE_ENABLED=false)" }` and have the UI render that text directly.

### Out of scope this turn

- Actually fixing Turn 2.2 (tier classifier quality). That stays on the open list as the next turn after this fix lands.
- Any UI rework beyond the toast-text change and the 3-minute stale display.

### Verification

1. Click Run on Austin from `/market-validation/rollout`. Expect: instant "queued" → "running" pill, no error toast.
2. Watch `mvs_pipeline_runs` — exactly one row per click, transitions to `done` within ~2 min with `firecrawl_calls > 0`.
3. Force a failure (temporarily unset `APIFY_API_TOKEN` env in a test branch — *not in this turn*) and confirm the toast shows the real reason, not "non-2xx".
4. Confirm Composite column in the table updates after the run completes.
