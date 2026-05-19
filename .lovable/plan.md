# City Search bug-fix plan

## What’s actually broken

1. **Center panel is still loading from the wrong table**
   - `CityScoring.tsx` still calls `from('cities')` in `loadLiveData()`.
   - Seeded markets like **Silver Spring, Maryland** only exist in `us_cities_scored`, so the lookup returns nothing.
   - Result: center panel shows **No live data**, watchlist/detail IDs are missing, nearby markets/report context is wrong.

2. **Drawer/report are opening with the wrong market identity**
   - The selected market object passed into `MarketDetailDrawer` / `MarketReportModal` does not reliably carry the canonical `cityId` from `us_cities_scored`.
   - Those components now query by `market.cityId`, so when that field is missing they short-circuit and render mostly empty / all-missing states.
   - Result: drawer looks empty and the tags read like nothing is wired.

3. **Ask AI still fails auth in practice**
   - Direct function probe returns `401 Not authenticated`.
   - Current frontend uses `supabase.functions.invoke()` with a manual header retry, but preview auth is still not reliably reaching the edge function.
   - Result: user enters a query and nothing useful happens.

4. **Drawer tags are technically consistent with empty evidence, but misleading for seeded markets**
   - The drawer is built as a source-of-truth audit against `city_market_signals` + latest `city_fetch_jobs.response_summary.metric_status_map`.
   - For seeded-only cities with no seeded audit rows, it falls back to “Missing / No fetcher wired yet,” which reads like a bug.
   - Result: confusing UX even when the market has valid pre-scored data in `us_cities_scored`.

## Fix plan

### Step 1 — Rewire selected-market loading to `us_cities_scored`
- Replace the remaining `loadLiveData()` legacy `cities` lookup in `CityScoring.tsx` with `us_cities_scored`.
- Hydrate the selected market from the canonical row:
  - `cityId = us_cities_scored.id`
  - `compositeScore = composite_score_default`
  - category scores from `score_*`
  - `metroArea`, `marketType`, `population`, `county` fallback logic preserved
- Keep old child-table queries (`city_market_signals`, `city_competitors`, `city_fetch_jobs`) as best-effort only.

### Step 2 — Pass canonical market identity everywhere
- Ensure the selected market object passed into:
  - `MarketDetailDrawer`
  - `MarketReportModal`
  - `NearbyMarketsPanel`
  - watchlist actions
  always includes the canonical `cityId` from `us_cities_scored`.
- Make the center panel “has data” decision use seeded score presence instead of legacy `liveCity.composite_score`.

### Step 3 — Fix Ask AI auth path
- Replace the `supabase.functions.invoke('ai-city-query')` call with an explicit `fetch()` to the backend function endpoint using:
  - `Authorization: Bearer <access_token>`
  - publishable key header
  - JSON body
- Keep the pre-flight session check + one forced refresh retry.
- Surface the backend error text in toast so failure is visible instead of feeling like a dead click.

### Step 4 — Make drawer/report messaging honest for seeded markets
- If a market has seeded score data but no evidence rows in `city_market_signals`, show seeded-state copy instead of “No fetcher wired yet” everywhere.
- Keep the audit UI, but change empty-state language so it reads as:
  - pre-scored market available
  - source audit not yet seeded for this city
  - live evidence tables will populate once seed-on-demand/backfill exists
- Do not invent fake evidence rows.

### Step 5 — Validate on the exact failures you reported
- Check one seeded-only market (Silver Spring) and confirm:
  - center panel shows score/tier/category values
  - drawer opens with correct city chips and non-broken messaging
  - Ask AI returns a result or a visible actionable error
- Confirm no remaining critical `from('cities')` reads in City Search display paths.

## Technical notes
- **Name-vs-meaning check:** no silent widening; `cityId` should consistently mean `us_cities_scored.id` in City Search UI paths.
- I will **not** change scoring math, auth methods, or add new features.
- I will **not** add seed-on-demand yet; only fix the broken current experience.

## Recommendation on Ask AI interface
- **Keep results in the table as the primary output.** That is the right interaction model because the real action is ranking/filtering markets.
- Add/keep a **small explanation card under the Ask AI bar** with:
  - summary of what AI changed
  - filters applied
  - weight nudges
  - data gaps
- Do **not** build a separate visual canvas or chat UI right now. For this workflow, a separate interface would add noise, not clarity.

## Risk
- **Medium**: touches the selection/data-loading path and Ask AI request path, but scope is contained to City Search.

## Undo
- Revert the City Search page and Ask AI request wiring from history if needed.
- No schema change required for this fix.

If you approve, I’ll implement this exact fix set next.