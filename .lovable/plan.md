## Goal
Lock the **Demand** category to exactly 4 Census ACS sub-metrics, identical pattern to the TAM lock done on 2026-05-21. Remove the other 8 Demand sub-metrics from both frontend and backend. Recompute `score_demand` in the DB using the new formula so the stored value matches what "Show Formula" displays.

## The 4 metrics (final)

| # | Metric key | Label | DB column | Default sub-weight |
|---|---|---|---|---|
| a | `children_5_12_count` | Children Ages 5–12 (count) | `children_5_12` | 30% |
| b | `median_household_income` | Median Household Income | `median_household_income` | 25% |
| c | `dual_income_household_pct` | % Dual-Income Households | `dual_working_families_pct` | 20% |
| d | `education_bachelors_plus_pct` | Bachelor's+ Attainment | `college_degree_pct` | 25% |

Default sub-weights (30/25/20/25) are a placeholder — confirm before I lock them, same way we locked TAM at 20/25/15/15/25.

## Data availability — verified
All 4 values are already populated in `us_cities_scored` for the live cities (Austin / Denver / Phoenix sample confirmed). No new fetcher work needed. No new migrations to add columns.

## Normalization ranges (to lock, mirror of TAM)
```
children_5_12_count            lo: 0       hi: 90000     invert: false
median_household_income        lo: 45000   hi: 130000    invert: false
dual_income_household_pct      lo: 70      hi: 98        invert: false
education_bachelors_plus_pct   lo: 15      hi: 70        invert: false
```
These need a real p5/p95 check across the 817 cities before locking — I'll run that query and report actual ranges for your sign-off (same process as TAM ranges 2026-05-21b).

## Changes

### Frontend
1. `src/lib/sowMetricRegistry.ts` — delete the 8 non-final Demand entries (children_5_12_pct, households_with_children_under_13, income_100k_plus_pct, income_150k_plus_pct, young_family_growth_rate, summer_weather_index, avg_peak_summer_temperature, days_above_90f). Keep only the 4. Set default sub-weights.
2. `src/lib/sowNormalize.ts` — delete normalization entries for the 8 removed metrics. Add/update entries for the 4 with the locked ranges. Add a "Demand 4-metric lock 2026-05-21" comment block (mirror of the TAM lock comment).
3. `src/lib/cityScoringLiveData.ts` — remove `seeded(...)` lines for the 8 dropped metrics under the "demand" category.
4. `src/stores/cityScoringStore.ts` — update Demand default sub-weights to the new 4-key map.
5. `SubMetricWeightsDrawer.tsx` provenance line — add "Default Demand weights locked 2026-05-21 by Brett + Haseeb: 30/25/20/25" (or whatever you confirm).

### Backend
6. `supabase/functions/_shared/scoring.ts` — in the `SOW_METRICS` registry, delete the 8 dropped Demand entries. Replace the legacy `cat.demand = clampScore(50 + b.elementary*3 + ...)` formula with the same SOW-weighted normalized formula used for `tam_teachers`. Add the 4 normalization ranges to `normalizeSowMetric()`.
7. `supabase/functions/_shared/metricFetchers.ts` — confirm no fetcher work needed (data already in the table); remove dead fetcher branches for dropped metrics if they exist.

### Database backfill
8. After code lands, run a one-shot SQL `UPDATE` to recompute `score_demand` and `composite_score_default` for all 817 cities using the new formula (same backfill approach used for TAM 2026-05-21).

## What I will NOT touch
- TAM 5-metric lock (untouched)
- CSI scoring (untouched)
- Master weights (40/30/30) (untouched)
- The "Show Formula" two-line panel UI (will just pick up the new 4 metrics automatically)
- Any other category

## Open questions for you before I implement
1. **Sub-weights** — confirm 30/25/20/25 or give me your numbers (same call you made for TAM at 20/25/15/15/25).
2. **Ranges** — OK if I run the p5/p95 query on real data and report back, then lock?
3. **Backfill timing** — run immediately after code lands, or stage it?

Reply with sub-weights + "go" and I'll execute.