## Goal

Close the last free metric gap (private elementary schools via NCES PSS), then document the remaining paid asks so Brett has exact numbers to approve.

## Step A — NCES PSS one-time backfill (free, ~30 min)

PSS is not exposed by Urban Institute API. Only available as bulk download from `nces.ed.gov/surveys/pss/`.

1. Create `supabase/functions/seed-cities-pss/index.ts`:
   - Fetch the 2021–22 PSS school-level CSV from NCES public download URL (~24 MB)
   - Parse with Deno's CSV reader, stream rows (don't load all into memory)
   - Filter: `PSCHLEVEL == "1"` (elementary) OR `LOWGRADE` numeric ≤ 5
   - For each row, normalize `PCITY` + `PSTABB` → match to `us_cities_scored` by `(lower(city_name), state_code)`
   - Aggregate counts per matched city_id
   - `UPDATE us_cities_scored SET private_elementary_count = X WHERE id = Y`
   - Write a `city_market_signals` row with `signal_key = 'private_elementary_count'`, `source = 'NCES PSS 2021-22'`, `confidence = 0.9`
2. Invoke once. No cron — PSS only refreshes every 2 years.
3. Verify: `SELECT COUNT(*) FROM us_cities_scored WHERE private_elementary_count IS NOT NULL` — expect ~900+ of 960.
4. Re-run `seed-cities-database` with `{ normalize_only: true }` so the new metric flows into `score_parent_mindset` and the composite.

**Risk:** Low. PSS city names sometimes use abbreviations (e.g. "ST LOUIS" vs "Saint Louis") — need a small alias map for ~20 known cases. I'll log unmatched rows and fix the top offenders.

## Step B — Finish the weather seed (free, ~2 min)

480 of 960 cities are still missing weather signals from the Open-Meteo rate limit. Re-invoke `seed-cities-weather` with `{ resume: true }` after adding a 1.2-second delay between cities. No code changes beyond the delay.

## Step C — Document paid asks in OPEN_TASKS.md

Add three new B-items so Brett has a clean ask, not buried in chat:

- **B7 — Apify nationwide competitor scrape**
  - Unlocks: 15 of 46 metrics (full list above)
  - Cost: $900–$1,200 one-time + $4k/yr if quarterly refresh
  - Recommend: 10-city test first ($15) to confirm per-city cost
  - Blocker: Brett's $ approval

- **B8 — GreatSchools API subscription**
  - Unlocks: `quality_weighted_elementary_score` + weights the 2 existing school count metrics by rating
  - Cost: $52.50/mo = $630/yr
  - Blocker: Brett to sign up at greatschools.org/api and paste key into Lovable Cloud

- **B9 — BLS OEWS metro wage pulls (free, larger effort)**
  - Unlocks: `childcare_nanny_hourly_rate_proxy`, `guide_wage_proxy`
  - Effort: ~4 hours code + 2 days of rate-limited background pulls
  - Blocker: schedule it for next sprint

## Step D — Move to LATER.md

- **Google Trends** — only feeds 2 soft metrics. Paid alternatives ($30–50/mo SerpAPI or DataForSEO) not worth it pre-PMF. Park it.

## Files touched

- New: `supabase/functions/seed-cities-pss/index.ts`
- Edited: `OPEN_TASKS.md` (add B7, B8, B9)
- Edited: `LATER.md` (add Google Trends entry)
- Edited: `APIS.md` (add NCES PSS to Section A as Live ✅ after Step A runs; add SerpAPI/DataForSEO to "considered, deferred")
- Edited: `PROJECT_CONTEXT.md` § 4 (one row: private_elementary_count now populated)

## Verification after Step A

```sql
SELECT COUNT(*) FROM us_cities_scored WHERE private_elementary_count IS NOT NULL;
SELECT city_name, state_code, private_elementary_count
FROM us_cities_scored
ORDER BY private_elementary_count DESC NULLS LAST LIMIT 20;
```

Expected top-5: NYC, LA, Chicago, Houston, Philadelphia.

## What this changes for honest coverage

| | Before today | After Step A+B |
|---|---|---|
| Fully populated metrics, all 960 cities | 18 of 46 | **22 of 46** |
| Awaiting Brett (Apify) | 15 | 15 |
| Awaiting Brett (GreatSchools) | 3 | 3 |
| Deferred (Google Trends) | 2 | 2 |
| Defer indefinitely / `missing` in registry | 4 | 4 |

## Sequence

A → B → C → D in order. Total: ~45 min of work, no spend, no new keys. Then I'll ping you with the new top-20 ranked city list so you can sanity-check before sending Brett the cost summary.

Ready on your approval.