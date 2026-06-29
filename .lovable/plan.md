# Re-run Phase 4.2: Boston Tavily Pilot

The new `TAVILY_API_KEY` is now saved. Phase 4.1 code is already deployed. This is purely an execution turn — no code changes.

## What I will do

1. Trigger `mvs-run-pipeline` for `Boston, MA` with `forceFresh: true` and `tavilyPilot: true`.
2. Poll `mvs_pipeline_runs` until status is `succeeded` or `failed` (timeout ~15 min).
3. Read `source_counts.discover.tavily_pilot` audit data.

## What I will report

- Before vs after % providers priced for Boston
- Tavily calls used, Firecrawl scrape calls used
- How many providers got a new price from Tavily pilot
- Any errors (401, timeouts, guard drops)

## What will NOT change

- No code edits
- No DB schema changes
- Pilot stays gated to Boston only
- Other cities untouched

## Risk

If the run hangs again past ~15 min, I will stop polling and report the partial state from `mvs_pipeline_runs` so you can decide next step.
