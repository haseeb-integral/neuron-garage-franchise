## Confirmed
**Sliders only recompute after Apply Weights** — keeping current behavior. Adding a visible hint so it's obvious.

## 1. Ask AI auth (401 today)
- Use `useAuth().session` first; refresh once if stale.
- Keep explicit `fetch()` to `/functions/v1/ai-city-query` with `Authorization: Bearer …` + `apikey`.
- Show real backend error in toast.
- File: `src/pages/CityScoring.tsx`.

## 2. Empty center panel + empty drawer (Silver Spring etc.)
- `loadLiveData()` already reads `us_cities_scored`; ensure the selected market object always carries canonical `cityId` into `MarketDetailDrawer`, `MarketReportModal`, `NearbyMarketsPanel`, watchlist.
- Row click: set canonical `cityId` alongside `selectedMarketKey` so hydration doesn't fall back to stale sample.
- Files: `src/pages/CityScoring.tsx`, `src/data/cityData.ts`.

## 3. "View all" signals
- Keep center panel as 8-row preview.
- Replace small link with a clearer **"View all N signals →"** button → opens drawer on the Data Sources tab.
- Drawer empty-state for seeded markets: *"Pre-seeded score · source audit pending"* instead of "No fetcher wired."
- Files: `src/pages/CityScoring.tsx`, `src/components/city-scoring/MarketDetailDrawer.tsx`.

## 4. Slider behavior
- No change to recompute trigger.
- Add an inline hint next to **Apply Weights**: *"Click Apply to recompute scores."* shown only when draft ≠ applied.
- File: `src/pages/CityScoring.tsx`.

## Not touching
Scoring math · tier thresholds · auth methods · DB schema.

## Risk
Low–medium. Contained to City Search.

## Validation after build
1. Ask AI returns a result for "top Texas markets" instead of 401.
2. Silver Spring center panel + drawer render populated, with seeded-state copy.
3. "View all signals" opens drawer → Data Sources tab.
4. Moving a slider shows the hint; Apply re-ranks.