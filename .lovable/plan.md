# Fix % Dual-Income Households + Bump Census Vintage to 2024

## What changes and why

**1. Formula fix**
- Old numerator: `B23007_006E + B23007_011E` (married, husband in LF, wife in LF **plus** husband not in LF, wife in LF)
- New numerator: `B23007_006E` only (married, **husband in labor force AND wife in labor force**)
- Denominator stays: `B23007_002E` (all family types with own children under 18)
- Reason: you want strictly dual-earner married couples, not "wife works but husband is out of the labor force."

**2. Vintage bump 2023 → 2024**
- ACS 5-year 2024 is live (I checked the API — returns data). Since we are in 2026, the 2024 5-year is the newest release.
- This is a global switch — **every Census metric refreshes**, not just dual-income:
  - population, children_5_12, median_household_income, college_degree_pct, labor_force_participation, dual_working_families_pct
- Values will shift slightly for every city (usually 1–3%). This is expected and correct — it is fresher data.

## Southaven, MS preview with new formula + 2024 vintage
- B23007_002E = 7,040
- B23007_006E = 2,762
- New % = 2,762 / 7,040 = **39.2%** (was 36.5% under old formula on 2023 data)

## Files touched (code only, no schema)
- `src/lib/sowMetricRegistry.ts` — update the metric description text.
- `supabase/functions/_shared/metricFetchers.ts` — drop `_011E`, bump vintage constant.
- `supabase/functions/backfill-census-gaps/index.ts` — same.
- `supabase/functions/seed-cities-database/index.ts` — same.
- Any other file with `"2023"` ACS vintage — I will grep and update all.

## Phases

**Phase 1 — Code change (1 turn)**
Update the 4 files above: new formula + vintage 2024. Update the sanity-check log too.

**Phase 2 — Recompute all cities (1–2 turns)**
Call `backfill-census-gaps` in batches to refresh all ~817 cities against ACS 2024. This will overwrite `population`, `median_household_income`, `children_5_12`, `college_degree_pct`, `labor_force_participation`, `dual_working_families_pct`, `census_last_updated`.

Note: current `backfill-census-gaps` only fills **null** fields. I will add a `force=true` mode so it overwrites existing values for this refresh. (Safe — it only rewrites Census-derived columns, nothing user-edited.)

**Phase 3 — Verify (same turn as Phase 2)**
Show old vs. new % for 5 diverse cities:
- Southaven, MS
- Bothell, WA (affluent)
- Downers Grove, IL (affluent)
- Detroit, MI (lower-income)
- Newton, MA (affluent)

## Risks / what NOT to touch
- Composite scores may shift a little because underlying Census inputs change. This is intended.
- No weight changes, no UI changes, no changes to non-Census metrics (competitors, franchisee supply, weather, etc.).
- Tier assignments may move for a handful of borderline cities — normal after a data refresh.

## What you should test after Phase 2
- Open City Search, click Southaven MS, confirm dual-income shows ~39%.
- Spot-check 2–3 other cities in the table for realistic values (15–75% range).
- Check that no city shows null/blank for dual-income.

Waiting for approval before I start Phase 1.
