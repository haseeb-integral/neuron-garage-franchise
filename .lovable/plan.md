## Root cause

The Flip to live button on `/market-validation/rollout` does work at the data layer — Houston and New York are already saved as `mvs_data_source = 'live'` in `mvs_city_flags`. The problem is the main `/market-validation` shortlist page is hardcoded to overlay only Austin's live data. So when you flip NY or Houston to live, the rollout table updates but the main shortlist still shows the sample numbers for those cities, which looks like "flip not working" and "scores not showing".

## Fix

1. In `src/pages/MarketValidation.tsx`, replace the single Austin `useLiveMvs` call with one `useLiveMvs` call per Tier A city (Austin, NY, Houston, Chicago, Boston, San Antonio, Philadelphia, LA). Hooks at fixed positions, no conditional calls.
2. Build the `liveOverlays` map dynamically: for each Tier A city whose flag is `live` and whose `result` has loaded, push an overlay onto the row using the shortlist row id mapping (e.g. `New York, NY` to `new-york-ny`).
3. When a city is live, its shortlist row composite, pillar scores, and low confidence badge come from `computeMvs`, exactly the same helper the Austin row, rollout page and PDF already use. Brett's "one calibrated number everywhere" rule preserved.
4. No backend, schema, or rollout page changes. Sample rows for non-flipped cities stay exactly as they are.

## Verification

- Reload `/market-validation`. NY and Houston rows should now show real composite + pillar scores from `computeMvs`, not the sample 82 / 76.
- Flip Houston back to sample on the rollout page; the shortlist row reverts to sample 76 within the next refresh.
- Austin row keeps working unchanged.
- No console errors, no extra requests for cities that are still on sample (the hooks still fire but compute is cheap and reads are city-scoped).

## Files

- `src/pages/MarketValidation.tsx` only.