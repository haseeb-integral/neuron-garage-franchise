## Combined plan — Phase A (toast bug) + Phase B (classify timeout)

---

### Phase A — Stop the false red toast on every city click (frontend only)

**What is wrong (simple):** When you click a city row, the small "Run Pipeline" card under the table loads that city's last saved run. If that run is `failed` (most are), it pops a red toast — even though no new run happened. The guard that should silence this only works for the **first** city you ever look at, not for later city changes.

**Fix:** In `src/components/phase2-demo/RunPipelineButton.tsx`, when the `city` prop changes, reset three things so the guard works again per city:
- `latest` → `null`
- `lastTerminalId` → `null`
- `initialSeededRef.current` → `false`

Then `fetchLatest` runs for the new city, sees the row is already terminal, and seeds the guard so **no toast fires**.

**Files touched:** 1 file (`RunPipelineButton.tsx`). No backend, no DB, no schema.

**Risk:** very low.

**Turns:** 1.

---

### Phase B — Fix the real 504 timeout in the "classify" step (backend)

**What is wrong (simple):** The orchestrator (`mvs-run-pipeline`) calls the `mvs-classify-tier` function over HTTP and waits for it to finish. Classify loads every provider for the city (e.g. San Antonio has 205 providers), splits them into batches of 20, and calls the Gemini AI **one batch at a time, sequentially**. Each batch takes ~10–15 seconds, so 10+ batches add up to over 150 seconds. The server cuts the connection with **HTTP 504 — idle timeout (150s) reached**, and the whole pipeline run is marked `failed`.

**Root cause in one line:** sequential AI calls inside one HTTP request that has a 150-second wall-clock limit.

**Fix (smallest safe change that actually works):** Run the batches **in parallel** inside `mvs-classify-tier`. Each batch is an independent AI call — there is no order dependency, and they all write to different provider rows. With a small concurrency cap (e.g. 5 batches at a time) we get a ~5× speed-up without overloading the AI gateway. 205 providers / 20 per batch = ~11 batches; at 5 in parallel, total wall time drops to roughly **~30–35 seconds**, well under the 150s limit.

**Steps in `supabase/functions/mvs-classify-tier/index.ts`:**
1. Extract the existing per-batch logic (AI call + per-row write-back) into a helper `async function processBatch(batch)`.
2. Replace the `for` loop with a small concurrency runner: keep at most `MAX_CONCURRENCY = 5` batches in flight using `Promise.all` over chunks of 5.
3. Aggregate `classifiedCount`, `errors`, and `sample` from all batches (use atomic appends — they don't conflict).
4. Keep the same response shape so the orchestrator and any caller still work.
5. No DB change. No new table. No schema migration.

**Safety guards added:**
- Hard cap concurrency at 5 — prevents Gemini rate-limit storms.
- Per-batch try/catch already exists; one failing batch does not kill the others.
- If even the parallel run somehow approaches the timeout, the orchestrator's existing "stale run >3 min" auto-clear still protects the UI.

**Files touched:** 1 file (`supabase/functions/mvs-classify-tier/index.ts`). Auto-deploys.

**What is NOT changed:**
- No change to `mvs-run-pipeline` flow.
- No change to the classify prompt, tier rules, or deterministic overlay.
- No change to any DB table, RLS, or score.
- No change to the retired weeks/extract step.

**Risk:** low–medium. The only realistic risk is hitting an AI rate limit during a very large city; the concurrency cap of 5 is the safety belt. If it ever does cap out, the existing error-collection path already records it and the pipeline still finishes the batches that succeeded.

**Turns:** 1.

---

### Order of work

1. **Turn 1 — Phase A.** Touch `RunPipelineButton.tsx`. Reload preview. Click each city row → no red toast. The small "Last run: failed" text still shows correctly.
2. **Turn 2 — Phase B.** Touch `mvs-classify-tier/index.ts`. Wait for deploy. Press **Run Pipeline** on San Antonio (the city in the screenshot). The pipeline should complete in roughly 30–60 seconds and finish with status `done`, not `failed`. The success toast should appear once. No more 504.

---

### What you should test after both phases

- Click 5+ different city rows — **no red toast** appears anywhere.
- Small status card under "Run Pipeline" still shows the correct last-run summary for each city.
- Press **Run Pipeline** on **San Antonio** (largest list). It should finish in under 90 seconds with a green success toast. The "Last run" line flips to **done**.
- Scores in the shortlist table refresh and stay the same numbers as before (we only fixed the run plumbing, not the scoring math).

---

Approve and I will start with Phase A first, then move to Phase B in the next turn.