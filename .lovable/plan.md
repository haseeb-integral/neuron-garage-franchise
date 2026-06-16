Remove the Parking tile from the candidate card metric grid (per Sam's brief v2.2 / SOW v2.2 — parking is not a spec requirement).

Scope:
- Drop the Parking tile from `MetricTiles` in `src/pages/SiteAnalysis.tsx`. Grid becomes 5 tiles: Median HHI · 10m, HH >$150k · 10m, Kids 5-12 · 10m, Drive to hwy, Pop · 15m. Keep the `grid-cols-3` layout — the last row will just have two tiles, which reads cleanly.
- Remove the now-unused `PARKING_LABEL` constant and the `parking`/`parkingValue` local variables.

Not changing:
- Backend `parkingSignal()` in `supabase/functions/_shared/mapbox.ts` and the `parking` field on the `signals` object in `compute-sas` stay wired. Zero client impact; trivial to re-surface if ever asked. No redeploy needed.
- Type definition in `src/hooks/useSiteScore.ts` (`parking?: ...`) stays — it's optional and unused fields don't hurt.
- Feature1BStatus parking-tile note in `src/components/phase2-demo/Feature1BStatus.tsx` is internal dev status; leave as historical record.

Verification:
- Reload the page. Cards show 5 metric tiles, no parking tile, no broken-looking "Street only" / "Not verified" text anywhere in the candidate card UI.
- TypeScript compiles clean (no unused-import errors).

Map fix from the previous turn (Static Images API) stays as-is — already shipped and matches Manus's recommendation.