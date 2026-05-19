## Goal
Fix the City Search screen so it reads consistently from the seeded backend data and stops showing blank, stale, or contradictory values.

## What I found
1. The page is still mixing two data models:
   - canonical seeded table: `us_cities_scored`
   - partial legacy child tables: `city_market_signals`, `city_category_scores`, `city_fetch_jobs`, `cities`
2. That split is causing most of the issues you listed:
   - center panel briefly shows old/default values before the selected row loads
   - Metro Area / County / Market Type can be blank or misleading
   - seeded-city drawer is empty because the drawer still tries legacy child tables first
   - signal count is short because only legacy rows exist for some cities, while seeded fallback rows are not treated as the full source of truth
   - AI history exists in the database, but the UI behavior is not surfacing it reliably
3. The “486 cities” symptom matches an active filter state, not missing cities. The backend currently has:
   - 960 scored rows total in `us_cities_scored`
   - 948 with non-null composite scores
   - about 463 when both `population >= 50000` and `score >= 50`
4. Documentation is not what prevented the fix. The real blocker is inconsistent wiring. But missing doc sync did make the previous changes easier to misread and easier to regress.

## Plan
### 1. Make City Search use one canonical source
Refactor the page so seeded `us_cities_scored` data is the default source for:
- left ranked table
- center selected-market panel
- right-side/slide-out detail drawer
- watchlist city ids
- AI-driven reranking inputs

Legacy evidence tables will become optional enrichment only, never the thing that decides whether the UI is blank.

### 2. Fix the selected-row stale/flash bug
Remove the temporary fallback that shows the wrong city’s score/details for ~1 second.

I’ll change selection so the center panel only renders the currently selected market’s canonical row, with a proper loading/transition state instead of reusing stale cached values.

### 3. Fix center-panel metadata fields
Correct these fields for seeded markets:
- Market Type
- Metro Area
- County

Important note: `us_cities_scored` appears to have metro data, but not county. So I will:
- stop showing fake/default county values
- show an honest placeholder when county truly does not exist
- remove the hardcoded “Suburb” fallback when the real market type is unavailable

### 4. Fix Key Market Signals and drawer completeness
Use seeded fallback signals as the base dataset for seeded cities, then merge in legacy live rows only when they exist.

That will fix:
- only 4–5 signals showing
- missing “View all signals” behavior
- empty drawer for seeded cities

I’ll also make the “View all signals” count use the same merged source as the visible list so the button is always accurate.

### 5. Fix left-table count and ranking behavior
Clean up the filtered/ranked dataset so the left table reflects the real seeded inventory and current filters clearly.

I’ll verify:
- default load shows the full seeded ranked set allowed by current business rules
- filters are visible and not silently narrowing results
- no stale persisted state keeps hiding cities after refresh

### 6. Fix Rank/Market column overlap
Adjust the left-table column widths and typography so the Rank / Market headers do not overlap and stay stable across viewport sizes.

### 7. Fix Ask AI behavior end to end
I’ll tighten the AI flow so it behaves like a real search control:
- keep the user’s submitted query visible after submit
- reliably show recent/saved AI queries from `ai_query_history`
- make AI-applied filter/weight changes visible immediately on screen
- ensure AI-driven weight changes and slider state stay in sync

### 8. Resolve slider-vs-AI conflict rules
Implement one clear rule:
- if the AI response returns category weight changes, those become the new live applied weights on screen
- the sliders visibly move to match
- the table reranks immediately from those applied weights

That means your example should work: if the user had 100% Competitive Landscape, then asks for “Texas ranked by Demand only,” the sliders should visibly move to Demand-heavy / Demand-only according to the AI result, and the table should rerank from that applied state.

### 9. Fix watchlist visibility, not just save/remove
You already have save/remove working in the background, but there is no real “view my saved list” experience.

Without adding a big new feature, I’ll make the existing watchlist flow clearer inside City Search by:
- making saved-state behavior reliable
- making the existing watchlist filter/count obvious
- ensuring saved markets can be surfaced consistently from the main list

### 10. Validate against the real failure list
After the refactor, I’ll verify these exact items:
- no blank/incorrect flash in center panel on row click
- seeded cities show non-empty drawer content
- more than 4–5 signals appear where seeded data exists
- “View all signals” works
- table count matches actual filter state
- AI history appears
- AI query text remains visible
- AI-applied weights visibly move sliders and rerank the table
- watchlist items can be found again in UI

## Technical notes
- No scoring-math change will be made; only data wiring and UI state consistency.
- No auth redesign.
- No sidebar/layout redesign.
- If county is not present in the seeded table, I will not invent it. I will show a truthful placeholder until a real county source is added.
- After implementation, I will draft doc-sync updates for `PROJECT_CONTEXT.md`, `HOW_IT_WORKS.md`, `APIS.md`, and `OPEN_TASKS.md`, then wait for your explicit approval before writing them.

## Risk
Medium. This touches the main City Search page, but the work is mostly a cleanup of data flow rather than new functionality.