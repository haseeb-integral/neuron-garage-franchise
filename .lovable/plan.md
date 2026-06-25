## Phase 3 — Smoke test the Firecrawl fallback (I run it)

Yes, I can smoke test it myself before you click anything. Here is the plan.

### What I will test
1. **Happy path still works** — a normal run for a small city still ends as `done` (not `done_stale`), so the fallback code did not break the success path.
2. **Soft-fail path** — force a Firecrawl failure for a city that already has recent saved data (≤ 60 days). Expected: run ends as `done_stale`, `fallback_data_date` is set, UI shows the amber "Using saved data from {date}" banner, score stays visible.
3. **Hard-fail path** — force a Firecrawl failure for a city with no saved data (or data > 60 days). Expected: run ends as `failed_no_data`, UI shows red "Needs review" banner, no fake score shown.
4. **Database check** — read `mvs_pipeline_runs` rows for the test city to confirm `status`, `fallback_reason`, and `fallback_data_date` are written correctly.
5. **UI check** — open the Market Validation page in a headless browser (Playwright), restore your session, pick the test city, and screenshot the banners for each case.

### How I will force the failure
Temporarily point the Firecrawl call to a bad URL or inject a thrown error inside `mvs-run-pipeline` behind a `?test_fail=1` query flag, run the pipeline, then remove the flag. No real Firecrawl credits burned for the fail cases.

### What I will NOT do
- Will not change scoring math.
- Will not touch other cities' data.
- Will not leave any test flag in the code after the smoke test.

### What you get back
A short report: 3 cases × (status in DB, banner screenshot, pass/fail), plus confirmation the test flag was removed.

### Turns
1 turn to add the test flag + run all 3 cases + capture screenshots + remove the flag.

Approve and I will run it.
