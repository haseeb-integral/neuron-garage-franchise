## Goal

Take honest metric coverage in `us_cities_scored` from ~14 of 46 fully populated to ~26 of 46, **without spending a dollar or adding a single API key**. All sources below are either already wired, free + keyless, or already have a working `*_API_KEY` in Lovable Cloud.

After this, the only remaining gaps are Apify (~$5.8k/yr decision for Brett) and GreatSchools ($630/yr for Brett).

## Order of execution (cheapest → most valuable first)

### Step 1 — NCES rollups we already have raw data for
**Zero new API calls.** All 38,196 rows in `public_schools` are already cached.

In `seed-cities-database`, add post-loop aggregation per city:
- `charter_elementary_count` = COUNT(`public_schools` WHERE `us_cities_scored_id = X AND is_charter = true AND is_elementary_serving = true`)
- `school_hosted_camp_count` — derive later from Firecrawl pass; **for now, leave null** (don't fake the number — Rule from AGENTS.md)
- `school_based_summer_camp_count` — same, leave null until Firecrawl runs

Run as `{ rollups_only: true }` — ~5 seconds, no external API calls.

**Closes:** `charter_elementary_count` for all 948 cities.

### Step 2 — Name-vs-Meaning rename (forced by Step 1)
Per AGENTS.md Rule 10. Currently:
- `charter_elementary_count` ← only counts elementary-serving charters (correct)
- `private_elementary_count` ← will be filled in Step 6 with **all** private K–12 in city, not just elementary

If Step 6 will populate the field with all-grade private schools, the name lies. Two choices:
- **(a)** Keep name strict — Step 6 only writes elementary-serving private schools. Adds a private-school grade filter to NCES PSS query.
- **(b)** Rename `private_elementary_count` → `private_school_count` + add a separate `private_elementary_count` populated from grade filter.

**Recommended: (a)** — keeps existing column meaning intact, smaller migration. Step 6 will filter by `lowest_grade_offered ≤ 5`.

### Step 3 — BLS OEWS Occupational Wages
**Zero new keys** (`BLS_API_KEY` already in env).

Add two new BLS series to `metricFetchers.ts`:
- OEWS code `39-9011` (Childcare Workers) → `childcare_nanny_hourly_rate_proxy`
- OEWS code `25-3099` or `39-9032` (Recreation/Camp Counselors) → `guide_wage_proxy`

Pulled per metro, mapped to all cities in that metro. ~948 calls, well under daily limit, batched over an hour.

**Closes:** 2 metrics (1 pricing_power, 1 ease_of_operations).

### Step 4 — Weather (Open-Meteo, free, keyless)
**Zero new keys.** Open-Meteo Historical Weather API is fully free, no signup.

New file: `supabase/functions/_shared/weatherFetcher.ts`. For each city, pull 5-year climate normals for lat/lng and derive:
- `summer_weather_index` (composite of June–Aug temps + precipitation days)
- `avg_peak_summer_temperature` (mean Jul–Aug daily high)
- `days_above_100f` (annual count)

948 calls, batched 50/sec per Open-Meteo limits → ~20 seconds. One-time pull, never needs refresh.

**Closes:** 3 demand metrics.

### Step 5 — Google Trends (free, keyless)
**Zero new keys.** Use the `google-trends-api` npm package via Deno's npm: specifier.

New `seed-cities-google-trends` edge function. For each city:
- Query: `"summer camp [city]"` → 12-month relative interest → `google_search_demand_summer_camp`
- Query: `"summer day camp [city]"` → `google_search_demand_summer_day_camp`

Rate-limit: Google Trends silently blocks at ~1 req/sec. Run 948 cities × 2 queries = 1,896 calls over ~32 min with 1s delay. Schedule as a one-time invocation.

**Closes:** 2 competitive_landscape metrics.

### Step 6 — BEA state-level RPP fallback + NCES PSS for private schools
**Zero new keys.** Both already wired.

Two patches to `seed-cities-database`:

**6a — BEA RPP fallback:** Today only 471/948 cities have `cost_of_living_index` (metros only). Add fallback: when metro RPP missing, use state-level RPP (always available). Note in `raw` JSON that value is state-imputed. Brings coverage to 948/948 with a confidence flag.

**6b — NCES Private School Universe (PSS):** Same free Urban Institute endpoint as CCD. Pull all private schools per city, filter `lowest_grade_offered ≤ 5`, count, write to `private_elementary_count`. ~3,000 cities-worth of API calls; rate-limited, runs in ~10 min.

**Closes:** `cost_of_living_index` coverage gap + `private_elementary_count`.

## What this unlocks

| Metric | Before | After |
|---|---|---|
| Live, populated, all 948 cities | 14 of 46 | **24 of 46** |
| Partial (BEA-metro-only) | 4 | 0 |
| Awaiting Apify (Brett to approve) | 12 | 12 |
| Awaiting GreatSchools (Brett key) | 3 | 3 |
| Defined as `status: "missing"`/`"blocked"` in registry — defer indefinitely | 10 | 10 |
| Honest count of "active" sub-metrics feeding composite | 18 | **28** |

After this, every category score is computed from at least 3 real metrics (today, `score_competitive` only has 1 weak proxy for half the cities).

## Files to touch

1. `supabase/functions/seed-cities-database/index.ts` — add `rollups_only` mode (Step 1), BEA fallback (Step 6a), NCES PSS pass (Step 6b)
2. `supabase/functions/_shared/metricFetchers.ts` — add BLS OEWS series (Step 3)
3. `supabase/functions/_shared/weatherFetcher.ts` — **new** (Step 4)
4. `supabase/functions/seed-cities-weather/index.ts` — **new** wrapper (Step 4)
5. `supabase/functions/seed-cities-google-trends/index.ts` — **new** (Step 5)
6. No migration needed if Step 2 option (a) is chosen — existing columns absorb all new data.

## Verification queries (after each step)

```sql
-- After Step 1
SELECT COUNT(*) FROM us_cities_scored WHERE charter_elementary_count IS NOT NULL;  -- expect 948

-- After Step 3
SELECT COUNT(*) FROM city_market_signals WHERE signal_key IN ('childcare_nanny_hourly_rate_proxy','guide_wage_proxy');

-- After Step 4
SELECT COUNT(*) FROM city_market_signals WHERE signal_key = 'days_above_100f';  -- expect 948

-- After Step 5
SELECT COUNT(*) FROM city_market_signals WHERE signal_key LIKE 'google_search_demand_%';  -- expect ~1,896

-- After Step 6
SELECT COUNT(*) FROM us_cities_scored WHERE cost_of_living_index IS NOT NULL;  -- expect 948
SELECT COUNT(*) FROM us_cities_scored WHERE private_elementary_count IS NOT NULL;  -- expect 948

-- Final: re-run normalize pass so new metrics flow into category + composite scores
-- Invoke seed-cities-database with { normalize_only: true }
```

## Risk

- **Step 1, 6a:** low — pure SQL aggregation / column patch.
- **Step 3:** low — same BLS pattern already in use, just two more series IDs.
- **Step 4:** low — Open-Meteo is rock-solid and free; one-time pull.
- **Step 5:** medium — Google Trends has informal rate limits and can return empty results for low-volume cities. Mitigation: 1s delay, retry once on empty, store nulls explicitly with `confidence: 0`.
- **Step 6b:** low-medium — NCES PSS endpoint is the same as CCD; same auth, same parsing pattern.

## How to undo

Each step is additive. Roll back by:
- Reverting the relevant edge function file from git
- `UPDATE us_cities_scored SET <column> = NULL` for the columns that step populated
- `DELETE FROM city_market_signals WHERE signal_key IN (...)` for the signals that step inserted

No schema migration in this plan = no rollback complexity at the structure level.

## Doc updates after each step (Mode A — draft, wait for "go")

- `APIS.md` — add Open-Meteo and Google Trends to Section A; update BLS block to list new OEWS codes
- `PROJECT_CONTEXT.md` § 4 — three new lines in the inventory table
- `HOW_IT_WORKS.md` § City Search → metric coverage map
- `OPEN_TASKS.md` — close the relevant B-items; open new B-items for Apify approval ($X to Brett) and GreatSchools sign-up
- `GLOSSARY.md` — add OEWS, RPP, PSS, Open-Meteo

## Sequence

I'll do Steps 1 → 2 → 3 → 4 → 5 → 6 in order, pausing after each step's verification query before moving on. After Step 6, run the `normalize_only` pass and show you the new top-20 ranked list. Total estimated execution time: ~1 hour of edge function work + ~1 hour of wait time for the rate-limited pulls (mostly Google Trends).

Ready to start with Step 1 on your approval.
