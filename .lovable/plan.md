## Acknowledgments first (you're right, I was wrong)

1. **`summer_camp_count`** — yes, I already wrote the Manus brief (`manus-brief.md`, attached). Manus is running it. **I will not regenerate or touch this column from our side.** No edge function, no Apify scrape from us.
2. **`school_hosted_camp_count`** — Competitive Landscape metric, **Manus-owned**, same delivery path as `summer_camp_count`. I will stop suggesting we source it.
3. **CSI category as a whole** — Manus precomputes (`csi_score`, `csi_national_brand_count_weighted`, `csi_local_provider_estimate`, `csi_demand_adjusted_market`, `summer_camp_count`, `school_hosted_camp_count`). Our job = display only. Locked.
4. **`summer_weather_index` / `school_district_count`** — you're right, neither belongs to Demand, TAM, or CSI. They are **orphan metrics** (no live category owns them). Treat them the same as `avg_camp_price_per_hour` and `avg_school_rating` → remove from UI.

---

## The 3 live categories (locked)

- **Demand** — children_5_12, median_household_income, dual_income_pct, college_degree_pct
- **CSI (Competitive Landscape)** — Manus-owned, do not touch
- **TAM Teachers** — public_elementary_count, public_elementary_teacher_count, private+charter_elementary_count, public_elementary_enrollment, col_salary_index

Any metric not in this list = remove from UI.

---

## Plan

### Step 1 — Delete the 160 extra non-Manus cities (HARD delete, safe)
Verified: `SELECT count(*) FROM teacher_prospects WHERE us_cities_scored_id IN (160 extras)` = **0**.
No teacher rows orphaned. No FK violations. Safe to hard-delete.

- Run `DELETE FROM us_cities_scored WHERE csi_last_updated IS NULL;` (160 rows)
- Remove the `csi_last_updated IS NOT NULL` filter from `loadLiveRankedMarkets` (no longer needed — table = 817 by definition)
- Remove the `includeExtras` toggle plumbing (dead code after delete)

### Step 2 — Remove retired / orphan metrics from the UI (5 metrics)
Strip these from spreadsheet columns, drawer panels, seeded signals, methodology copy. **Keep the DB columns** (no schema change — non-destructive, reversible):

| Metric | Reason |
|---|---|
| `avg_camp_price_per_hour` | Pricing category retired May 15 |
| `avg_school_rating` | Legacy, not in any live category |
| `summer_weather_index` | Not in Demand/CSI/TAM |
| `avg_peak_summer_temperature`, `days_above_90f`, `summer_precip_days` | Same — weather is orphan |
| `school_hosted_camp_count` (from our seeded list) | Manus-owned, surface only via CSI panel if Manus delivers it |

Files touched: `cityScoringLiveData.ts` (seeded signals), `CitySpreadsheetView.tsx` (columns), `CityScoring.tsx`, `demographicsMethodology.md`, `signalGeography.ts`.

### Step 3 — Fix the NULL→0 bug (HIGH, ~30 min)
In `mapLiveCityToRankedMarket` and `buildSeededFallbackSignalsFromScored`:
- Stop calling `toNumber(x, 0)` for display values. Use `x == null ? null : Number(x)`.
- Spreadsheet + drawer render `null` as `"—"`, render `0` as `"0"`.
- Composite/percentile math: exclude NULL rows from the percentile pool (do not coerce to 0).

### Step 4 — Queue two free backfills as standalone sprint tasks (no work today)
- **B10a — `private_elementary_count` re-pull** via NCES PSS edge function (357 cities, free, ~30 min run). Add to `OPEN_TASKS.md` only.
- **`school_district_count` backfill** — DEFERRED. Not in any live category, so no point pulling it. Drop from sprint.

### Step 5 — Doc sync (per Rule 9, after your "go")
Draft updates to `PROJECT_CONTEXT.md`, `OPEN_TASKS.md`, `GLOSSARY.md`:
- Universe = 817 (hard rule, not a filter)
- Live categories = Demand / CSI / TAM only
- Retired/orphan list (5 metrics above)
- NULL rendering contract: NULL → "—", 0 → "0"
- Manus owns CSI end-to-end; we display only

---

## What I am NOT doing (per your instructions)

- Not touching `csi_score` or any CSI input
- Not touching `csi_local_camp_estimate` removal (Brett trusts Manus)
- Not touching DAM / COL-Salary relabel
- Not touching National Brand relabel
- Not touching `Methodology.tsx` estimate language
- Not seeding `summer_camp_count` from our side
- Not dropping any DB columns

---

## Risk

- **Step 1 (delete 160):** LOW — verified zero teacher FK references. Reversible via re-seed from `us_cities_geo`.
- **Step 2 (UI strip):** LOW — presentation only, columns preserved in DB.
- **Step 3 (NULL fix):** MEDIUM — touches scoring normalization. Will spot-check 5 cities before/after composite.
- **Step 4:** None (doc only).

Approve and I'll execute Steps 1–3 in one pass, then send doc-sync diffs for Step 5 before writing.