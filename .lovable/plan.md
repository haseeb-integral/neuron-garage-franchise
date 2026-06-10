# Phase 2 — Week 2: Demo Mockup Pages for Market Validation & Site Analysis

## Answers to your questions

1. **Sidebar placement.** New items go in the **primary nav** in `AppSidebar.tsx`, between `City Search` and `Teacher Search`, in this order:
   - Dashboard
   - City Search
   - **Market Validation** ← NEW (Phase 2 demo)
   - **Site Analysis** ← NEW (Phase 2 demo)
   - Teacher Search
   - Email Outreach
   - Candidate Pipeline
   - Data Observability
   Both new items get a small `Demo` chip next to the label so it's obvious in the nav that these are not live.

2. **Demo data approach.** I'll hardcode realistic-looking sample data anchored to cities/sites already familiar from the SOW so Brett/Sam can read it like the real thing:
   - **Market Validation** demo city = **Frisco, TX** (Sam's PDF uses Galileo Frisco as an example). Show all 6 sub-scores + composite per the locked formula in `phase-2-sow.md`:
     Pricing Acceptance, Market Absorption (incl. sellout %, time-to-sellout, YoY velocity), Scaled Operator (validation count + direct competitor load), Enrichment Diversity, Market Depth, Market Balance Index. Plus a mini table of ~6 sample premium providers with weekly status badges (sold_out / waitlist / open) and a "Show Formula" drawer per sub-score (static).
   - **Site Analysis** demo = **Trinity (Westlake), Austin** vs **LeafSpring, Austin** side-by-side (the SOW's positive vs negative anchor). Show 5 sub-scores per the SOW formula, isochrone map placeholder (static SVG or shaded box labeled "10/15-min drive-time isochrone — demo"), and a compare strip up to 4 slots (2 filled, 2 empty).
   - Every numeric value gets a `Sample data` micro-label and the page-level banner reads **"Demo Preview — Backend Coming Soon"** in the same amber/orange style used by `PlaceholderPage`'s "Coming Soon" chip.

3. **Exact sidebar labels.** `Market Validation` and `Site Analysis`. Short, matches the SOW and Brett's sketch ("Market Validation layer", "Site Analysis Engine").

4. **File structure (new files only).**
   - `src/pages/MarketValidation.tsx`
   - `src/pages/SiteAnalysis.tsx`
   - `src/components/phase2-demo/DemoBanner.tsx` (the "Demo Preview — Backend Coming Soon" banner)
   - `src/components/phase2-demo/SampleDataBadge.tsx` (small chip used inline)
   - `src/data/phase2DemoData.ts` (all hardcoded mock values — Frisco market, Trinity + LeafSpring sites)
   Files I'll touch (additive only, no logic changes):
   - `src/App.tsx` — add 2 lazy imports, 2 `<Route>` entries, 2 `registerRoutePrefetch` lines
   - `src/components/AppSidebar.tsx` — add 2 entries to `primaryNavItems` array
   - `src/lib/usePageTitle.ts` — add 2 entries so tab titles are correct
   No edits to existing pages, hooks, stores, Supabase queries, edge functions, schema, or backend logic.

5. **Safeguards — confirmed.** No Supabase calls, no edits to existing routes/pages/components, no new npm deps, no env/build changes, no schema changes. Every value rendered is a literal from `phase2DemoData.ts`.

6. **How the approved layout becomes the real page later.** No merge or copy step needed. Week 3 plan: the *same* `MarketValidation.tsx` and `SiteAnalysis.tsx` files get wired to Supabase reads (replacing the imports from `phase2DemoData.ts` with hooks like `useMarketValidationCity(cityId)`). The visual components stay; only the data source swaps. The demo banner gets removed when the page is live. This is the same pattern Phase 1 used (Spec page, Observability) — the page file survives, the data source is swapped underneath.

## Implementation steps

1. Add `phase2DemoData.ts` with two exported constants: `friscoMarketValidationDemo` and `austinSiteAnalysisDemo` (Trinity + LeafSpring + 2 empty slots).
2. Build `DemoBanner` (full-width amber banner: "Demo Preview — Backend Coming Soon · Sample data only — not connected to Supabase").
3. Build `MarketValidation.tsx`:
   - PageHeader title "Market Validation" + Phase-2 demo chip
   - DemoBanner at top
   - Composite score card (large number, tier label, formula drawer)
   - 6 sub-score cards in a responsive grid (same `Card` + `border` styling as City Search)
   - Premium provider sample table (6 rows, week-status badges)
   - Footer note linking to `phase-2-sow.md` Item 1 for the locked formula
4. Build `SiteAnalysis.tsx`:
   - PageHeader title "Site Analysis" + Phase-2 demo chip
   - DemoBanner
   - Up-to-4 compare strip (Trinity + LeafSpring filled; 2 empty "Add candidate site" cards, disabled)
   - 5 sub-score cards per site
   - Static isochrone placeholder (gray rounded box with two concentric rings + "10 min / 15 min — demo" caption)
   - Footer note linking to `phase-2-sow.md` Item 2
5. Register routes in `App.tsx` at `/market-validation` and `/site-analysis`. Add prefetch + title entries.
6. Add the 2 sidebar items between City Search and Teacher Search with a small `Demo` chip.
7. Update `.lovable/phase-2/phase-2-status.md` (Item 1 + Item 2 → "demo-shipped" sub-status) and log the change in `.lovable/phase-2/CHANGELOG.md` per the Phase-2 rule.

## Out of scope this session

- Any Supabase tables, edge functions, or queries.
- PDF generation (Sections 12 / 10 in the SOW).
- Confidence-gate QA queue UI.
- Real isochrone rendering (Mapbox/HERE).
- Any edits to City Search, Teacher Search, Candidate Pipeline, Email Outreach, Observability, Onboarding.

Approve and I'll implement.