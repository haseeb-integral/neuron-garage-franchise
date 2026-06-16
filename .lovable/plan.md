## Problem

Calibration gate is blocked because both Trinity and LeafSpring fail with `Accessibility lookup failed (overpass_highway_node, overpass_major_road_node)`. The engine correctly refuses to fabricate numbers — the actual problem is the upstream data source. Logs show OSM Overpass returning **429** (kumi mirror, rate-limited) and **406** (overpass-api.de, rejecting query) on every call. Overpass public mirrors are not reliable enough to be the only road-lookup source.

## Fix

Switch the primary "nearest highway / major road node" lookup from Overpass to **Mapbox Tilequery** against the `mapbox.mapbox-streets-v8` tileset. This uses the same `MAPBOX_TOKEN` we already have, is rate-limit-stable for our volume, and returns real OSM-derived road features classified by `class` (`motorway`, `trunk`, `primary`, `secondary`, …). No synthetic numbers anywhere.

Overpass becomes a secondary fallback only — if Mapbox tilequery itself fails (network/auth), we try Overpass, and only if both real sources fail do we throw the existing "Accessibility lookup failed" error.

### Changes (edge function only — no UI/business-logic change)

**`supabase/functions/_shared/mapbox.ts`**
1. Add `mapboxNearestRoad(lat, lng, classes[], radiusMi)`:
   - `GET https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/{lng},{lat}.json?radius={meters}&limit=50&layers=road&geometry=linestring&access_token=…`
   - Filter returned features where `properties.class` is in the requested set.
   - For each matching feature, take its geometry coords, compute haversine distance to origin, pick the closest point. Return `{lat, lng}` or `null`.
2. Rewrite `nearestHighwayNode` and `nearestMajorRoadNode`:
   - Try `mapboxNearestRoad` first (highway classes: `motorway`, `trunk`, `motorway_link`, `trunk_link`; major-road classes: `primary`, `secondary`).
   - If it returns `null` due to a transport/HTTP error (distinguish from "no roads found in radius"), fall back to existing `overpassNearestNode`.
   - If both fail, return `null` → engine throws the existing explicit error (no fake numbers).
3. Keep `drivingDistanceMiles` strict: remove the `haversine × 1.3` fallback so a Mapbox Directions failure also propagates as `null` and surfaces an explicit error rather than a synthetic distance. (Aligns with the "no silent fallbacks" rule we already applied to the rest of the engine.)

**`supabase/functions/compute-sas/index.ts`**
- No logic change. Error message text updates to: `Live road/highway distances unavailable — refusing to compute a score with synthetic data. Retried Mapbox Tilequery and Overpass; both failed.`

### Verification

1. Deploy `compute-sas`.
2. `curl_edge_functions` Trinity (Addison, TX) and LeafSpring (Plano, TX). Expect `status=ready` with real `highwayDistanceMi` and `roadDistanceMi`.
3. Read back `site_analyses` row to confirm `signals.accessibility.highwayDistanceMi` / `roadDistanceMi` are real numbers and `accessibility_score` is computed from them.
4. From the UI, click **Re-run** on both calibration anchors and confirm both cards show real scores instead of the red error box.

### Out of scope

- Cleaning up the parking tile / isochrone overlay (separate todo item already on the Feature 1B banner).
- Anything in the Tier-1 scoring math itself — the math change you already approved (no synthetic defaults) stays exactly as-is.
