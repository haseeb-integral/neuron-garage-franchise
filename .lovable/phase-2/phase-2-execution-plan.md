# Phase 2 — Execution Plan (Lovable)

> **Companion to:** `phase-2-sow.md` (the contract). This file is the build plan.
> **Updated:** 2026-05-30
> **Status:** drafted from sources; not yet locked. Build does not start until the SOW is locked by Brett.
> **Timeline:** 4 weeks build + 2 weeks grace, **starting only after SOW lock**.
> **Cardinal rule (Brett):** one calibrated number everywhere. Pillar + composite scores read from the same recomputed helper on every surface — never from stale DB-stored values.

## How this file is different from the SOW

| | `phase-2-sow.md` | `phase-2-execution-plan.md` (this file) |
|---|---|---|
| Audience | Brett, Sam, anyone signing off scope | Me (Lovable) in any future session |
| Stable? | Frozen once locked; only changes when scope changes | Living; updated as work progresses |
| Content | What + why | How + in what order + by whom + with what files |

---

# Week-by-week sequencing (target)

Assumes SOW lock = Day 0. Items 3, 5, 6, 7, 8, 9 currently lack the spec needed to enter the build queue — they sit as `blocked` until Brett fills them in.

| Week | Architecture/spec work | Build (Lovable) | Build (Manus) |
|------|------------------------|-----------------|---------------|
| W1 | Final SOW lock; isochrone vendor decision (Mapbox vs HERE); confirm Inngest vs Trigger.dev; lock JSON schema for absorption extraction | Scaffold human-QA queue UI shell; scaffold Feature 1B input form & comparison shell; refactor scoring helpers so pillar + composite share one source of truth | Stand up Market Absorption pipeline (Apify → Firecrawl → Gemini Flash → Supabase) end-to-end on a 3-city pilot |
| W2 | Spec items 3–9 with Brett (parallel to W2 build) | Wire Feature 1A scores into city detail surface (sliders + Show Formula); Feature 1B sub-score calc + display; Item 3 "Notes & Activity" tab redesign | Expand absorption pipeline to full 25-city shortlist; populate scaled-operator tagging |
| W3 | — | Branded PDF generator for Feature 1A (12-section report) + Feature 1B (10-section per-site report); isochrone map rendering in 1B PDF | Populate Year-1 single mid-March scrape across shortlist; first low-confidence rows landed in human-QA queue |
| W4 | — | LeafSpring vs Trinity validation test (Feature 1B calibration gate); external proxy scoring (Bay Area, Seattle Eastside, North Dallas, NoVA, Boston) for Feature 1A directional check; ship items 1 + 2 | Final Year-1 absorption pass; hand off refined dataset for in-app display |
| W5–W6 (grace) | — | Items 3 + 4 + any of 5/6/7 that have specs by then; bug triage from Brett + Sam review | Iterate on absorption signal extractors for failure-mode handling |

Items 8 (Video Training) and 9 (4th Manus app — CSI) likely slip past the 6-week window unless their specs land in W1.

---

# Cross-cutting decisions (resolve in W1)

| Decision | Default if Brett doesn't pick | Why |
|---|---|---|
| Isochrone vendor | **Mapbox** | Already common, cheap, good DX, isochrone API is mature. HERE is a fine fallback. |
| Background scheduler | **Inngest** | Simpler DX than Trigger.dev for the absorption cadence; cost similar. |
| PDF generator stack | **React-PDF (`@react-pdf/renderer`) on a Supabase Edge Function** | Keeps brand styling close to the React design system. Alternative: Puppeteer + HTML template. |
| Human-QA queue location in the app | **New sub-page under City Scoring** (e.g. `/city-scoring/qa-queue`) | Reuses existing City Scoring auth + nav; visible only to internal roles. |
| Candidate-facing auth (Item 4) | **Lovable Cloud auth, separate user role + RLS scope** — no second project | Cheapest, keeps everything in one Supabase. |
| Scoring helper | **`src/lib/recomputedPillars.ts` is the single source of truth** for pillar + composite scores. Every surface imports from there. | Brett's "one calibrated number everywhere" rule. |

---

# Per-item ticket breakdown

## Item 1 — Market Validation Engine (Feature 1A) — REAL TICKETS

Items in build order. Each ticket should produce a self-contained, testable surface.

### 1A-MANUS-1 — Stand up Market Absorption pipeline (Manus)
- Owner: Manus
- Scope: 5-stage pipeline (Apify discovery → Firecrawl reg-page identification → Gemini Flash extraction → confidence gating → aggregation), writing into Supabase Postgres + Storage.
- Acceptance: Mid-March 2026 scrape completes for 3 pilot cities; week-level rows with `status_evidence` and `confidence` land in DB; raw HTML + screenshot in Storage.

### 1A-LOV-1 — Human-QA queue UI
- Owner: Lovable
- Files likely touched: new `src/pages/CityScoringQaQueue.tsx`, new `src/components/city-scoring/QaQueueRow.tsx`, new edge function for save-correction.
- Scope: List low-confidence (< 0.7) weeks with page screenshot inline, LLM-extracted status, four-button correction (sold_out / waitlist / open / unknown), submit propagates back to score recompute.
- Acceptance: Internal user can correct 10 sample rows in under 5 minutes; corrections propagate to Market Absorption Score on save.

### 1A-LOV-2 — Sub-score calc + display, all 6 sub-scores
- Owner: Lovable
- Files likely touched: extend `src/lib/recomputedPillars.ts` to include the six 1A sub-scores; add Show Formula drawers on city detail; sliders for weights.
- Acceptance: Composite formula renders correctly with `+` signs intact; sliders re-weight live; pillar + composite values match `recomputedPillars.ts` on table cell, popover, selected-market panel, compare modal, and export.

### 1A-LOV-3 — Scaled Operator two-number display
- Owner: Lovable
- Scope: Operator Validation count + Direct Competitor Load per 10k kids; National Operator Watchlist editable in slider UI.
- Acceptance: Both numbers shown side-by-side with the diagnostic note ("validated but not crowded" vs "saturated").

### 1A-LOV-4 — Branded PDF report (12 sections)
- Owner: Lovable
- Files likely touched: new `supabase/functions/generate-1a-report/`, brand styling in `src/lib/cityScoringExport.ts`.
- Acceptance: PDF generates in < 30s; contains all 12 sections from SOW; includes evidence URL index in the Methodology Appendix; sellout curve chart present when data available, gracefully degrades when not.

### 1A-VAL-1 — Validation pass on LeafSpring + external proxies
- Owner: Lovable + Brett review
- Acceptance: LeafSpring scores in bottom quartile of internal anchors. Bay Area suburbs, Seattle Eastside, North Dallas, NoVA, Boston metro land in top quartile of the 25-city shortlist. If not, weights are re-tuned before sign-off.

## Item 2 — Site Analysis Engine (Feature 1B) — REAL TICKETS

### 1B-LOV-1 — Site input form
- Owner: Lovable
- Files likely touched: new `src/pages/SiteAnalysis.tsx`, route in `src/App.tsx`.
- Scope: required School Name + Address; optional School Type + Enrollment; submit triggers score computation.
- Acceptance: Score returns in < 10s of submit on a real address.

### 1B-LOV-2 — Score computation + isochrone integration
- Owner: Lovable (Manus may pre-bake isochrones for known sites)
- Files likely touched: new `src/lib/siteScoring.ts`, new edge function `supabase/functions/site-analysis/`.
- Scope: Mapbox (or HERE) isochrone API at 10-min + 15-min; Census ACS pull within each isochrone; NCES school count within 15-min; all 5 sub-scores per SOW formula; composite Site Opportunity Score.
- Acceptance: All sub-scores computed deterministically from inputs; same inputs always produce same score.

### 1B-LOV-3 — Compare-up-to-4-sites UI
- Owner: Lovable
- Scope: Side-by-side display of up to 4 candidate sites, each with sub-scores + composite + verdict.
- Acceptance: 4 sites render readably on a 1280px-wide screen; sortable by any sub-score.

### 1B-LOV-4 — Branded per-site PDF (10 sections, isochrone maps)
- Owner: Lovable
- Files likely touched: new `supabase/functions/generate-1b-report/`.
- Acceptance: PDF generates in < 20s; isochrone maps render with shaded 10-min and 15-min polygons; all 10 sections present.

### 1B-VAL-1 — LeafSpring vs Trinity calibration gate
- Owner: Lovable + Brett review
- Scope: Score both sites through Feature 1B.
- Acceptance: **LeafSpring scores materially lower than Trinity.** If not, weights are reworked before broad rollout. This is the single most important calibration test in Phase 2.

## Item 3 — Candidate Pipeline 1.5 — ONE REAL TICKET, REST BLOCKED

### 3-LOV-1 — Replace "Notes & Activity" tab with Google-Form-driven version
- Owner: Lovable
- Files likely touched: `src/components/candidate-pipeline/` (new tab component), `src/pages/CandidatePipeline.tsx`, Supabase migration for the new activity table.
- Scope: Brett demos a Google Form; Lovable rebuilds it as a structured form inside the candidate detail's Notes & Activity tab; submissions persist to a new `candidate_activity` table with RLS.
- Acceptance: Form matches Brett's Google Form 1:1; submissions are visible chronologically; form can be edited by internal roles only.

### 3-LOV-2…N — `blocked: awaiting Brett spec` (smarter scoring inputs, cleaner stage gates beyond current Qualification tab behavior).

## Item 4 — Candidate-facing form & page — ARCHITECTURE TICKET ONLY

### 4-ARCH-1 — Auth model decision + scaffold
- Owner: Lovable + Brett
- Scope: Confirm separate Lovable Cloud user role for candidates; RLS scopes them to their own rows only; new route segment (e.g. `/apply/*`) gated by candidate role; sign-up flow.
- Acceptance: Brett signs off on the auth model. Then build tickets follow.

### 4-LOV-1…N — `blocked: awaiting Brett spec` for form fields, validation, candidate journey.

## Items 5, 6, 7, 8, 9 — `blocked: awaiting Brett spec`

No execution tickets yet. Each item's SOW section says **TBD — Brett to fill**. Once filled, tickets get drafted here and these items enter the W2+ build queue.

---

# Files & components touched (predicted)

This is what I expect to add/modify based on the SOW. Living list.

```
NEW (Lovable):
  src/pages/CityScoringQaQueue.tsx                  # 1A-LOV-1
  src/components/city-scoring/QaQueueRow.tsx        # 1A-LOV-1
  src/pages/SiteAnalysis.tsx                        # 1B-LOV-1
  src/lib/siteScoring.ts                            # 1B-LOV-2
  src/components/candidate-pipeline/NotesActivityForm.tsx # 3-LOV-1
  supabase/functions/site-analysis/index.ts         # 1B-LOV-2
  supabase/functions/generate-1a-report/index.ts    # 1A-LOV-4
  supabase/functions/generate-1b-report/index.ts    # 1B-LOV-4

MODIFY (Lovable):
  src/lib/recomputedPillars.ts                      # extend with 1A sub-scores (1A-LOV-2)
  src/lib/cityScoringExport.ts                      # brand styling for 1A PDF
  src/pages/CityScoring.tsx                         # surface 1A scores, sliders, formula drawers
  src/pages/CandidatePipeline.tsx                   # mount new Notes & Activity tab
  src/App.tsx                                       # routes for Site Analysis + QA Queue + /apply/*

NEW migrations (Lovable Cloud / Supabase):
  candidate_activity table (+ RLS, GRANTs)
  candidate role + auth changes for /apply/* (Item 4)
  market_absorption_weeks table (or alignment with Manus schema) — TBD with Manus
```

---

# Risks & open questions

| Risk | Mitigation |
|---|---|
| Firecrawl rate limits or bot detection on Sawyer / CampMinder | Use Firecrawl's JS render wait + rotating proxies; chronic offenders fall back to manual screenshot in QA queue |
| Gemini Flash extraction confidence routinely < 0.7 on small camp sites | Tune prompt with verified `status_evidence` examples; cap human-QA volume at 1–2 hrs/cycle/shortlist |
| Mapbox isochrone cost spikes if we run 1B on hundreds of sites | 1B is Tier 3 — on-demand only; add a cost meter that warns at 100 sites/month |
| Census ACS gaps in small Telluride-class markets | Acceptable per SOW (Telluride is a positive anchor); document low-confidence badge per city |
| `recomputedPillars.ts` drifts and pages start showing different scores | Pre-build assertion: every Phase 2 component that displays a pillar/composite imports from `recomputedPillars.ts`. Add a lint rule or runtime check. |
| Manus pipeline data shape changes mid-build | Lock the JSON schema (the strict extraction schema in 1A) in W1 and version it. |
| Items 3–9 specs never land, Phase 2 ships items 1+2 only | Tell Brett early. Item 1+2 alone is a useful release. |

---

# What "done" looks like for Phase 2

- Items 1 + 2 live, both PDF reports generating cleanly, validation gates passed (LeafSpring < Trinity; external proxies in top quartile).
- Item 3 "Notes & Activity" tab replaced.
- Item 4 candidate-facing scaffold + auth model live, even if form fields are TBD.
- Items 5–9 either shipped (if specs landed in W2) or carried into Phase 2.5 with their specs.
- `phase-2-status.md` reflects reality; `CHANGELOG.md` has one line per edit; this execution plan archived for reference.
