I agree with you: the previous change did not solve the real client-facing problem.

Plain English diagnosis:
- The embedded map is still using Mapbox GL, which requires WebGL. If WebGL fails in the browser/preview/mobile, the map area becomes the “Map preview unavailable” box.
- The parking tile is not using a reliable parking-lot source. It is currently only asking Mapbox’s POI label layer near the pin. If Mapbox does not label a nearby lot as a parking POI, the app says “Street only” or “Not detected,” even when a lot exists.
- So yes: the current page is not strong enough for a client demo.

Plan to fix:
1. Replace the card map preview with a non-WebGL static map image.
   - Use Mapbox Static Images API so the preview renders as a normal image.
   - This works much better in locked-down browsers and on mobile because it does not need WebGL.
   - Keep a “Live Map”/interactive path out of the card preview for now; reliability matters more for the client demo.

2. Keep the 10-min / 15-min isochrone data, but render it into the static map URL.
   - Show the pin plus simplified isochrone overlays where possible.
   - If overlay encoding is too large for the URL, fall back to static map + pin and do not show the broken WebGL box.
   - The user should never see “Map preview unavailable” unless the map token itself is missing or the image fails.

3. Replace parking wording so it does not overclaim.
   - Stop showing “Street only” as if we know the parking condition.
   - Use labels like “Parking not verified” or “Nearby parking signal found” based on available evidence.
   - This prevents embarrassing false negatives in front of the client.

4. Improve parking source in the backend.
   - Keep the existing Mapbox Tilequery signal.
   - Add a stronger secondary lookup using OSM-style parking features if feasible in the current backend path.
   - Return source/debug fields so we can distinguish “no lot found” from “source could not verify.”

5. Verify in the preview.
   - Confirm the cards show map imagery instead of the gray error box.
   - Confirm parking tiles no longer say misleading “Street only” for null/weak data.

Technical notes:
- Frontend file likely touched: `src/components/site-analysis/IsochroneMap.tsx`.
- Parking display likely touched: `src/pages/SiteAnalysis.tsx`.
- Parking backend likely touched: `supabase/functions/_shared/mapbox.ts` and possibly `supabase/functions/compute-sas/index.ts`.
- After backend changes, the compute function must be redeployed and existing candidates must be re-run to refresh parking results.