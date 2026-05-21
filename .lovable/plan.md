# Lock CSI to 3 sub-metrics (mirror TAM + Demand treatment)

## Goal

Restrict the **Competitive Saturation Index** category to exactly the 3 inputs Brett specified, lock the formula, fix the direction in the overall composite, and recompute every city's `csi_score` + `composite_score_default`.

## The 3 locked sub-metrics

| # | Metric key (frontend) | Label in UI | DB column | Default sub-weight |
|---|---|---|---|---|
| a | `csi_national_brand_supply` | National Brand Supply (weighted count) | `csi_national_brand_count_weighted` | **34%** |
| b | `csi_local_camp_estimate` | Local Camp Supply (estimated) | `csi_local_provider_estimate` | **33%** |
| c | `csi_demand_adjusted_market` | Demand-Adjusted Market (DAM) | `csi_demand_adjusted_market` | **33%** |

The 3 raw inputs are **already populated** in `us_cities_scored` from Brett's 2026‑05‑21 Manus upload. We will **not** recompute `csi_local_provider_estimate` from `enrollment × 0.15` — we use Brett's stored values as the source of truth.

## The locked formula (Brett)

```text
CSI_raw = (csi_national_brand_count_weighted + csi_local_provider_estimate)
          / csi_demand_adjusted_market

csi_score = clamp( round(CSI_raw × 10000), 0, 100 )      // saturation, higher = more crowded
```

Where (informational, already pre-baked by Manus):
```text
National_Brand_Locations  = scraped count of all national brands per city (weighted)
Local_Camp_Estimate       = Brett's stored estimate (NOT enrollment × 0.15)
Demand_Adjusted_Market    = Elementary_Enrollment × (Median_HH_Income / 65,000)
```

This is exactly the math currently in the DB (Austin 28, Denver 27, LA 36, NYC 76, Phoenix 34 — all verified).

## Direction fix — **lower CSI is better**

Today the overall composite treats higher CSI as better. That's wrong: NYC at CSI 76 is *more* saturated and should *hurt* its opportunity score, not help it.

Change the composite math (frontend AND backend) to invert CSI:

```text
csi_contribution = 100 − csi_score        // "CSI Opportunity"
composite        = 0.40 × score_demand
                 + 0.30 × score_tam_teachers
                 + 0.30 × csi_contribution
```

The category card and Show‑Formula panel will show **both** numbers so there's no ambiguity:
- "CSI (saturation): 76 — saturated"
- "CSI Opportunity (used in composite): 24"

## Code changes

**Frontend**
- `src/lib/sowMetricRegistry.ts` — replace all current `competitive_landscape` sub-metrics with the 3 above. Direction = "higher is worse" tag on each.
- `src/lib/sowNormalize.ts` — add normalization for the 3 raw inputs based on p5/p95 across 935 cities (will run a quick distribution query before locking ranges).
- `src/lib/cityScoringLiveData.ts` — seed the 3 metric values from `csi_national_brand_count_weighted`, `csi_local_provider_estimate`, `csi_demand_adjusted_market`.
- `src/stores/cityScoringStore.ts` — default sub-weights `{ csi_national_brand_supply: 34, csi_local_camp_estimate: 33, csi_demand_adjusted_market: 33 }`.
- `src/pages/CityScoring.tsx` — composite uses `100 − csi_score` for the CSI contribution. Category card shows raw `csi_score` + saturation label + "(100 − CSI) = N used in composite".
- `src/components/city-scoring/SubMetricWeightsDrawer.tsx`:
  - Provenance line: *"CSI inputs from Brett's 2026‑05‑21 Manus upload. Defaults locked 2026‑05‑21."*
  - Step 2 formula block shows Brett's exact CSI formula + the inversion step.
  - Kill the legacy 7 sub-metric rows (summer_camps_per_10k_children, stem_robotics_maker_camp_count, etc.).
- `src/components/city-scoring/MarketDetailDrawer.tsx`, `MarketReportModal.tsx`, `MarketCompareModal.tsx` — drop dead refs to the retired 7 sub-metrics.

**Backend**
- `supabase/functions/_shared/scoring.ts` — replace CSI registry with the 3, recompute `csi_score` from the locked formula, store as-is (not inverted — inversion happens only in composite). Composite uses `100 − csi_score` for the CSI term.
- `supabase/functions/_shared/metricFetchers.ts` — remove fetchers for retired CSI metrics if any.

**Database backfill (no migration, no schema change)**
One `UPDATE` across all ~935 rows:
```sql
UPDATE us_cities_scored
SET csi_score = LEAST(100, GREATEST(0, ROUND(
      ((COALESCE(csi_national_brand_count_weighted,0) + COALESCE(csi_local_provider_estimate,0))
       / NULLIF(csi_demand_adjusted_market,0)) * 10000
    )::int)),
    composite_score_default = ROUND(
        0.40 * COALESCE(score_demand,0)
      + 0.30 * COALESCE(score_tam_teachers,0)
      + 0.30 * (100 - COALESCE(csi_score,0))   -- inverted
    )::int
WHERE csi_demand_adjusted_market IS NOT NULL;
```

## Expected score shifts (spot-check)

| City | CSI today | CSI after (same) | Old composite (CSI helping) | New composite (CSI inverted) |
|------|-----------|------------------|------------------------------|------------------------------|
| Denver | 27 | 27 | TAM+Demand + 0.30×27 = +8 | + 0.30×(100−27) = +22 ↑ |
| NYC | 76 | 76 | + 0.30×76 = +23 | + 0.30×24 = +7 ↓ |
| LA | 36 | 36 | +11 | +19 ↑ |

Saturated metros go down. Opportunity metros go up. This is the correct direction.

## Open items I'll resolve during build, not now

- The exact p5/p95 normalization ranges for the 3 raw inputs (so the per-metric bars in the drawer have a meaningful 0–100 read). I'll query the distribution and report numbers in the build step before locking, same pattern as Demand.

## Files to be edited

- `src/lib/sowMetricRegistry.ts`
- `src/lib/sowNormalize.ts`
- `src/lib/cityScoringLiveData.ts`
- `src/stores/cityScoringStore.ts`
- `src/pages/CityScoring.tsx`
- `src/components/city-scoring/SubMetricWeightsDrawer.tsx`
- `src/components/city-scoring/MarketDetailDrawer.tsx`
- `src/components/city-scoring/MarketReportModal.tsx`
- `src/components/city-scoring/MarketCompareModal.tsx`
- `supabase/functions/_shared/scoring.ts`
- `supabase/functions/_shared/metricFetchers.ts`
- DB: one `UPDATE` on `us_cities_scored` (no schema change)

## What I will NOT touch

- `csi_national_brand_count_weighted`, `csi_local_provider_estimate`, `csi_demand_adjusted_market` values (Brett's stored numbers).
- The 2026‑05‑21 Manus staging table or import log.
- TAM and Demand locks already shipped.
- Auth, sidebar, kanban gate, 38 non-registration states.

Hard‑refresh (Cmd‑Shift‑R) will be required after deploy.
