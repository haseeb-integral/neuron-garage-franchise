# Module 1 Polish — Steps 2, 3, 4

Step 1 (un-hide no-data cities) is verified done. Building the remaining three.

---

## Step 2 — Source Data panel goes live (~1–2 hr, low-medium risk)

**Problem:** Source Data panel currently shows hardcoded/sample provenance. Should reflect actual `city_fetch_jobs` and `city_market_signals` for the selected city.

**Changes:**
- `src/lib/cityScoringLiveData.ts` — add `getCitySourceData(cityId)`:
  - Query latest row per `source` from `city_fetch_jobs` (apify, census, bls, fred): status, started_at, completed_at, error_message, response_summary.
  - Join distinct `source` + `source_url` from `city_market_signals` for that city.
  - Return `{ source, label, status, lastFetchedAt, recordCount, sourceUrl, errorMessage }[]`.
- Locate the existing source/provenance UI in `src/pages/CityScoring.tsx` (city detail drawer/modal) and replace static array with the live query (use `useEffect` keyed on selected city id).
- Render: source name, status badge (success/error/queued/never), relative timestamp ("3 min ago" / "Never"), record count, link to source URL.
- Empty state for no-data city: "No data fetched yet — click Refresh This Market."

**Acceptance:** Open a city with data → real fetch timestamps + statuses. Open a no-data city → "Never" / empty state. Refresh updates timestamps after job completes.

---

## Step 3 — Nearby Markets goes live (~1 hr, low risk)

**Problem:** Hardcoded `NEARBY_MARKETS` constant in `MarketCompareModal.tsx`.

**Changes:**
- `src/lib/cityScoringLiveData.ts` — add `getNearbyMarkets(city)`:
  1. Top 5 cities WHERE `metro_area = selected.metro_area` AND `id <> selected.id` AND `composite_score > 0` ORDER BY `composite_score DESC`.
  2. If <5 results, fill remainder from same `state` (excluding already-included), still data-bearing only.
- `src/components/city-scoring/MarketCompareModal.tsx` — remove `NEARBY_MARKETS` constant + "Sample nearby markets" label, fetch via the new function on open, show loading skeleton + empty state ("No nearby markets with data yet").

**Acceptance:** Open a city in a metro with siblings → real ranked neighbors. Open isolated city → graceful empty state. No more "Sample" label.

---

## Step 4 — Leaflet map + lat/lng backfill (~2–3 hr, medium risk)

Last because it requires schema change + one-shot backfill.

**Schema migration:**
```sql
ALTER TABLE public.cities
  ADD COLUMN latitude  numeric(9,6),
  ADD COLUMN longitude numeric(9,6);
CREATE INDEX idx_cities_lat_lng ON public.cities(latitude, longitude);
```

**Backfill edge function** `backfill-city-coordinates`:
- Iterates cities WHERE `latitude IS NULL`.
- Geocodes via **Nominatim** (OpenStreetMap, free, no key, 1 req/sec) using `?city={city}&state={state}&country=USA&format=json&limit=1`.
- Sends required `User-Agent: NeuronGarage/1.0`.
- Writes lat/lng. Idempotent — safe to re-run.
- Triggered by a small "Backfill Coordinates" button in CityScoring header (internal, all 3 users).

**Map UI:**
- Add deps: `leaflet`, `react-leaflet`, `@types/leaflet`.
- New `src/components/city-scoring/MarketsMap.tsx` — Leaflet + OSM tiles, marker per filtered city with lat/lng. Marker color by tier (A=green, B=amber, C=gray, no-data=muted). Popup: city, state, score, tier, "View details" button wired to existing detail flow.
- Add `[Table | Map]` tab toggle above Ranked Markets in `CityScoring.tsx`. Map respects all current filters (state, search, tier, min-score).
- Cities missing lat/lng: omitted from map; footer shows "X cities not mapped — run backfill".

**Acceptance:** Run backfill once → map shows pins → filters update pins → click pin → popup → "View details" opens existing modal.

---

## Risks & rollback

| Step | Risk | Rollback |
|------|------|----------|
| 2 | Slow query on detail open | Add LIMIT, memoize per cityId |
| 3 | Empty for isolated cities | Empty state copy planned |
| 4 | Geocoding rate limit / wrong coords | Backfill idempotent; map hides null lat/lng |

## Out of scope
- Driving distance / radius search
- Marker clustering (defer until >500 cities)
- Manual lat/lng entry in Add City modal — next backfill picks up new rows
- Real-time map updates

## Order
Step 2 → Step 3 → Step 4 (schema + backfill + map last).
