You are right. Denver did run again. The old fix was not safe enough.

## What I found

The Run button was still able to start a fresh crawl even when Denver had a successful run today.

The real issue is this:

- The saved-data check was only a front-end check.
- The backend pipeline still accepts a normal Run request and starts a crawl.
- If the front-end check is missed, delayed, old code is still loaded, or the lookup fails, the crawl can still start.
- That means the app was not protected end to end.

So yes: the plan was not fully protected. It needed a backend safety check too.

## Fix plan

### Phase 1 — Add a hard backend guard

**Change:** Update the `mvs-run-pipeline` backend function.

Before it creates a new run or calls Firecrawl, it will check `mvs_pipeline_runs`.

Rules:

- If the city has good saved data from 0–30 days ago, do not crawl.
- Return a clear response: `Using saved data. Fresh crawl skipped.`
- Do not create a new `running` row.
- Do not call Firecrawl.
- If the user clicks `Force fresh`, allow the crawl.

**Affected:**

- Backend function: `mvs-run-pipeline`
- Table read only: `mvs_pipeline_runs`
- No scoring math change
- No saved data structure change
- No database schema change

**Why this fixes the real problem:**

Even if the UI fails, the backend will block the extra crawl.

### Phase 2 — Make all Run buttons send the right intent

**Change:** Update normal Run and Force fresh.

- Normal `Run` sends `forceFresh: false` or no force flag.
- `Force fresh` sends `forceFresh: true`.

**Affected pages/components:**

- City Scoring Console page
- Market Validation deep-dive Run button
- Any refresh-all helper that calls the same pipeline

**Why:**

This makes the meaning clear:

- `Run` = use saved data when recent.
- `Force fresh` = crawl again on purpose.

### Phase 3 — Make the UI fail safe

**Change:** If the page cannot check saved data for any reason, it must not start a crawl by default.

It should show a message like:

`Could not confirm saved data age. Use Force fresh if you still want to crawl.`

**Why:**

A lookup problem should not spend Firecrawl credits.

### Phase 4 — Smoke test end to end

I will test Denver specifically.

Expected result after fix:

1. Click normal `Run` for Denver.
2. No new `running` row appears.
3. No Firecrawl call starts.
4. User sees a saved-data message.
5. Click `Force fresh`.
6. A new run starts only then.

I will also check the database rows before and after to prove the normal Run did not create a new crawl.

## Risk

The only risk is blocking a real needed crawl by mistake.

That is why the `Force fresh` button stays available.

## Turns needed

This should take 1 build turn.