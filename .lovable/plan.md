## Goal

Make every US state selectable and every state populated with seed candidate cities so the user can click any market and trigger a real API refresh. Plus give them an "+ Add City" escape hatch for ad-hoc additions. Also fix the related bug where no-data cities are filtered out by Min Score.

## Changes

### 1. Hardcode all 50 states in the dropdown
`src/pages/CityScoring.tsx`
- Replace `availableStates` (derived from DB) with a hardcoded constant `US_STATES` listing all 50 + DC.
- Dropdown order: alphabetical, with "All States" first.

### 2. Seed candidate cities for every state with <5 rows
New SQL seed (run via the insert tool, idempotent via `ON CONFLICT (city, state) DO NOTHING`).
- For each state currently underrepresented in `cities`, insert ~5 well-known affluent suburb / strong-franchise candidate cities.
- Defaults: `composite_score=0`, `tier='C'`, `market_type='Suburb'`, `is_non_registration=false` (TX/FL stays true via existing flag logic on read), no `last_scraped_at`.
- Result: every state has at least 5 cities to choose from. Total adds roughly 100–150 rows. None show fake numbers — they all render as "—" / "No data" with our prior fix and a Refresh button.
- Source list will be a curated set in the migration body (no scraping needed).

### 3. Min-Score filter fix (carryover from earlier message)
`src/lib/cityScoringLiveData.ts` → `filterRankedMarkets`:
- Bypass `minScore` and `tierFilter` for cities where `hasLiveData === false`. They always pass through so the user can see them and refresh.
- Sort: data-bearing markets first by `compositeScore DESC`, then no-data markets alphabetically at the bottom.

### 4. "+ Add City" button
`src/pages/CityScoring.tsx` + new `src/components/city-scoring/AddCityModal.tsx`
- Small "+ Add City" button in the Ranked Markets header (next to "Compare").
- Modal: City (text), State (the same 50-state Select), optional County, optional Metro Area.
- On submit: `INSERT INTO cities (city, state, county, metro_area)` with defaults; `ON CONFLICT (city, state) DO NOTHING`. Then refresh `liveRankedMarkets`, select the newly added city, and prompt them to hit "Refresh This Market".
- Validation: city + state required; trim; reject empty; show toast on conflict ("Already in your list").

## Out of scope
- Geocoding / lat-lng columns (separate plan, later).
- Auto-classifying non-registration states beyond TX/FL (CLAUDE.md says 38-state list is locked SOW business logic; will revisit with Sam).
- Pre-fetching API data for newly seeded cities — user pulls them on demand via Refresh.

## Risk
Low. Pure additive: dropdown expands, table grows, one new modal, one filter rule loosened. No edge function or scoring engine changes.

## Order of execution
1. Filter fix (immediate, code only).
2. State dropdown hardcode (code only).
3. Seed migration (data insert via insert tool).
4. Add City modal (code only).
