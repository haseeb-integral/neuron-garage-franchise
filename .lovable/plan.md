# Accessibility Pillar v0.2 — Real Drive-to-Highway

Replace the v0.1 placeholder (both `roadDistanceMi` and `highwayDistanceMi` hardcoded to `null` → `roadFactor`/`highwayFactor` both return 70) with real measured driving distances. No schema changes, no new tables, no new secrets — `MAPBOX_TOKEN` already exists.

## Approach

For each site, after geocoding:

1. **Find nearest highway access point.** Query OpenStreetMap Overpass API for `highway=motorway|trunk|motorway_link|trunk_link` nodes within ~12 mi of the site. Take the geographically closest node (haversine).
2. **Find nearest major surface road.** Same Overpass query, this time `highway=primary|secondary`, within ~3 mi. Take closest node.
3. **Convert each to driving miles** via Mapbox Directions API (`driving` profile, point-to-point). Fall back to haversine × 1.3 if Directions fails or returns nothing.
4. **Pass into `accessibilityScore`** — the existing `roadFactor` / `highwayFactor` curves already accept these miles, so the math is unchanged.

If Overpass is unreachable or returns zero results within the search radius, leave the value `null` and let the existing factor fallback (70) handle it — this preserves engine stability.

## Files to change

**`supabase/functions/_shared/mapbox.ts`** — add three helpers:

- `nearestHighwayNode(lat, lng, radiusMi = 12): Promise<{lat,lng} | null>` — Overpass query (`motorway|trunk|motorway_link|trunk_link`), returns closest node or null.
- `nearestMajorRoadNode(lat, lng, radiusMi = 3): Promise<{lat,lng} | null>` — same shape, `primary|secondary`.
- `drivingDistanceMiles(from, to): Promise<number | null>` — Mapbox Directions `/driving/{lng,lat};{lng,lat}?overview=false`, returns `routes[0].distance` (meters) ÷ 1609.34, or `null` on failure.

All three log and swallow errors (return null) so a flaky vendor doesn't take down a site analysis.

**`supabase/functions/compute-sas/index.ts`** — after geocode, run highway + road lookups in parallel (`Promise.all`), then pass into `accessibilityScore`:

```ts
const [hwyNode, roadNode] = await Promise.all([
  nearestHighwayNode(geo.lat, geo.lng),
  nearestMajorRoadNode(geo.lat, geo.lng),
]);
const [highwayDistanceMi, roadDistanceMi] = await Promise.all([
  hwyNode ? drivingDistanceMiles(geo, hwyNode) : Promise.resolve(null),
  roadNode ? drivingDistanceMiles(geo, roadNode) : Promise.resolve(null),
]);
```

Pass both into `accessibilityScore({...})`. Bump `ENGINE_VERSION` from `sas-v0.1` to `sas-v0.2`. Add `highwayDistanceMi` and `roadDistanceMi` into the `signals` payload so the frontend can render them.

**`src/pages/SiteAnalysis.tsx`** — two small reads:

- Replace the "Drive to hwy" tile placeholder (line 425) with the real value from `signals.highwayDistanceMi` when present, formatted as `X.X mi`. Keep dash + tooltip when null.
- Update the Accessibility `PillarBar` `detail` string (line 292) to read the actual numbers: `0.3 × roadFactor(${roadMi}mi) + 0.3 × hwyFactor(${hwyMi}mi) + 0.4 × popReachable_norm(${pop}) = ${value}` (and explain "engine fallback (70)" if a distance is null).

## Out of scope

- ACS polygon intersection v0.2 — separate task, separate plan.
- Caching Overpass responses to a table — Overpass is free + we already cache the whole analysis row, so no per-coord cache yet.
- Parking lot detection — not part of v0.2; the parking sub-signal stays out of the formula (it was never wired in v0.1 either).
- Frontend calibration delta confirmation — calibration check remains parked pending Brett.

## Verification

After deploy:
1. Run engine on Trinity Christian Academy and LeafSpring Plano via the Live Engine box.
2. Inspect `signals.highwayDistanceMi` / `roadDistanceMi` in the returned JSON.
3. Confirm Accessibility scores differ from the old constant ~70 baseline.
4. Log entry in `.lovable/phase-2/CHANGELOG.md`.

## Risk

- **Overpass rate-limiting.** Public endpoint can throttle. Mitigation: bounded query (1 bbox call per site, 25 s timeout), null-safe fallback so the pillar still scores via the existing 70 default.
- **Mapbox Directions cost.** 2 routing calls per analysis. Acceptable at current usage (analyses are explicit user actions, not bulk).
