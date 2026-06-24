## Why the 7 boxes are empty

When you save a site, we store only the final scores in `snapshot_json`:
- pillars (5 sub-scores)
- composite (the big number)
- band, verdict

We do NOT save the raw signal numbers (Median HHI, kids 5–12, pop, drive distances, etc.) or the map data.

So when you load a saved snapshot back into a slot:
- The composite (60.57) and sub-scores show — they came from `snapshot_json.pillars`.
- The 7 metric tiles are empty because `slot.result.signals` is `undefined`.
- The map is also empty for the same reason.

This is in `src/pages/SiteAnalysis.tsx` → `handleLoadSavedSite` (line ~1355). It builds `snapshotResult` with only `sas`, `pillars`, `geo` — no `signals`.

## Fix plan (one small phase, one turn)

Two changes, both in the loader path. No DB migration, no scoring change.

### Change A — On load, fetch cached signals from `site_analyses`

The site was already scored once, so a row exists in `site_analyses` for the same lat/lng/site_type with the full `signals` JSON (we already use this pattern elsewhere in the file — see lines 1014 and 1298). 

In `handleLoadSavedSite`:
1. After building `snapshotResult`, query `site_analyses` for the latest row matching `row.lat`, `row.lng`, `row.site_type`, ordered by `created_at desc`, limit 1.
2. If found, attach `cached.signals` to `snapshotResult.signals` so:
   - The 7 metric tiles fill in (`MetricTiles signals={...}`).
   - The map renders (uses `signals.provenance` and `geo`).
   - Formula tooltips show real numbers instead of `—`.
3. If no cached row exists (very old save), leave signals undefined and keep the current behaviour — user can click Re-run.

This is read-only and matches what `useEffect` at line 1014 already does on first mount.

### Change B — Going forward, also store signals in the snapshot itself

So future saves work even if the `site_analyses` row is deleted:

1. In `src/hooks/useSavedSites.ts` line 28, extend the `snapshot_json` type to include `signals?: SiteScoreSignals`.
2. Wherever `addSite(...)` is called (the bookmark/save button) — pass `signals: slot.result?.signals` into the snapshot object.
3. In `handleLoadSavedSite`, prefer `snap.signals` first, fall back to the `site_analyses` lookup from Change A.

`snapshot_json` is a JSONB column, so no schema change needed.

## What is NOT touched

- Scoring math, pillar recompute, composite calculation — unchanged.
- Saved Sites list UI (the drawer list itself) — unchanged.
- `site_analyses` table, exports, compare modal — unchanged.
- Session storage / tab-switch behaviour from the last fix — unchanged.

## Risk

Very low. Worst case the `site_analyses` lookup returns nothing and the card looks exactly like it does today (still no boxes). New saves will always work because we store signals inline.

## Smoke test after build

1. Open a saved snapshot card → 7 boxes should fill with numbers, map should render.
2. Big composite number should still match what it showed before (60.57).
3. Save a brand-new site → reload page → open it again → boxes filled.
4. Remove a card → switch tabs → it stays removed (no regression on last fix).

## Estimated turns

1 turn to implement both changes, 1 turn buffer if a typecheck issue appears.

Approve and I will build it.
