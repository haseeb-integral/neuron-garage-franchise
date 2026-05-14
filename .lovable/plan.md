## Goal

Wire NCES public elementary school data (Task 10) via Urban Institute's free CCD API. No API key.

## Important finding from API testing

The Urban Institute CCD endpoint **ignores the `city_location` query param** (verified — passing `city_location=AUSTIN` still returns all 4,765 Texas elementary schools, with 884 unique cities). The valid path-style filters are `fips` (state) and `school_level`. City filtering must be done **client-side after fetch**.

The correct param is also `school_level=1` (not `level_of_institution=1`), and the latest year currently published is **2022**.

So instead of calling the API once per city (which would be ~50× redundant fetches of the same state-level dataset), we fetch **once per state** and group by `city_location` locally. Same outcome, ~10× fewer requests.

Table is `cities` (not `city_markets`) — using the actual schema name.

## What we'll build

### 1. Edge function `supabase/functions/fetch-school-counts/index.ts`

- POST endpoint, JWT-validated (matches other Lovable Cloud functions)
- Optional body: `{ cityIds?: string[] }` — when omitted, processes all rows in `cities`; when provided, only those cities (used by the per-city Refresh button later)
- Logic:
  1. Load target cities from `cities` (id, city, state)
  2. Map each state name → 2-digit FIPS code (50-state lookup, hardcoded constant in the function)
  3. Group cities by FIPS, then **for each unique state**:
     - Paginate `https://educationdata.urban.org/api/v1/schools/ccd/directory/2022/?fips={FIPS}&school_level=1` (follow `next` URL until null)
     - Build a `Map<UPPER(city_location), { count, enrollment }>` — sum `enrollment` only when not null/-1
  4. For each target city, look up its uppercase name in the state map
  5. Upsert two rows into `city_market_signals` per city:
     - `signal_key='public_elementary_count'`, `value=<count>`, `label='Public elementary schools'`, `source='nces_ccd'`, `source_url=<the API URL>`
     - `signal_key='public_elementary_enrollment'`, `value=<enrollment>`, `label='Public elementary enrollment'`, `source='nces_ccd'`
  6. `console.warn` for any city that returns 0 results (so we can spot bad city-name matches like "St. Louis" vs "SAINT LOUIS")
- Returns JSON summary: `{ processed, withData, zeroResults: [{city, state}], errors: [...] }`
- CORS headers on every response

### 2. Migration — unique constraint for clean upserts

`city_market_signals` currently has no unique constraint, so true upserts aren't possible. Add:

```sql
ALTER TABLE public.city_market_signals
  ADD CONSTRAINT city_market_signals_city_signal_unique
  UNIQUE (city_id, signal_key);
```

This lets the edge function call `.upsert(..., { onConflict: 'city_id,signal_key' })` cleanly without delete-then-insert.

### 3. Frontend wiring (this turn)

- Nothing in the UI yet — we just want the data flowing. Once verified, we'll either:
  - (a) add a small "Refresh school data" button on the city detail drawer, or
  - (b) auto-call it from the existing per-city Refresh flow.
- The "Elementary schools — Not available yet" placeholder on the city card will start showing real numbers once `city_market_signals` has the rows (the `MarketDetailDrawer` already reads from that table).

## Out of scope (deferred)

- GreatSchools (Task 11) — blocked on Brett's API key
- Backfilling all 50 cities — we'll trigger once after deploy via curl, then verify Frisco/Plano/Ashburn/Austin
- UI badge to show data freshness — Phase 2

## Risks

- **City-name mismatches** are the main risk (e.g., "St. Petersburg" in DB vs "ST PETERSBURG" in CCD). The function normalizes both sides to uppercase + strips periods, but unusual names will land in `zeroResults` for manual review. Low risk — easy to fix per-city if it happens.
- 2022 is the latest year — fine for the demo. Urban Institute publishes new years annually.

## Verify

- After deploy, curl the function with `{}` body, watch logs for warnings
- Open Austin TX → drawer should show ~150+ public elementary schools
- Open Frisco TX → should show ~40+ schools
- `zeroResults` array in response shows any cities that need name normalization
