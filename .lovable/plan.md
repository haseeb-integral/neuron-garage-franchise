
# Feature 1A — Market Validation Engine v1.0 Build Plan

**Source of truth:** the spec doc agreed in this chat (Sawyer-only, no Apify until v1.1, MVS naming, 6 sub-scores per methodology, Market Balance inside composite at 15%, manual trigger, 7 Tier A cities + Austin calibration). All 5 open questions answered **yes**.

## Operating rules for every turn

- **Atomic & reversible.** One concern per turn. Each turn lists what to revert if rejected.
- **No impact on other features.** New tables namespaced `mvs_*`. New edge functions prefixed `mvs-`. No edits to City Search, Teacher Search, Site Analysis, Candidate Pipeline, SmartLead, or shared `us_cities_scored`.
- **Demo path stays alive.** `phase2DemoData.ts` is not deleted or rewritten until Phase 5. A feature flag (`mvs_data_source` per city: `sample | live`) gates which path renders.
- **One calibrated number everywhere.** All MVS / sub-score math lives in **one helper** (`src/lib/mvs/computeMvs.ts`). Table row, detail panel, compare modal, PDF — all read from it.
- **Each phase ends with a human-test checkpoint.** Brett or Haseeb signs off before the next phase opens.
- **Kill switch.** A single env flag `MVS_PIPELINE_ENABLED` (default off) gates every edge function. Flip off → all runs reject immediately, UI falls back to sample data.

---

## Phase 0 — Safety rails (1 turn)

**Turn 0.1 — Feature flag + kill switch + memory update**
- Add `mvs_data_source` column on whatever city container the shortlist uses (or a tiny `mvs_city_flags` table — preferred, zero risk to existing tables). Default `sample` for all.
- Add `MVS_PIPELINE_ENABLED` secret (default `false`).
- Update `mem://index.md` Core: lock the v1.0 spec decisions (Sawyer only, MVS naming, 6 sub-scores, Market Balance inside).
- **Gate:** flag flips on a single test row, UI unchanged.
- **Unwind:** drop the new table; remove the secret. No code path depends on it yet.

---

## Phase 1 — Database schema (1 turn)

**Turn 1.1 — Migration: create 6 `mvs_*` tables + seed operator watchlist**
- Tables: `mvs_providers`, `mvs_weeks`, `mvs_qa_queue`, `mvs_operator_watchlist`, `mvs_city_overlap_overrides`, `mvs_pipeline_runs`. All with standard `id / created_at / updated_at`, RLS enabled, `GRANT`s for `authenticated` + `service_role`, manager-only write policies.
- Seed `mvs_operator_watchlist` with the 15 operators + default overlap (direct/adjacent/distant per the methodology defaults).
- Storage bucket `mvs-screenshots` (private), RLS for read by authenticated.
- **Human-test gate (end of Phase 1):** Brett or Haseeb opens the Backend tab, confirms 6 tables exist, watchlist has 15 rows, bucket exists. No UI change.
- **Unwind:** single down-migration drops the 6 tables and the bucket. Nothing else depends on them.

---

## Phase 2 — Provider discovery (Sawyer only) (2 turns)

**Turn 2.1 — Edge function `mvs-discover-providers` (Austin only)**
- Firecrawl scrape of `sawyertools.com/camps?location=Austin` with JS wait + screenshot. Gemini Flash extracts provider rows into strict JSON. Writes to `mvs_providers` with `platform='sawyer'`, screenshot URL stored.
- Hardcoded to Austin for this turn. No UI surface yet — invoked via `supabase functions invoke` for testing.
- **Gate:** ≥10 Austin provider rows, screenshot visible in Storage.
- **Unwind:** delete the function; `DELETE FROM mvs_providers WHERE city='Austin'`.

**Turn 2.2 — Edge function `mvs-classify-tier`**
- Gemini Flash tags each `mvs_providers` row Premium / Mid / Budget / Community using the methodology's $400 / category / not-childcare rule. Writes `tier` + `category_classified` back.
- Spot-check: Galileo + iD Tech if present must be Premium; any YMCA / parks-and-rec must not be Premium.
- **Human-test gate (end of Phase 2):** Brett/Haseeb reviews Austin rows in the Backend tab — provider names look real, prices populated, tier classifications spot-check correctly.
- **Unwind:** `UPDATE mvs_providers SET tier=NULL, category_classified=NULL WHERE city='Austin'` and remove the function.

---

## Phase 3 — Registration page extraction (2 turns)

**Turn 3.1 — Edge function `mvs-extract-weeks` (1 provider end-to-end)**
- Pick one Austin Premium provider with a clean Sawyer listing. Firecrawl fetch + screenshot, Gemini extracts the strict-JSON week schema (status enum of 5, status_evidence, confidence). Confidence ≥0.7 → `mvs_weeks`; <0.7 → `mvs_weeks` + `mvs_qa_queue`.
- **Gate:** week rows appear, status_evidence reads like a real visual cue (`"Red SOLD OUT badge"`), screenshot in Storage.
- **Unwind:** delete function; `DELETE FROM mvs_weeks WHERE provider_id=<that one>`.

**Turn 3.2 — Loop `mvs-extract-weeks` across all Austin Premium providers + low-confidence city badge logic**
- Iterate all Austin Premium providers. Compute "% with no public registration page" — if >20%, mark Austin with `low_confidence_badge=true` on `mvs_city_flags`.
- **Human-test gate (end of Phase 3):** Brett/Haseeb spot-checks 3 provider pages against extracted week rows. Screenshots present. QA queue has expected low-confidence weeks.
- **Unwind:** `DELETE FROM mvs_weeks WHERE city='Austin'` and reset flag.

---

## Phase 4 — Score helper + admin preview (2 turns)

**Turn 4.1 — Pure `computeMvs.ts` helper + unit tests**
- New file `src/lib/mvs/computeMvs.ts` plus `__tests__/computeMvs.test.ts`.
- Implements all 6 sub-scores with the methodology's fixed reference ranges (no DB writes — pure function over `{ providers[], weeks[], acs }`). Returns `{ mvs, scores: {...}, inputs: {...}, normalizationVersion }`.
- Year 1 Market Absorption = Sellout Rate only carries full weight; Time-to-Sellout + YoY return `null` with a `"year_2_signal"` flag.
- Vitest covers: simple known-input cases per score; weight sum; cap at 0/100; null-handling.
- **Gate:** all tests green. No UI change.
- **Unwind:** delete the two new files. Zero blast radius.

**Turn 4.2 — Admin-only preview page `/mvs-preview` (read-only)**
- New route, manager-only. Pulls Austin's live `mvs_providers` + `mvs_weeks` + ACS, runs `computeMvs`, renders a single read-only card showing MVS + 6 sub-scores side-by-side with the current demo Austin numbers.
- Existing demo shortlist UI untouched.
- **Human-test gate (end of Phase 4):** Brett/Haseeb opens `/mvs-preview`, sees real Austin MVS, sanity-checks the spread vs the demo number.
- **Unwind:** delete the route file + nav entry.

---

## Phase 5 — UI cutover (Austin only) + Run Pipeline button (2 turns)

**Turn 5.1 — Wire shortlist row + city detail panel to live data when `mvs_data_source='live'`**
- `src/components/phase2-demo/ShortlistTable.tsx` reads `mvs_data_source` per city; if `live`, the row, detail panel, sub-score cards, Show Formula drawers, and premium-provider table all read from `mvs_providers` / `mvs_weeks` / `computeMvs`. Otherwise, untouched demo path.
- Flip Austin only: `UPDATE mvs_city_flags SET mvs_data_source='live' WHERE city='Austin'`.
- "Sample Data" badge replaced with "Live" (+ "Low Confidence" if flagged) on Austin only.
- **Gate:** Austin row shows live MVS; 6 other Tier B-shaped cities still show demo. Slider drag recomputes live Austin via the same helper.
- **Unwind:** `UPDATE mvs_city_flags SET mvs_data_source='sample' WHERE city='Austin'`. Single SQL statement.

**Turn 5.2 — Admin-only "Run Pipeline" button + `mvs_pipeline_runs` status surface**
- Button on the Austin city detail panel (manager role only via `has_role`). Calls a new orchestrator edge function `mvs-run-pipeline` that runs discover → classify → extract sequentially and writes a row to `mvs_pipeline_runs` with status (`queued/running/done/failed`).
- Disabled while a run is in flight. Toast on completion. Cost ceiling: hard cap of N Firecrawl calls per run (configurable, default 30).
- **Human-test gate (end of Phase 5):** Brett or Haseeb clicks Run Pipeline on Austin — pipeline completes, fresh numbers appear, every score traces to a stored screenshot.
- **Unwind:** delete the button, the orchestrator function, and the run-status table contents. Underlying data tables keep working in read-only mode.

---

## Phase 6 — PDF Market Brief (2 turns)

**Turn 6.1 — Edge function `mvs-generate-brief` rendering 12 SOW sections**
- Server-side render (HTML → PDF). Pulls live data, runs `computeMvs`, generates: Exec Summary, MVS, Market Balance, Pricing, Diversity, Operator, Depth, Strengths, Risks, SWOT, Recommendation, Sources & Screenshots appendix. Returns PDF blob.
- **Gate:** PDF generates for Austin in <30s; every numeric claim links to a source URL or stored screenshot.
- **Unwind:** delete the function. UI button (Turn 6.2) hides automatically when function 404s.

**Turn 6.2 — "Download Market Brief (PDF)" button on Austin detail panel**
- Visible only when `mvs_data_source='live'`. Streams the PDF.
- **Human-test gate (end of Phase 6):** Brett/Haseeb downloads the Austin PDF, eyeballs the 12 sections, confirms the sources/screenshots appendix is real.
- **Unwind:** remove the button.

---

## Phase 7 — Tier A rollout + calibration (1 turn)

**Turn 7.1 — Run pipeline for the 7 Tier A cities + calibration check**
- Click Run Pipeline for NYC, Houston, Chicago, Boston, San Antonio, Philadelphia, LA (in sequence, not parallel — keeps cost predictable and isolates failures). Flip each city's `mvs_data_source` to `live` only after its run reports `done`.
- **Calibration gate:** Boston MA must land in the top quartile of the 8-city live set (Austin + 7 Tier A). If not, halt; do not advertise the feature to the client meeting until weights are reviewed.
- Tier B cities (14) untouched — stay on Sample Data badge until v1.1.
- **Human-test gate (end of Phase 7):** Brett/Haseeb walks the full UI — table row → detail panel → Show Formula drawer → PDF — for at least 2 Tier A cities. Confirms slider change updates the composite on every surface (Brett's rule).
- **Unwind per city:** `UPDATE mvs_city_flags SET mvs_data_source='sample' WHERE city=<x>`. Per-city, reversible in one statement.

---

## What's intentionally excluded from v1.0 (confirmed)

ActivityHero, Apify Google Maps, Inngest/Trigger.dev scheduling, Time-to-Sellout, YoY Velocity, Scaled Operator "Years in City", moving Market Balance outside the composite, Tier B pipeline runs, across-shortlist normalization, Phase 2 work on 1B/1.5/SmartLead/etc.

## Risk summary

| Risk | Mitigation |
| :-- | :-- |
| Pipeline cost overrun | Hard cap per run; kill switch secret; sequential city runs in Phase 7 |
| Bad Gemini extraction pollutes scores | Confidence <0.7 → QA queue; helper handles nulls gracefully |
| UI cutover breaks demo for other cities | `mvs_data_source` flag is per-city; demo path is the default branch |
| Schema mistake forces painful redo | Phase 1 ships schema before any data flows; only data tables, no shared-table edits |
| Collision with other features | `mvs_*` prefix; no edits outside `src/components/phase2-demo`, `src/pages/MarketValidation*`, `src/lib/mvs/`, `supabase/functions/mvs-*` |
| Score drift between surfaces | Single `computeMvs` helper; no stored composites in `mvs_*` tables |

## Things I need from you before Turn 0.1

1. **Cost ceiling per pipeline run** — proposed default: 30 Firecrawl calls per city (1 search + ~25 listings + headroom). OK to lock this number, or pick another?
2. **Manager-only Run Pipeline** is fine, confirmed — but should the QA Queue be manager-only too, or visible to all signed-in users (read-only)?
3. Anything you want to defer from Phase 6 (PDF) into v1.1 if Phases 0–5 eat the runway?

Answer those three and I'll start Turn 0.1.
