## Plain-English summary

Three separate issues. None of them is "we forgot to use Brett's Mapbox key" — the key is wired correctly server-side (`MAPBOX_TOKEN` secret) and the client fetches a short-lived token via the `get-mapbox-token` edge function. Geocoding, isochrones, and tile queries all work — that's why your scores compute. The map *render* is failing in your browser for a different reason.

### 1. Why every map says "WebGL disabled"

The code in `src/components/site-analysis/IsochroneMap.tsx` calls `mapboxgl.supported()` and shows the fallback if that returns `false`. In Mapbox GL JS v3 (we're on 3.24.1), that helper is over-aggressive inside sandboxed iframes like the Lovable preview — it can return `false` even when WebGL actually works. That's why all four cards fall back at once on your desktop browser. It's not really a WebGL problem, it's a bad preflight check.

**Fix:** drop the `mapboxgl.supported()` precheck and let the existing `try/catch` around `new mapboxgl.Map(...)` be the only guard. Also hook `map.on("error", …)` so an actual WebGL context-creation failure (which is the genuine "no WebGL" case — old phones, locked-down corporate browsers) still flips to the fallback box with the same message. Net effect: maps render for ~99% of users including the Lovable preview; the small minority truly without WebGL still see the graceful fallback. No new dependency, no different map provider — same Mapbox token.

Mobile note: modern iOS Safari and Android Chrome support WebGL. The same fix covers them. If you want a true raster fallback later (static image tile served by Mapbox's Static Images API, no WebGL needed), that's a separate enhancement we can layer on.

### 2. Why parking shows "Street only" or null

The parking data source is **Mapbox Tilequery** against the `poi_label` layer within a 200 m radius of the geocoded pin. Logic in `supabase/functions/_shared/mapbox.ts` (lines 294–330):

- POIs tagged `parking` found → bucket = `small_lot` (1–2) or `large_lot` (3+).
- Zero parking POIs but other POIs nearby → bucket = `street_only` (Mapbox often misses informal lots).
- Zero POIs at all → bucket = `none` (renders as "null" in the UI).

There is no cleaner public dataset for franchise-grade parking inventory — Mapbox's POI layer is the standard. What's wrong today: the 200 m radius is too tight (a school's parking lot can sit 250–400 m from the pin), so we keep landing in the "street_only" default. **Fixes in this turn:**

1. Widen `radiusMeters` from 200 → 400 in `parkingSignal()`.
2. Also accept POIs whose `class` is `parking_lot` / `parking_garage` (the v8 streets schema uses these alongside `parking`).
3. Re-bucket thresholds: 0 = `street_only`, 1–3 = `small_lot`, 4+ = `large_lot`. Drop the confusing "none" bucket — render an explicit "Not detected" label in the card instead of blank.
4. Display label in the metric tile: show "Street only", "Small lot", "Large lot", or "Not detected — verify on site" — never blank.

If after this you still find specific addresses where the bucket is obviously wrong, the next-tier upgrade is Overpass / OpenStreetMap `amenity=parking` polygons (free, no key) as a secondary source — flag if you want that added now.

### 3. Drop "Phase 2 · Feature 1B" from the page header

In `src/pages/SiteAnalysis.tsx` line 914, replace the `PageHeader` subtitle:

- Before: `"Phase 2 · Feature 1B — Per-site opportunity scoring with side-by-side comparison up to 4 candidates."`
- After: `"Score up to 4 candidate sites side by side and pick the one to commit to."`

## Files touched

1. `src/components/site-analysis/IsochroneMap.tsx` — remove `mapboxgl.supported()` precheck, add `map.on("error", …)` handler, keep existing try/catch and fallback box.
2. `supabase/functions/_shared/mapbox.ts` — widen parking radius to 400 m, accept `parking_lot`/`parking_garage` classes, re-bucket, return a clear `bucket` even when none detected.
3. `src/pages/SiteAnalysis.tsx` (parking tile) — render "Not detected — verify on site" when the bucket comes back missing, instead of blank.
4. `src/pages/SiteAnalysis.tsx` (header) — replace the subtitle.

No schema changes, no weight changes, no new dependencies, same Mapbox token.

## Question

OK to proceed exactly as above, or do you also want the OSM `amenity=parking` secondary source added now for tougher addresses?
