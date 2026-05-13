## Goal

Eliminate the silent sample-data fallback that makes empty cities look scored (e.g. Pflugerville=41, Cedar Park=58 came from `src/data/cityData.ts`, not the DB). Cities without live scoring data should clearly read "—" and "No data". Nearby Markets stays removed for now.

## Root cause

`src/lib/cityScoringLiveData.ts` → `dedupeRankedMarkets`:
- When a `cities` row has `composite_score=0` and no `last_scraped_at`, it's treated as a "geo-only stub" and the **sample** city (with hardcoded score/tier/competitors) is used as the row, only copying metro/county fields from the live row.
- Result: hardcoded scores leak into the live table.

## Changes

### 1. `src/lib/cityScoringLiveData.ts`
- Remove the sample-fallback branch in `dedupeRankedMarkets`. When live exists for a city+state key, **always** keep the live row (even if score=0); never fall back to the sample row's numbers.
- Keep dedupe between two live rows (newest `last_scraped_at` wins) and between two sample rows (current behavior).
- In `mapLiveCityToRankedMarket`, when `composite_score` is 0 AND `last_scraped_at` is null, set `tier = "—"` (or a sentinel like `"none"`) so downstream UI can detect "no data" without guessing.
- Add a derived flag `hasLiveData: boolean` on `RankedMarket` (`compositeScore > 0 || !!lastScrapedAt`) to make UI checks trivial.

### 2. `src/components/city-scoring/CityTable.tsx`
- For rows where `hasLiveData === false`:
  - Score cell renders `—` (muted) instead of the score bar.
  - Tier cell renders a grey "No data" pill instead of the colored A/B/C/D badge.
  - Row remains clickable (opens drawer, which already says "No live data yet" and offers Refresh).
- Sorting: push no-data rows to the bottom regardless of sort direction on score.

### 3. `src/pages/CityScoring.tsx`
- Right-column selected-market panel: if `selected.hasLiveData === false`, show "—" in the gauge, "No data" tier chip, and hide category-score bars (the "Refresh This Market" CTA already exists).
- No Nearby Markets work this round (deferred per your decision).

### 4. `src/components/city-scoring/MarketCompareModal.tsx`
- Already handles missing `cityId`. Add the same treatment when `hasLiveData === false`: render "—" for Overall Score gauge and "No data" for tier, instead of showing a 0 gauge.

## Out of scope
- Nearby Markets card re-add (later, post-Module-1, sourced from DB by metro_area/county).
- Removing `sampleCities` entirely. It's still referenced elsewhere; we just stop using it as a fallback for live rows. A separate cleanup pass can purge it once all consumers are live.

## Risk
Low. Pure presentation + dedupe-rule change. No DB writes, no schema changes, no edge-function changes.
