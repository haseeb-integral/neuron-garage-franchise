## What I’m going to fix

1. Make City Search use one canonical market source so rows do not disappear and the drawer stops going blank.
2. Make reranking and detail calculations work from the seeded city dataset instead of legacy evidence tables.
3. Make Ask AI visibly move the sliders and update the active weighting state the same way as a manual Apply.

## Why this is happening

- The table is now loading from `us_cities_scored`, which has **960 rows** and **948 scored rows**.
- But the drawer, center signal panel, sub-weight recompute path, CSV export, and some refresh polling still still read legacy child tables keyed by old `cities.id` values.
- Database audit confirms the mismatch:
  - `us_cities_scored`: **960** cities
  - `cities`: **320** legacy rows
  - `city_market_signals`: only **831 distinct city_ids**
  - `city_category_scores`: only **9 distinct city_ids**
- So a market can appear in the ranked table, briefly show seeded fallback signals, then get replaced by an empty legacy lookup.
- Ask AI itself is reachable now, but its weight update flow is not fully synced with the same UI/preset state path as manual slider changes.

## Plan

### 1) Detach City Search from the legacy `cities`-based evidence path
- Refactor `CityScoring.tsx` so the selected market detail model is built directly from `us_cities_scored` and stays there.
- Stop treating legacy `city_market_signals` / `city_category_scores` as the primary source for seeded markets.
- Keep legacy rows only as optional enrichment when they exist, never as the source that can blank out the UI.

### 2) Make the center panel and drawer fully seeded-first
- Build one canonical seeded signal set from `us_cities_scored` for every selected market.
- Feed the same canonical signal list into:
  - center signal panel
  - “View all signals” drawer
  - report modal
  - sub-weight formula math
- Merge legacy rows on top only when they exist and are for the same canonical market, instead of replacing seeded data with an empty result.

### 3) Fix full-table reranking from current slider weights
- Recompute ranking from the canonical seeded category scores for **all currently filtered rows**, not just rows that also have legacy evidence rows.
- Remove the page-only override behavior so pagination and ranking are consistent after Apply.
- Ensure the displayed row count stays based on the full filtered seeded dataset.

### 4) Fix missing market count / hidden rows
- Audit the current `baseRankedMarkets` composition and dedupe rules so sample rows cannot interfere with the full seeded list.
- Keep the canonical source at `us_cities_scored`, then apply filters/pagination on that full set.
- Verify the default visible count is the expected seeded market count after filters, not the legacy row count.

### 5) Fix Ask AI slider sync
- Route Ask AI weight changes through the same state flow as manual slider changes.
- Make AI-adjusted weights update:
  - visible slider thumbs
  - active preset mode (`Custom` when appropriate)
  - applied weights when the AI response is meant to act immediately
- Keep filter changes and weight changes in one consistent path so the user sees the sliders reflect the AI answer instantly.

### 6) Clean up stale legacy polling / refresh assumptions
- Update any wait/poll logic still checking legacy `cities`, `city_market_signals`, or `city_category_scores` as if they were the canonical source of truth.
- Preserve manual refresh behavior, but make the UI resilient when only seeded data exists.

## Technical details

- **Frontend files likely touched:**
  - `src/pages/CityScoring.tsx`
  - `src/components/city-scoring/MarketDetailDrawer.tsx`
  - `src/components/city-scoring/MarketReportModal.tsx`
  - `src/lib/cityScoringLiveData.ts`
- **Backend changes:** none planned unless the code audit reveals one missing read path; the backend itself is healthy.
- **Name-vs-meaning check:** I will keep `us_cities_scored` as the canonical seeded city table and avoid silently using legacy `cities` semantics behind the same UI state.

## Risk

- **Medium**: this is a data-flow refactor across the City Search screen, but scoped to existing behavior only.

## How to undo

- Revert the City Search files above to the prior version if the seeded-first wiring causes regressions.

## Expected result after implementation

- The ranked table shows the full seeded market set.
- Applying sliders reranks the visible results consistently.
- The center panel keeps signals visible.
- The drawer no longer opens empty for seeded markets.
- Ask AI moves the sliders and updates ranking/filter state in a way you can actually see.