
# City Search Stabilization — Austin First

Goal: make Austin, Texas correct end-to-end on the City Search page, then apply the same fixes globally. No legacy `cities` table reads anywhere in City Search.

## 1. Single source of truth: `us_cities_scored`

- Rip out every read of the legacy `cities` table from the City Search page, drawer, compare modal, map, stat cards, and Ask AI. `us_cities_scored` is the only source. No merge, no fallback, no "sample" hydration.
- `cityScoringLiveData.ts` already loads from `us_cities_scored`; remove the `sampleCities` merge path used by the page so a city either exists in `us_cities_scored` or it doesn't appear.
- Drawer (`MarketDetailDrawer.tsx`) reads its population, income, school counts, scores, and metro from the same `scoredRow` the table row came from — never re-queries `cities`.
- The legacy `cities` table itself stays in the database for now (still referenced by `watchlist_items`, `city_market_signals`, `city_competitors`, `city_fetch_jobs`, `city_category_scores`). Dropping it is tracked separately in `OPEN_TASKS.md` B5 and requires migrating `watchlist_items.city_id` first.

## 2. Backfill Austin's missing geography

- One-off data update on `us_cities_scored` for Austin: set `metro_area = "Austin-Round Rock-Georgetown, TX"`. County belongs on a separate `county_name` column — add it if not present and set `county_name = "Travis"` for Austin (and seed the full dataset later as a follow-up).
- Verify Austin row values match the seeded baseline (population ~967,862, public_elementary_count 177, etc.) and that the drawer renders them.

## 3. Table UI fix (the "8 rows, empty bottom" look)

- `CityTable` page size stays at 8 but the surrounding container no longer stretches to fill the viewport. Either shrink the wrapper to fit content, or fill the empty rows with neutral placeholder rows so the table doesn't look broken. Pagination count (120 pages × 8 = 960) is mathematically correct — just stop the dead whitespace.

## 4. Ask AI — Google-style history dropdown

- Click into the Ask AI input → a dropdown appears under it listing recent queries from `ai_query_history` for this user (most-recent first, max 8).
- Typing filters the dropdown by substring. Clicking an item fills the input AND re-runs the query.
- Empty submit is blocked: the **Ask** button is disabled when the trimmed input is empty, and Enter on empty input does nothing. No more accidental fires.
- Remove the separate "history icon" popover — the dropdown replaces it.

## 5. Demand slider snap fix

- "Rank by demand" intent should not nudge the demand weight to 17%. New rule: when the user explicitly says "rank by X", set that master weight to a dominant share (e.g. 60%) and split the remaining 40% evenly across the other 5 categories, then rebalance to 100%. Apply the same logic for any single-category intent.
- Show the resulting weights in the AI answer card so the user can see why the slider moved.

## 6. Stale UI labels

- Drawer suppresses "Live / Proxy" chips for seeded values — they read **Pre-seeded** instead, matching `buildSeededFallbackSignalsFromScored`.
- Metric labels in the drawer match `us_cities_scored` column meanings exactly (e.g. "Private Elementary Schools" → `private_elementary_count`).

## 7. Out of scope this pass (deferred)

- Dropping the legacy `cities` table.
- "Saved lists inside watchlists" feature.
- Backfilling `county_name` / `metro_area` for all 948 cities (Austin only now; bulk seed = follow-up task).
- Full Ask AI semantic rewrite — only the history dropdown + empty-guard + slider-rebalance changes here.

## Technical notes

Files touched:

- `src/pages/CityScoring.tsx` — drop sample merge, fix pagination wrapper, wire up `rebalanceWeights` rule, gate empty Ask submits.
- `src/lib/cityScoringLiveData.ts` — remove `sampleRankedMarkets` usage path, keep `us_cities_scored` only.
- `src/components/city-scoring/AskAiBar.tsx` — new dropdown UI fed by `ai_query_history`, filter-as-you-type, click-to-rerun.
- `src/components/city-scoring/CityTable.tsx` — container height fix.
- `src/components/city-scoring/MarketDetailDrawer.tsx` — label cleanup, kill misleading status chips for seeded rows.
- Data: one Supabase insert/update for Austin's `metro_area` and (new column) `county_name`.

Verification:

1. Austin appears with correct pop/income/schools, drawer matches table.
2. Table no longer shows empty bottom half at 1044×779.
3. Click into Ask AI → dropdown of past queries; empty Ask does nothing; "rank by demand" pushes demand slider to ~60%.
4. No code path in `src/pages/CityScoring.tsx` or `src/components/city-scoring/*` reads `from("cities")`.

Approve and I'll implement in build mode.
