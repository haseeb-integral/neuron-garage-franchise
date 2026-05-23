# City Search + Teacher Search Turnaround Plan

Goal: Take the existing app from "engine is great, dashboard is held together with zip ties" to a clean, honest, maintainable product. No new features. No backend redesign. Just disciplined cleanup, decomposition, and guard rails — in the right order so each step makes the next one easier.

Scope: City Search (primary), Teacher Search (secondary). Email Outreach explicitly out of scope. No work on auth/login.

---

## Step 1 — Metric Truth Cleanup (the "kill the 46" pass)

**Why first:** Every refactor downstream is easier once the registry is the only source of truth and ghost metrics are gone. This also fixes the false "46 metrics" story in the UI.

**What:**
- Treat `src/lib/sowMetricRegistry.ts` as the single source of truth. Live total = **12 sub-metrics across 3 categories** (Demand 4 / CSI 3 / TAM Teachers 5).
- Grep the codebase for "46", "comprehensive scoring", "46-factor", "46-metric" — replace with accurate copy ("12-metric model across Demand, Competitive Opportunity, TAM Teachers").
- Prune `src/lib/signalAliases.ts` `LEGACY_TO_CANONICAL` map: remove any alias whose target key is not in the registry (montessori_count, stem_enrichment_count, long_commute_pct, young_families_growth_5yr, etc.). Keep only aliases that map to a live registry key.
- Prune `FETCHER_DIAGNOSTIC_KEYS` set to only what fetchers actually emit today.
- Add a one-liner to `_ARCHIVED_DO_NOT_USE/README.md`: "The 46-metric list in these archived MDs is historical. Live count is 12 — see `src/lib/sowMetricRegistry.ts`."
- Delete `src/data/cityData.ts` `sampleCities` usage from any production code path; keep only if a test imports it, otherwise delete the file.
- Drop vestigial DB columns from `us_cities_scored` that are 0% populated and no longer in the registry: `summer_camp_count`, `school_hosted_camp_count`, `avg_camp_price_per_hour`, `camp_waitlist_signals`, `summer_weather_index`, `summer_precip_days`, `days_above_90f`, `avg_peak_summer_temperature`, `weather_last_updated`. (Pre-release, no migration concerns.)
- Remove `fit_score` from `teacher_prospects` if unused (confirm via grep first).

**Done when:** No code references a metric key that isn't in `sowMetricRegistry.ts`. No UI string says "46". `signalAliases.ts` is < 20 lines.

---

## Step 2 — Decompose `CityScoring.tsx` (3,323 → ~300 lines + hooks)

**Why second:** This file is the bottleneck for every future change. It has 17 `useState`, 22 raw `compositeScore` reads, and an `eslint-disable` at the top.

**What:**
- Extract feature hooks (one file each, under `src/hooks/citySearch/`):
  - `useCityFilters.ts` — wraps the Zustand filter slice + derived predicates
  - `useCityRanking.ts` — wraps the marketView call + sort/order
  - `useCitySelection.ts` — single + compare selection, replaces 4 useStates
  - `useCityPagination.ts` — page + pageSize
  - `useCityWeights.ts` — master + sub-weights, apply/reset semantics
- Extract presentational components:
  - `CitySearchToolbar.tsx` — search box, model picker, view toggle
  - `CitySearchResults.tsx` — table/map/spreadsheet switch
  - `CitySearchEmptyState.tsx`
- Move every raw `compositeScore` read behind `marketView` (already the SoT — Step 1 of the previous audit). Delete the `eslint-disable`.
- Target: `CityScoring.tsx` becomes a thin orchestrator (~300 lines, 0 local `useState`, all data via hooks).

**Done when:** `CityScoring.tsx` < 350 lines, no `eslint-disable`, all score reads route through `marketView`.

---

## Step 3 — Decompose `SubMetricWeightsDrawer.tsx` (1,194 → ~250 lines)

**Why third:** Second-largest file, touched every time weights change, and currently mixes UI + normalization + persistence + retired-category dead code.

**What:**
- Extract `src/lib/subWeightNormalization.ts` — pure functions: `normalizeToHundred`, `applySubWeights`, `diffFromDefault`. Unit-tested.
- Extract `<CategoryWeightSection />` — renders one category's sub-metrics. Drawer becomes a map over 3 categories.
- Extract `<CsiReadOnlySection />` — CSI is read-only by design (Manus owns the formula). Make this an obvious separate component so no one accidentally adds editable sliders.
- Delete all branches that reference retired categories (`pricingPower`, `easeOfOperations`, `parentMindset`). The store migration already strips them; the drawer shouldn't carry the code.
- Add a small explainer header per category that pulls from `CATEGORY_PURPOSE`.

**Done when:** Drawer < 300 lines, normalization is pure + tested, zero references to retired category keys.

---

## Step 4 — Decompose other oversized City Search files

- `MarketDetailDrawer.tsx` (712) → split into `<MetricRow />`, `<CategorySection />`, `<DataSourceFootnote />`. Move the legacy → canonical key join into `signalAliases.ts` (already partially there).
- `MarketReportModal.tsx` (623) → split header / scorecard / per-category sections / actions.
- `CitySpreadsheetView.tsx` (514) → extract column defs to `cityColumns.ts`; view becomes ~200 lines.
- Delete `CompareModal.tsx` (older one). Keep `MarketCompareModal.tsx` as the single compare surface. Update imports.

**Done when:** No City Search component file is over 500 lines. One compare modal.

---

## Step 5 — Teacher Search cleanup

**What:**
- **Kill the dual-ID system.** Today `teacher_prospects` rows are addressed by both a legacy `id: number` and a real `uuid: string`. Pick `uuid` everywhere. Sweep `TeacherProspects.tsx`, `TeacherTable.tsx`, `TeacherDetailPanel.tsx`, `BulkActionBar.tsx`, store, and the dedupe edge function. Remove the numeric `id` field from any local types.
- **Consolidate `teacher_prospects_stats` RPC.** Drop the older overload, keep the one the UI actually calls. (Migration step — pre-release, safe.)
- **Drop `fit_score` column** from `teacher_prospects` and `FitScoreBadge` component if not in use; confirm via grep first.
- Decompose `TeacherProspects.tsx` (955 lines, 19 useState) using the same hook pattern as Step 2: `useTeacherFilters`, `useTeacherSelection`, `useTeacherStats`, `useTeacherPagination`. Target < 350 lines.
- Replace cascading `useEffect` chains (promoted / campaign data) with React Query dependent queries.

**Done when:** One ID system (uuid). One stats RPC. Page < 350 lines, ≤ 3 `useEffect`s.

---

## Step 6 — Caching + typing hygiene (cross-cutting)

- Delete `src/lib/pageCache.ts`. Move any remaining consumers to React Query with sensible `staleTime`. One cache, one mental model.
- Type-tighten `src/lib/cityScoringLiveData.ts`. Replace the ~17 `any`s with real types derived from `sowMetricRegistry` and the DB row type. No `any` left at module boundary.
- Turn the `eslint-disable` removals from Step 2 into a permanent lint rule: no raw `compositeScore` reads outside `marketView.ts` (already exists per prior audit — verify and harden).

**Done when:** Grep for `any` in `cityScoringLiveData.ts` returns 0 hits. `pageCache.ts` deleted.

---

## Step 7 — Test coverage on the 5 highest-traffic surfaces

Add focused component/integration tests (Vitest + Testing Library). Not exhaustive — just the surfaces that, if they break, the product is dead:

1. `CityTable` — renders rows, sorts by score, respects filter
2. `SubMetricWeightsDrawer` — apply normalizes to 100, reset restores defaults, CSI section is read-only
3. `MarketDetailDrawer` — every registry metric renders a row with a real or "no data" value
4. `TeacherTable` — renders, selects, bulk-acts using uuid only
5. `marketView` red-path — drift detector throws when a screen tries to compute its own score (already exists; ensure it survives the refactor)

**Done when:** `bunx vitest run` is green, these 5 suites exist and cover the contracts above.

---

## Execution order and self-check between steps

Steps must run in order — each one removes ambiguity the next one would otherwise inherit. After each step I'll:
1. Run `bunx vitest run` (must stay green).
2. Run the dev build (typecheck must stay green — no new errors introduced).
3. Spot-check the City Search and Teacher Search pages in preview.
4. Commit the step as a single logical change with a one-line summary.

If any step grows past its scope mid-flight, I stop and surface it instead of expanding silently.

## Out of scope (will not touch)

- Email Outreach / SmartLead
- Auth / login flows
- Edge functions other than the teacher dedupe consolidation in Step 5
- Any new features
- Any of the archived MD files (they stay archived, untouched)

## Rough size

~12–18 focused PR-sized commits. No single step should take more than a few hundred lines of net change once dead code is removed. Net line count for the repo should go **down**, not up.
