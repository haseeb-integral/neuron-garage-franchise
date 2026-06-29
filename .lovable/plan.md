# Phase 2 — Test Runs and Report

No code changes. Only test runs + DB reads + report.

## Confirm scope of files touched in Phase 2

Only one file was changed:
- `supabase/functions/mvs-discover-providers/index.ts`

No other file, no schema, no other function, no UI. I will re-grep the project to confirm before running tests.

## Steps

1. **Re-confirm file scope** — quick check that no other files were edited in Phase 2.

2. **Capture BEFORE numbers** for Columbus, OH / Boston, MA / Austin, TX:
   ```sql
   SELECT city, COUNT(*) AS providers, COUNT(price_min) AS with_price,
          ROUND(100.0*COUNT(price_min)/NULLIF(COUNT(*),0),1) AS pct_priced
   FROM mvs_providers
   WHERE city IN ('Columbus, OH','Boston, MA','Austin, TX')
   GROUP BY city;
   ```

3. **Run the pipeline** for each city with `forceFresh: true` via `supabase--curl_edge_functions` → `/mvs-run-pipeline`. One at a time, wait for `mvs_pipeline_runs.status` to become `done` (or `failed`) before starting the next. Each run typically takes ~1–3 minutes.

4. **Capture AFTER numbers** with the same SQL.

5. **Pull per-run stats** from `mvs_pipeline_runs` (firecrawl_calls, source_counts, status, error).

6. **Count guard drops** — Phase 2 added a regex guard that nullifies any Gemini-returned price not literally found in the source markdown. I'll check edge function logs for the guard's debug line and count drops per city.

7. **Spot check** 3–5 newly priced providers per city: open their listing URL, confirm the dollar amount really appears.

## Report I will return

For each of the 3 cities:
- Providers total, with_price, % priced — BEFORE
- Providers total, with_price, % priced — AFTER
- Firecrawl calls used (and per-step breakdown if available)
- Prices dropped by the regex guard (count)
- Any errors or odd behavior

Plus:
- Verdict: did Phase 2 alone reach ≥30% priced?
- Is Phase 3 (Google/Gemini fallback) still needed?
- Confirmation that only `mvs-discover-providers/index.ts` was modified.

## Risks

- Each forceFresh run spends Firecrawl credits (cap = 50/run, typical ~15–30).
- One city may fail or hit the cap — I will still report partial numbers and continue with the others.

## Turns

- 1 turn to run the 3 pipelines + collect results + write the report.

## Hard stop

I will not start Phase 3 or Phase 4 after this. Waiting for your explicit approval.
