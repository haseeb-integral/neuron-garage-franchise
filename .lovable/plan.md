
# Feature 1A v1.0 — Finish Plan

7 atomic turns to close the gap between what's built and what the spec + build plan promise. Each turn is reversible and ends with a checkpoint you can eyeball before we move on. Same operating rules as the original build plan: `mvs_*` namespace only, no edits to other features, demo path stays alive, one `computeMvs` helper everywhere.

---

## Turn 1 — Consolidate the 3 week-extractor functions

**Problem:** We currently have `mvs-extract-weeks`, `mvs-extract-weeks-all`, and `mvs-extract-weeks-austin-all`. The spec calls for one. This is what caused the "wrong edge function" error you hit.

**Do:**
- Make `mvs-extract-weeks` accept `{ city, state }` and loop all Premium providers for that city internally (merge the `-all` logic in).
- Update `mvs-run-pipeline` to call only `mvs-extract-weeks`.
- Delete `mvs-extract-weeks-all` and `mvs-extract-weeks-austin-all` from disk and from Supabase.

**Checkpoint:** Run pipeline on Austin from the UI — completes end-to-end, no 404s, week rows land in `mvs_weeks`.

**Unwind:** Revert the file; redeploy the two deleted functions from git history.

---

## Turn 2 — Add Census ACS pull to the pipeline

**Problem:** Scores 3 (Scaled Operator) and 6 (Market Balance) need population denominators — "kids ages 5–12" and "affluent dual-income families ≥$150k." Today the orchestrator doesn't pull these, so both scores run on incomplete inputs.

**Do:**
- New edge function `mvs-acs-pull`: takes `{ city, state }`, calls the existing v1.0 ACS pipeline, writes results to a new tiny table `mvs_city_acs` (kids_5_12, affluent_dual_income_hh, pulled_at).
- `mvs-run-pipeline` calls it as Stage 4, between extract-weeks and completion.
- `computeMvs.ts` and `useLiveMvs.ts` read from `mvs_city_acs` and pass into scores 3 and 6.

**Checkpoint:** Re-run Austin; sub-score 3 and 6 inputs are non-null in the detail panel drawer.

**Unwind:** Drop `mvs_city_acs`, delete the function, revert helper changes.

---

## Turn 3 — QA Queue review page

**Problem:** Low-confidence weeks are already written to `mvs_qa_queue`, but there's no UI to review them.

**Do:**
- New route `/mvs-qa-queue`, manager-only via `has_role`.
- Table list of flagged rows; click opens side-by-side view: screenshot (from `mvs-screenshots` bucket) on the left, Gemini's guessed status + evidence on the right, dropdown to correct (5-value enum), Save writes `corrected_status` + `reviewed_by` + `reviewed_at` back and updates `mvs_weeks.status`.
- Sidebar nav entry under Market Validation, manager-only.

**Checkpoint:** A flagged Austin week is correctable; the row's status flips on Save and the MVS recomputes.

**Unwind:** Delete the page, the nav entry, and one rollback SQL to clear `corrected_status` values.

---

## Turn 4 — `mvs-generate-brief` edge function (PDF, server-side)

**Problem:** Spec promises a 12-section PDF Market Brief. Doesn't exist.

**Do:**
- New edge function `mvs-generate-brief`: input `{ city, state }`, pulls live `mvs_providers` + `mvs_weeks` + `mvs_city_acs`, runs the **same `computeMvs` helper** (ported to Deno or duplicated as a `_shared` file so server + client share one source of truth), renders HTML, converts to PDF, returns blob.
- 12 sections per spec §7: Exec Summary, MVS, Market Balance, Pricing, Diversity, Operator, Depth, Strengths, Risks, SWOT, Recommendation, Sources & Screenshots appendix (with signed URLs to bucket screenshots).
- Hard timeout: must complete in <30s.

**Checkpoint:** Call function via curl for Austin; PDF lands, every numeric claim has a source link or screenshot in the appendix.

**Unwind:** Delete the function; no UI depends on it yet.

---

## Turn 5 — "Download Market Brief" button + `/mvs-preview` sanity page

**Problem:** No way to trigger the PDF from the UI; no admin sanity-check surface (Phase 4.2 was skipped).

**Do:**
- Add **Download Market Brief (PDF)** button to the city detail panel on Market Validation, visible only when `mvs_data_source='live'`. Streams the PDF from Turn 4.
- New admin-only route `/mvs-preview`: read-only page that lists every city with live data and shows its live MVS + 6 sub-scores side-by-side with the demo number (where one exists). For spot-checking before flipping cities to Live.

**Checkpoint:** Manager clicks Download on Austin → PDF downloads. `/mvs-preview` shows Austin's live numbers next to demo.

**Unwind:** Remove the button + the route file.

---

## Turn 6 — Tier A rollout (run the 7 cities)

**Problem:** Only Austin is live. Spec requires NYC, Houston, Chicago, Boston, San Antonio, Philadelphia, LA all flipped to Live.

**Do:**
- Run `mvs-run-pipeline` sequentially (not parallel — keeps cost predictable) for the 7 cities from the City Scoring Console.
- After each `done`, flip `mvs_city_flags.mvs_data_source` to `live` for that city.
- Tier B cities stay on Sample Data badge — untouched.

**Checkpoint:** All 7 Tier A rows on Market Validation show Live badge with real MVS, real provider names, real screenshots.

**Unwind:** Per city: `UPDATE mvs_city_flags SET mvs_data_source='sample' WHERE city=<x>`.

---

## Turn 7 — Calibration check + "one number everywhere" verification

**Problem:** Spec defines 5 calibration gates that must pass before client meeting. We need to actually run them.

**Do:**
- **Gate 1:** Austin run — all 5 stages clean. (Confirmed in Turn 2.)
- **Gate 2:** Boston lands in top quartile of the 8-city live set (Austin + 7 Tier A). If not → halt, raise weights review with you and Brett, do not present to client.
- **Gate 3:** Every Tier A row has live MVS + 6 non-null sub-scores + real provider names + ≥1 stored screenshot per provider.
- **Gate 4:** PDF generates in <30s for all 8 cities (timed).
- **Gate 5 (Brett's rule):** Drag a weight slider — confirm the MVS updates on the table row, detail panel, compare modal, **and the PDF** (regenerated). All from the same helper.
- Write results into a short Markdown report inside the chat for sign-off.

**Checkpoint:** Brett or you signs off on all 5 gates. Feature 1A v1.0 = done.

**Unwind:** N/A — this turn is read-only verification.

---

## Technical notes

- **Shared compute helper for PDF:** to avoid duplicating `computeMvs` math in Deno, either (a) move it into `supabase/functions/_shared/computeMvs.ts` and re-export from `src/lib/mvs/computeMvs.ts`, or (b) have the client call a `/mvs-compute` edge function and pipe results to the PDF. Option (a) is preferred — single file, two import paths.
- **PDF rendering inside Deno:** use Puppeteer-via-Browserless OR React-PDF / `@react-pdf/renderer` running in Deno. Decision deferred to Turn 4 based on which works cleaner under the Supabase Edge runtime.
- **`mvs_city_acs` table (Turn 2):** city, state, kids_5_12 int, affluent_dual_income_hh int, pulled_at timestamptz. RLS: read for authenticated, write for service_role. Standard GRANTs.
- **No new shared-feature edits** — all changes stay inside `src/components/phase2-demo/`, `src/pages/MarketValidation*`, `src/pages/MVS*`, `src/lib/mvs/`, `supabase/functions/mvs-*`.

---

## Order of execution & approval

Turns are atomic and ordered for safety: cleanup first (Turn 1) so the pipeline stops misfiring, then data completeness (Turn 2), then human review tooling (Turn 3), then client deliverable (Turns 4–5), then rollout (Turn 6), then sign-off (Turn 7). I'll pause after each turn for your eyeball check before opening the next.
