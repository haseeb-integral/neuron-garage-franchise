## What the smoke test proved

- **Google Search source works very well**: 42–68 new providers per city via gsearch. Extractor and Firecrawl `/v2/search` are not the problem.
- **`two_plus_sources` (cross-source overlap) jumped ~4×** — exactly the Premium signal Brett cares about.
- **But 8 of 9 cities returned HTTP 504** because the discover function now runs past the 150-second edge-function idle timeout. Data still landed (writes happen incrementally) but `mvs_pipeline_runs.status = 'failed'`, which breaks the UI and any downstream "did this city succeed?" logic.
- **Denver is broken separately**: Google Maps actor returns 0 for Denver, and the 504 prevented gsearch from writing too. Total stuck at 3.

## Fixes (two independent issues)

### Fix 1 — Stop the 150s timeout on discover

Run the 4 sources in parallel instead of sequentially. Today the loop is:

```
runSawyer → runActivityHero → runGoogleSearch → runYelp   (sequential, ~3–5 min total)
```

Change to:

```ts
const [sawyer, ah, gsearch, yelp] = await Promise.all([
  runSawyer(...), runActivityHero(...), runGoogleSearch(...), runYelp(...)
]);
sourceResults.push(sawyer, ah, gsearch, yelp);
```

Wall-clock drops to ≈ max(source_time) ≈ 60–90s instead of sum-of-all. Well under 150s.

Also inside `runGoogleSearch`: parallelize the 5 listicle queries with `Promise.all` instead of `for` loop. That alone cuts gsearch from ~60s → ~15s.

No schema change. No API change. ~15 lines edited in `supabase/functions/mvs-discover-providers/index.ts`.

### Fix 2 — Denver Google Maps returns 0

Separate bug from gsearch. The Apify Google Maps actor is failing for Denver specifically — likely a bbox or query-construction issue. Diagnosis steps:

1. Read `mvs_pipeline_runs` for the last Denver run, pull the `debug` log we already write inside `runGoogleMaps`.
2. Manually invoke `mvs-discover-providers` with `{ city: "Denver, CO" }` and inspect the Maps debug section.
3. Likely fixes (in order of probability):
   - Bad bbox in `us_cities_geo` for Denver → patch the row.
   - Apify actor returning empty for the specific search term → adjust query string for cities where keyword "kids activities" returns 0.
   - Geocoding fallback missing → add lat/lng-based search variant.

This is a 1-turn investigation + 1-turn fix.

### Out of scope this round

- Re-running cities just to clean up the `failed` status. Once Fix 1 is in, a single "Re-run All" will set everything back to `done` and possibly add a few more providers (the 504'd runs may have skipped Yelp on a few cities).
- Tuning gsearch yield — it's already over target.
- Boosting `three_plus_sources` — by design gsearch finds providers Maps misses; low three_plus is expected and correct.

## Order of operations

1. Apply Fix 1 (parallelize sources + gsearch queries).
2. Trigger "Re-run All" once.
3. Verify: all 9 cities `status = done`, runtime < 120s each.
4. Diagnose + apply Fix 2 for Denver.
5. Final per-city report.
