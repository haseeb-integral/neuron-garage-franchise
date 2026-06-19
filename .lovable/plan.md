# Fix 3 Discovery Issues

Root causes confirmed from code + DB inspection of `supabase/functions/mvs-discover-providers/index.ts` and `mvs_providers`.

## Issue 1 — ActivityHero returns ~1 provider per city

**Root cause:** Single URL `https://www.activityhero.com/s/{slug}-{state}/camps` is the wrong path pattern. Real ActivityHero city pages use `/camps/{city}-{state}` and `/classes/{city}-{state}`. The current URL renders a near-empty SPA shell, so Gemini gets no real provider list.

**Fix:**
- Replace single-URL scrape with **3-variant scrape** (mirrors Sawyer pattern):
  1. `https://www.activityhero.com/camps/{city-slug}-{state}`
  2. `https://www.activityhero.com/classes/{city-slug}-{state}`
  3. `https://www.activityhero.com/search?q=kids&location={city}+{state}` (fallback)
- Bump `waitFor` from 3000 → 5000 ms (ActivityHero is heavy JS).
- Add a Firecrawl `formats: ["markdown", "links"]` so we can also pull anchor hrefs for provider discovery when markdown is sparse.
- Each variant logged separately in `debug.activityhero.variants[]`.

## Issue 2 — Denver only has 3 providers, all `sources: []`

**Two root causes:**

a. **Stale rows skipping re-insert.** Lines 562–565 do `existingNames = SELECT name WHERE city=X` then `rows.filter(r => !existingNames.has(...))`. Result: on re-runs, providers that already exist are silently dropped — including their newly-discovered `sources` array. Denver's 3 Sawyer rows pre-date the multi-source change; the re-run never updated them.

b. **Denver not in `TIER_A_BOXES`.** Falls through to `us_cities_geo` fallback box. That works for Sawyer, but means none of the orchestrator's Tier-A "Re-run All" loops include Denver. Need to confirm whether Denver should be in shortlist; if yes, add a box; if no, drop the orphan rows.

**Fix:**
- Replace the "filter out existing names" pattern with **UPSERT on (city, lower(name), platform)** using the existing unique index — so `sources`, `website_url`, `confidence`, `price_min/max` get merged into existing rows on every run.
  - Merge strategy on conflict: `sources = mvs_providers.sources || EXCLUDED.sources` (jsonb union, deduped), keep highest `confidence`, fill nulls from new row.
  - Because Postgres jsonb union isn't a single operator, do it via `ON CONFLICT DO UPDATE SET sources = (SELECT jsonb_agg(DISTINCT v) FROM jsonb_array_elements(mvs_providers.sources || EXCLUDED.sources) v)`.
- Add `Denver, CO` to `TIER_A_BOXES` (box `{top: 40.10, left: -105.30, bottom: 39.50, right: -104.60}`) so it gets the same treatment as other Tier-A cities.
- Trigger a one-off `mvs-discover-providers` run for Denver after deploy.

## Issue 3 — Cross-source overlap is near-zero (max 4 per city)

**Root cause:** `normalizeName(n)` = lowercase + strip punctuation only. So "ABC Music Studio" vs "ABC Music" vs "ABC Music Studios LLC" all hash differently → never merge across sources → tier classifier loses the "3+ sources = real operator" signal it expects.

**Fix:** Add a second-pass fuzzy merge after the exact-key merge:
- Strip common suffixes (`llc`, `inc`, `studio(s)`, `academy`, `school`, `co`, `the`, `kids`, `for kids`) and trailing single-letter tokens.
- Collapse multiple spaces; compute a **bigram Jaccard** similarity.
- Merge entries with Jaccard ≥ 0.75 OR where one normalized name is a strict prefix of the other (≥ 6 chars). When merging, union `sources_seen` and keep highest-priority platform.
- Same normalization is reused for the upsert key (so existing-row matching also benefits) — store the canonical form in a new derived column or compute on the fly via the unique index expression.

**No DB migration needed for #3** — all logic stays in the edge function; the existing unique index `(city, lower(name), platform)` remains, we just match harder before inserting.

## Files Touched

- `supabase/functions/mvs-discover-providers/index.ts`
  - Rewrite `runActivityHero` to 3-variant pattern
  - Add `Denver, CO` to `TIER_A_BOXES`
  - Replace existing-name filter with proper upsert + jsonb sources union
  - Add `fuzzyMergeProviders()` second-pass dedupe
- One-off invocation of `mvs-discover-providers` for Denver after deploy (single curl).

## Verification

After deploy + re-run:
```sql
SELECT city, COUNT(*), COUNT(*) FILTER (WHERE jsonb_array_length(sources) >= 2) AS multi
FROM mvs_providers GROUP BY city ORDER BY 2 DESC;
```
- ActivityHero count per city should jump from ~1 → 10–30.
- Denver total should jump from 3 → 80+.
- `multi` (cross-source overlap) should rise from 0–4 → 15–40 per city.

## Out of scope

- No changes to `mvs-classify-tier` — once `sources` is populated correctly, the existing tier logic will improve automatically.
- No UI changes.
