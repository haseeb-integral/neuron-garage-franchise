# City Search bug-fix plan (approved)

## Confirmed behavior
- **Sliders do NOT auto-recompute.** Score only updates after the user clicks **Apply Weights** (current behavior — keep it).
- All other items below get implemented now.

## Fixes

### 1. Ask AI auth (401 today)
- Read the session from `useAuth()` first; if missing, call `supabase.auth.refreshSession()` once.
- Keep the explicit `fetch()` POST to `/functions/v1/ai-city-query` with `Authorization: Bearer <token>` + `apikey`.
- Surface the real backend error message in toast on failure.
- File: `src/pages/CityScoring.tsx` (`askAi`).

### 2. Center panel + drawer empty for seeded cities
- `loadLiveData()` already reads `us_cities_scored` — verify selected market always carries canonical `cityId = us_cities_scored.id` into drawer/report/nearby/watchlist.
- On row click, set `selectedMarketKey` AND stash the canonical `cityId` so center panel hydrates without a sample fallback.
- "Has data" check uses seeded score presence, not legacy `liveCity.composite_score > 0` only.
- Files: `src/pages/CityScoring.tsx`, `src/data/cityData.ts`.

### 3. "View all" key signals
- Center panel keeps the short preview (8 rows).
- Replace tiny "View all signals" link with a clearer **"View all N signals →"** button that opens the details drawer directly on the data-sources tab.
- In the drawer, show seeded markets honestly: "Pre-seeded score · source audit pending" instead of "Missing / No fetcher wired."
- Files: `src/pages/CityScoring.tsx`, `src/components/city-scoring/MarketDetailDrawer.tsx`.

### 4. Slider behavior (per your confirmation)
- **No change to recompute trigger** — Apply Weights still gates the score.
- Add a small inline hint next to the Apply button: *"Click Apply to recompute scores."* shown only when `weights !== appliedWeights`.
- File: `src/pages/CityScoring.tsx`.

## What I will NOT touch
- Scoring math / tier thresholds.
- Auth methods.
- Database schema.

## Risk
- Low-medium. Contained to City Search page + drawer.

## Validation
1. Ask AI returns a result for "top Texas markets" instead of 401.
2. Silver Spring center panel + drawer render populated, with seeded-state copy.
3. "View all signals" opens drawer → Data Sources tab.
4. Moving a slider shows the "Click Apply to recompute" hint; clicking Apply re-ranks.
