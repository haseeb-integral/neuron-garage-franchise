# Why the Boston run felt so long — plain English

## What actually happened (real timing from the database)

I checked the run record. Here are the real numbers for the last Boston pilot (run ID `76b57788`):

| Step | Time |
|---|---|
| Full pipeline (discover + classify + Tavily + ACS) | **2 minutes 39 seconds** |
| Just the Tavily part (10 providers) | **34 seconds** |
| Tavily credits used | 20 |
| Firecrawl calls in Tavily step | 1 |

So Tavily was **fast — 34 seconds for 10 providers**. That matches what you saw in the Tavily playground. Tavily is not the problem.

## Then why did it feel like 20 minutes?

The 20 minutes was **my fault, not Tavily's, and not the pipeline's**.

Here is the simple reason:

- The pipeline runs in the background. It returns a "run id" right away and keeps working.
- To know when it finished, I have to **poll** — meaning I ask the database "is it done yet?" every few seconds.
- I set the poll to "check every 30 seconds, up to 30 times" = **up to 15 minutes of waiting**, even if the real job finished in 2 minutes.
- Worse, the way my poll loop was written, it kept waiting through its full schedule instead of stopping the moment the job finished. So you saw a long silent wait.

In short: **the work was done in ~2.5 minutes. My checking-on-it script was slow and dumb.**

## What I want to fix before we run again

This is a **plan-only message**. No code changes yet. Approve and I will do this in one small phase.

### Phase F1 — Fix the polling script (no pipeline changes)

1. Poll every **5 seconds** instead of 30.
2. **Stop the moment** status becomes `done`, `done_stale`, `failed`, or `failed_no_data`. Do not keep waiting.
3. Cap total wait at **5 minutes** (a real run is ~2–3 min). If it goes past 5 min, stop and show what the database has so far, so you are never left waiting blindly.
4. Print a short progress line every check (e.g. "still running… 45s elapsed") so you can see life signs.

### What will NOT change

- No edits to `mvs-discover-providers` (Tavily code stays as-is).
- No edits to `mvs-run-pipeline`.
- No database changes.
- No new secrets.
- Pilot still gated to Boston only.

### Risk

Almost none. This is only the way I watch the run, not the run itself.

## After F1 is approved

Re-run the Boston pilot. You should see the result in about **3 minutes max**, with progress messages, not a 20-minute silence.

If you also want, I can add one more small thing later:

- **Phase F2 (optional)**: have the pipeline write a `tavily_pilot.progress` field every few seconds (`"searching 3 of 10"`, `"scraping 2 of 10"`) so the UI and my poll loop can show live progress instead of just "running". Say the word if you want this; otherwise skip.

## Bottom line

- Tavily was fast (34s for 10 providers). ✅
- The full backend job was ~2.5 min. ✅
- The 20 min wait was my polling script being too patient. ❌ — I will fix that in Phase F1.

Approve **F1** and I will fix it, then we re-run Boston cleanly.
