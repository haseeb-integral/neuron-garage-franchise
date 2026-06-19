# Add Google Search as 5th Discovery Source

## Why this matters

Google Maps (already wired) and Yelp index **businesses with profiles**. Google **Search** indexes the **open web** — listicles, local-news roundups, niche kids-activity directories, parent blogs. These surface a different population of providers:

- Listicles like "15 Best Summer Camps in Boston for 2026" name 10–20 operators each, often indie premium studios.
- Niche directories (Mommy Poppins, Red Tricycle, Tinybeans, CampNavigator, ActivityTree) curate by city.
- Local news ("Boston Globe summer camp guide") covers established operators with long track records — exactly the Premium tier we under-weight today.

**Expected yield per city (after dedupe against the 4 existing sources):**
- Net new providers: **~20–40 per Tier-A city** (estimate based on overlap patterns: listicles typically name 12–18 operators each, ~40% overlap with Maps/Yelp).
- Multi-source overlap will jump materially — providers named in a listicle AND on Maps AND Sawyer = high-confidence Premium signal, which is what the tier classifier needs.

## Best mechanism — Firecrawl Search

`FIRECRAWL_API_KEY` is already connected and the function already uses Firecrawl. Firecrawl's `/v2/search` endpoint does the Google query AND scrapes the top results in a single call — no separate SerpAPI/Serper key, no CAPTCHA handling.

Reference: `https://api.firecrawl.dev/v2/search` with `query`, `limit`, and `scrapeOptions: { formats: ['markdown'] }`.

## Query strategy (per city)

Run **5 targeted queries** per city. Each captures a different listicle archetype:

1. `best summer camps for kids in {city} {state} 2026`
2. `best kids activities classes {city} {state}`
3. `{city} after school programs enrichment kids`
4. `kids music art gymnastics studios {city} {state}`
5. `things to do with kids in {city} {state} indoor`

Per query: `limit: 6`, `scrapeOptions: { formats: ['markdown'] }`. Excludes social-media noise via `excludeDomains: ['facebook.com', 'instagram.com', 'tiktok.com', 'pinterest.com', 'reddit.com']`. Strip our own marketplaces to avoid double-counting: also exclude `hisawyer.com`, `activityhero.com`, `yelp.com`, `google.com/maps`.

That's 5 queries × 6 results = up to 30 scraped pages per city. Gemini extracts providers from each.

## Cost & latency

- Firecrawl calls per city: 5 (search) + ~25 (scrapes wrapped inside) = ~30 credits.
- Add 60s to per-city pipeline runtime. Wrap in `FIRECRAWL_TIMEOUT_MS` per query so a single slow page can't stall the run.
- Hard cap: 40 providers extracted per query (Gemini system prompt enforces).

## Implementation

Single file: `supabase/functions/mvs-discover-providers/index.ts`.

1. Add new `Platform` type member `"google_search"` with `PLATFORM_PRIORITY` = `1.5` (between ActivityHero and Maps — listicle mentions are stronger than marketplace fillers, weaker than Maps' verified geo data).
2. Add `runGoogleSearch({ city, state, firecrawlKey, lovableKey })`:
   - 5 query variants above
   - For each: POST `/v2/search` with `scrapeOptions.formats=['markdown']`, `limit: 6`, exclude social/marketplace domains
   - Concatenate result markdowns, send to Gemini with prompt: *"Extract real local kids-activity provider businesses mentioned in these listicle/blog pages for {city}. EXCLUDE: the publication itself, generic categories, national chains' national websites, individual class titles. Prefer providers mentioned in ≥2 of the supplied pages."*
   - Tag each provider's `category_raw` with the listicle source domain for debugging
3. Call it from the source-results loop alongside the other 4.
4. The fuzzy upsert logic we just shipped will merge new search-found providers into existing rows (boosting `sources` jsonb) and insert genuinely new ones.

No DB migration needed — `sources` jsonb just accepts the new string `"google_search"`.

## Verification

After deploy + "Re-run All":

```sql
SELECT city,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE sources ? 'google_search') AS gsearch,
  COUNT(*) FILTER (WHERE jsonb_array_length(sources) >= 3) AS three_plus_sources
FROM mvs_providers GROUP BY city ORDER BY total DESC;
```

Success criteria:
- `gsearch` ≥ 20 per Tier-A city
- `three_plus_sources` (high-confidence Premium signal) jumps from current ~0–4 to ≥ 15 per city
- Manual spot-check on Boston: at least 5 well-known indie studios that don't appear in Maps results today.

## Out of scope

- Per-listicle ranking weights (could come later — for now, presence in a listicle is binary in `sources`).
- No separate SerpAPI/Serper integration. Firecrawl Search covers it.
- No UI changes.
