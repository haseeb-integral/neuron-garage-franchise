# Fix: saved snapshot map shows only a pin, no 10/15-min drive rings

## Why this happens
- Saved snapshots store: pillars, composite, band, verdict, and (after the last fix) the 7 raw signal numbers.
- They do NOT store the 10-min / 15-min drive polygons (isochrones). Those polygons are big GeoJSON, so they live in a separate table `site_analysis_isochrones` keyed by `analysis_id`.
- On load, we hydrate signals from the latest `site_analyses` row, but we never look up the matching rows in `site_analysis_isochrones`. So `iso10` and `iso15` stay `undefined`, and the static Mapbox image renders as a bare pin.

## Fix in one phase
**Change A — On load, also hydrate isochrones from the cache.**
In `src/pages/SiteAnalysis.tsx` `handleLoadSavedSite` (~line 1392):
1. When we query `site_analyses` for cached signals, also select its `id` (call it `cachedAnalysisId`).
2. If `cachedAnalysisId` exists, query `site_analysis_isochrones` for `analysis_id = cachedAnalysisId, minutes in (10,15)`.
3. Pick the row where `minutes = 10` → `iso10`, `minutes = 15` → `iso15` (read from the `geojson` column).
4. Attach `iso10` and `iso15` to `snapshotResult` alongside the existing `geo` and `signals`.

That's it. The existing `IsochroneMap` component already knows how to render the rings if `iso10` / `iso15` are present.

## What is NOT touched
- Scoring math, pillar recompute, composite, signals hydration logic, snapshot save path, session storage, the empty-slot + popover, the prominent buttons.
- `snapshot_json` shape stays the same (we are NOT going to bloat it with polygons).
- No new tables, no migrations.

## Risk
- Very low. Read-only extra query. If it fails or no isochrones exist for that old analysis, the map gracefully falls back to today's pin-only view (current behavior).

## Pages / components affected
- `src/pages/SiteAnalysis.tsx` only (one function: `handleLoadSavedSite`).

## Edge cases
- Very old saved sites whose `site_analyses` row was deleted → no iso, pin-only (unchanged today).
- User clicks **Re-run** → fresh isochrones come from the live compute (unchanged today).

## Estimate
1 Lovable turn. Smoke test: open the LeafSpring Cedar Park saved card → the map should now show two blue rings around the pin instead of just the pin.

Approve and I'll ship it.
