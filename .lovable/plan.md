
# Add 3 more provider platforms to `mvs-discover-providers`

Today the discover function only scrapes Sawyer (3 search variants). For thinly-covered cities (Austin returned 1 provider after Phase 7 rollout) Sawyer alone misses most of the real market. This plan adds **3 additional sources**, unions all results, dedupes by normalized name, and writes them to `mvs_providers` with a per-source `platform` tag.

After this turn we go back to Brett's order: #5 cleanup → #3 ACS → #2 QA Queue → #1 PDF → #4 Tier A rollout → #6+#7 verification.

## The 3 new sources

| # | Source | Why | How we fetch |
|---|---|---|---|
| 1 | **ActivityHero** (`activityhero.com/s/<city>-<state>/camps`) | Largest US camps marketplace after Sawyer; strong in mid-size metros. | Firecrawl scrape (markdown + screenshot), Gemini extract. |
| 2 | **Google Maps** ("kids summer camp near <city>") | Catches independent providers that aren't on any marketplace. | Apify Google Maps actor (we already have `APIFY_API_TOKEN` + `APIFY_GOOGLE_MAPS_ACTOR_ID`). No Firecrawl needed. |
| 3 | **Yelp** (`yelp.com/search?find_desc=Kids+Activities&find_loc=<city>`) | Strong long-tail coverage; useful tiebreaker for dedupe. | Firecrawl scrape, Gemini extract. |

If you'd rather swap one out (e.g. KidPass, Mommy Poppins, Eventbrite kids-camps), say so and I'll substitute before building.

## What changes

### Edge function: `supabase/functions/mvs-discover-providers/index.ts`

1. Refactor the current Sawyer-only loop into a `sources` array:
   ```ts
   const sources = [
     { platform: 'sawyer',       run: () => scrapeSawyer(city, box) },
     { platform: 'activityhero', run: () => scrapeActivityHero(city, state) },
     { platform: 'google_maps',  run: () => fetchGoogleMaps(city, state) },
     { platform: 'yelp',         run: () => scrapeYelp(city, state) },
   ];
   ```
2. Run all 4 sources sequentially (parallel risks Firecrawl rate limits). Each `run()` returns `ProviderExtract[]` plus an optional screenshot URL.
3. Union → dedupe by `normalizeName(name)`. When the same provider appears in N sources, keep the first hit and stash `sources_seen: ['sawyer','google_maps']` in a new `mvs_providers.sources` jsonb column (cross-source presence is a strong quality signal we'll use later for tier classification 2.2).
4. Each row inserted with the platform of the source that found it first; if seen in >1 source, prefer `sawyer > activityhero > google_maps > yelp` (most structured first).
5. Screenshot column keeps Sawyer's screenshot for backward compat; other sources don't store screenshots in v1.
6. Per-source failures are swallowed and logged — one source going down must not fail the whole run.

### Helpers added to the same file
- `scrapeActivityHero(city, state)` — builds URL like `https://www.activityhero.com/s/austin-tx/camps`, Firecrawl `formats: ['markdown']`, sends markdown to Gemini with the existing extraction prompt (tweaked to mention "ActivityHero").
- `fetchGoogleMaps(city, state)` — POSTs to Apify run-sync endpoint with `searchStringsArray: ['kids summer camp <city> <state>', 'kids classes <city> <state>']`, max 30 results each. Maps actor output → `ProviderExtract` (name from `title`, url from `website`, no price).
- `scrapeYelp(city, state)` — Firecrawl scrape of Yelp search URL, Gemini extract.

### DB migration
Add nullable `sources jsonb default '[]'::jsonb` column to `mvs_providers`. Backfill is unnecessary (Phase 2 data is dev-only).

### Frontend
No UI changes this turn. The City Scoring Console pillar counts already read from `mvs_providers` and will naturally fatten.

## Out of scope (explicit)
- No tier-classifier changes (that's Brett's separate follow-on).
- No new extract-weeks behavior — `mvs-extract-weeks` still only knows Sawyer week URLs; non-Sawyer providers are counted toward provider-count pillars but contribute 0 weeks until 2.2/3.x extends extraction.
- No QA queue changes.
- No score recalibration this turn.

## Verification before declaring done
1. Re-run `mvs-run-pipeline` on Austin via the UI button.
2. Confirm `mvs_providers` row count for Austin jumps from 1 to >10 and includes at least 1 row with `platform='google_maps'` and 1 with `platform='activityhero'`.
3. Confirm `mvs_pipeline_runs` ends in `succeeded` and per-source failures (if any) appear in the run's `error` JSON, not as a hard failure.
4. Open the Austin detail panel and confirm pillar provider counts updated.

## Technical notes
- Apify run-sync endpoint: `https://api.apify.com/v2/acts/<ACTOR_ID>/run-sync-get-dataset-items?token=$APIFY_API_TOKEN`. Timeout 60s, memory 1024.
- Yelp aggressively rate-limits; Firecrawl's residential pool usually gets through, but we accept that Yelp may return 0 some runs.
- Gemini prompt stays the same shape; only the "platform name to exclude from provider list" string changes per source.
- Total external call budget per discover run: 3 Sawyer + 1 ActivityHero + 1 Yelp Firecrawl scrapes = **5 Firecrawl scrapes** (up from 3) + **2 Apify Google Maps runs** + **5 Gemini extractions**.
