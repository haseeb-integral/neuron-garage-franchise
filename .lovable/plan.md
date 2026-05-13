## Diagnosis

The "Refresh This Market" button calls **two** edge functions back-to-back:
1. `fetch-city-market-data` — runs first, correctly fetches Census + writes the 6 new sprint signals (`young_families_growth_5yr`, `dual_income_pct`, `long_commute_pct`, `gtrends_*`, `competitor_waitlist_count`, `competitor_soldout_count`).
2. `fetch-city-market-data-sow` — runs **second** and at line 357 does `delete().eq('city_id', cityId)` against `city_market_signals` for the **entire city**, then inserts its own 46-row SOW coverage set, which contains hard-coded `missingSignal(...)` placeholders for these same metrics under the SOW canonical keys (`dual_income_household_pct`, `young_family_growth_rate`, `commute_sprawl_index`, `waitlist_sold_out_signal_count`, `google_search_demand_summer_camp`, `google_search_demand_summer_day_camp`).

So the live values are written, then **wiped a few seconds later** and replaced with `status: "missing"` rows. The MarketDetailDrawer reads `city_market_signals` and faithfully shows what's there — which is the SOW's MISSING placeholders.

Secondary issue: the live function and the SOW function use **different signal_key naming**, so even if both rows survived, the drawer wouldn't merge them. The SOW keys are the canonical ones the UI expects.

### What Census actually returned for Austin (verified live just now)

```
B23007_001E = 207,727   B23007_003E = 69,919   B23007_004E = 67,058
B08303_001E = 433,417   B08303_011E = 28,907   _012E = 14,678   _013E = 5,947
B11005_002E (2022) = 105,582     B11005_002E (2017) = 99,014
```

All 8 variables resolved cleanly. **No FIPS or variable-name issue.** The code in `fetch-city-market-data` is correct.

## Fix

Move the 6 sprint metric computations into **`fetch-city-market-data-sow`** so they are written under the SOW's canonical signal_keys instead of being placeholder `missingSignal(...)` rows. Stop computing them in the live function (or keep them but they'll be overwritten — cleaner to remove the duplicate).

### Implementation steps

1. **Extract shared helpers into `supabase/functions/_shared/`** (new file `metricFetchers.ts`):
   - `fetchCensusSprintMetrics(city, state)` → returns `{ young_family_growth_rate, dual_income_household_pct, commute_sprawl_index }` using B23007, B08303, and the 2-vintage B11005 call. Lifted verbatim from `fetch-city-market-data/index.ts` lines 354–438.
   - `fetchGoogleTrends(city, state)` → returns `{ city_camp, generic_camp }` (Apify `emastra/google-trends-scraper`). Lifted from the live function.
   - `fetchCompetitorWaitlistSignals(urls)` → returns `{ scanned, waitlist, soldout }` (Firecrawl scrape). Lifted from the live function.

2. **In `fetch-city-market-data-sow/index.ts`:**
   - Call `fetchCensusSprintMetrics` once (it shares the Census key already in use elsewhere in that function for the demand metrics).
   - Call `fetchGoogleTrends` once.
   - After SOW competitor rows are written, call `fetchCompetitorWaitlistSignals` over those URLs (cap 5 per city as previously approved).
   - **Replace** the 6 `missingSignal(...)` calls (line 240 plus 5 others — locate via grep on `dual_income_household_pct`, `young_family_growth_rate`, `commute_sprawl_index`, `waitlist_sold_out_signal_count`, `google_search_demand_summer_camp`, `google_search_demand_summer_day_camp`) with real-value rows: `status: "live"`, `used_in_score: true` where appropriate, plus `raw_data` with provenance (FIPS / table / actor / scanned count).
   - Keep the count of inserted rows at exactly 46 — these aren't new rows, they're upgrading existing placeholders to live values.

3. **In `fetch-city-market-data/index.ts`:** Remove the 6 sprint signal rows from `censusSignals`, `trendsSignals`, and `waitlistSignals` blocks (lines 631–633, 636–639, 641–644). They were getting deleted by SOW anyway. Keep the helper functions only if they're still imported elsewhere — otherwise inline-delete to keep the file lean. The original (non-sprint) Census/BLS/Firecrawl signals stay as-is.

4. **Deploy both functions** and re-test on Austin TX. Expected outcome:
   - `young_family_growth_rate` shows ≈ **+6.6%** with `live` badge
   - `dual_income_household_pct` shows ≈ **95.9%** with `live` badge
   - `commute_sprawl_index` shows ≈ **11.4%** with `live` badge
   - `google_search_demand_summer_camp`, `..._day_camp`: live values from Apify (or `proxy` if Trends returns sparse data for Austin's keyword)
   - `waitlist_sold_out_signal_count`: live integer from Firecrawl scrape over Austin competitor URLs

5. **Report back** with the actual Austin values from the DB and confirm `dual_income_household_pct` and `commute_sprawl_index` (the two zero-additional-API-call metrics) render real numbers in the drawer.

### Risk

Low. The Census variables are confirmed valid. The SOW function already runs the Apify and Firecrawl pipelines for other metrics, so adding 3 more API calls into that path mirrors existing patterns. The only structural change is moving the sprint computations into the function whose output the UI actually reads.

### Out of scope

- No DB schema changes.
- No frontend changes (drawer already renders whatever signals are in the table).
- Tier hysteresis and composite scoring untouched.