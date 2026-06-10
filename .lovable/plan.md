# Phase 2 Demo Pages — Pre-Sam Audit & Polish Plan

Sources re-read: `summary-neuron-garage-module1-enhancements-v2.md` and `summary-transcript Sam meeting May 29.md` (PDF/txt summaries — exact formulas already encoded in `phase2DemoData.ts`).

## Audit Results

### Market Validation page

| # | Item | Status | Effort | Ship before Sam? |
|---|---|---|---|---|
| 1 | Sub-score formula weights in "Show formula" drawer (e.g., `0.40 × median + 0.40 × 75th pct + 0.20 × % at $500+`) | ✅ Already shipped — `SubScoreCard` renders `formula` string from `phase2DemoData.ts` for all 6 sub-scores | — | n/a |
| 2 | Low-confidence badge when extraction confidence < 0.7 (Sam's "human QA queue" gate) | ❌ Missing | Quick | **Yes** — core Sam principle |
| 3 | City selector to switch shortlisted cities | ❌ Missing | Quick (static dropdown, Frisco active, others disabled with "Demo" tooltip) | **Yes** — shows the page is shortlist-aware, not single-city |
| 4 | PDF export button (non-functional, "Coming Week 3" tooltip) | ❌ Missing | Quick | **Yes** — PDF report is the page's primary output per SOW |

### Site Analysis page

| # | Item | Status | Effort | Ship before Sam? |
|---|---|---|---|---|
| 5 | Sub-score formula weights in drawer | ⚠️ Partial — formulas exist in `phase2DemoData.ts` but `SiteCard` only shows the value bar, no "Show formula" toggle | Quick | **Yes** — parity with 1A |
| 6 | Grade alignment shown per school | ❌ Missing (data model has `grade_alignment_factor` in formula text only) | Quick | **Yes** — Sam called it out in School Profile |
| 7 | Dual-income HH % in Neighborhood Affluence breakdown | ❌ Missing from isochrone callouts | Quick | **Yes** — explicit Sam signal |
| 8 | Families with kids 5–12 count (distinct from raw kid count) | ❌ Missing | Quick | **Yes** |
| 9 | Recommend threshold visible (≥75 Recommend / 60–74 Worth a look / <60 Do not recommend) | ⚠️ Partial — tier badge shows label but threshold legend is not surfaced | Quick | **Yes** — calibration anchor (Trinity vs LeafSpring) needs the line |
| 10 | PDF export button (non-functional) | ❌ Missing | Quick | **Yes** |

All ten gaps are UI-only. No backend, no schema, no Supabase. All effort = quick. Total estimate: one focused build pass.

## Implementation Plan (UI-only, additive)

### Files to edit
- `src/data/phase2DemoData.ts` — additive fields only:
  - `MarketValidationDemo`: add `confidence: { level: "high" | "medium" | "low"; note: string }` per sub-score (mark Market Absorption as `medium` to demo the badge); add `shortlistCities: { city: string; state: string; composite: number; active: boolean }[]` (5 cities, only Frisco active).
  - `SiteAnalysisDemoSite`: add `gradeAlignment: string` (e.g. "K–5 ✓ matches NG 5–12"), extend `isochroneCallouts` with `pctDualIncome10min` and `familiesWithKids5to12Within10min`.
- `src/pages/MarketValidation.tsx`:
  - Add city-selector pill row above composite card (Frisco active; Plano, Naperville, Bellevue, Newton disabled with "Demo — locked to Frisco" tooltip).
  - Add `LowConfidenceBadge` rendered inside `SubScoreCard` when `confidence.level !== "high"` (amber pill: "Low confidence · routed to human QA").
  - Add "Export PDF" button (top-right of composite card, disabled, tooltip "Coming Week 3 — branded 12-section report per SOW").
- `src/pages/SiteAnalysis.tsx`:
  - Add "Show formula" toggle per sub-score row in `SiteCard` (mirrors 1A pattern).
  - Add Grade Alignment chip in school header chips row.
  - Add two new callout tiles in isochrone grid: % Dual-Income · 10 min, Families w/ kids 5–12 · 10 min.
  - Add threshold legend strip above compare grid: "≥75 Recommend · 60–74 Worth a look · <60 Do not recommend".
  - Add "Export PDF" button in top toolbar (disabled, same tooltip pattern).
- `src/components/phase2-demo/` — new tiny shared component `LowConfidenceBadge.tsx` (also reusable on 1B later).

### Files NOT touched
- No edits to `App.tsx`, `AppSidebar.tsx`, hooks, stores, Supabase client, edge functions, schema, or any Phase 1 page.

### Verification
- Type-check passes (no new deps).
- Visual check on `/market-validation` and `/site-analysis` at current viewport.
- Every new value still comes from `phase2DemoData.ts` (no inline literals in JSX) — preserves the Week 3 swap pattern.

### Tracking
- Append one line to `.lovable/phase-2/CHANGELOG.md` ("2026-06-10 — Demo polish for Sam review: confidence badges, city selector, formula drawers on 1B, threshold legend, grade alignment, dual-income + families callouts, disabled PDF export buttons.").
- Bump status note in `.lovable/phase-2/phase-2-status.md` from `demo-mockup-shipped` → `demo-mockup-shipped · pre-sam-polish`.

Approve and I'll implement in one pass.
