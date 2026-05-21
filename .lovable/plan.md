
# Sprint Step 3 — CSI v2.0 Ingest Plan

Per TPD.md 5-step playbook. No DB changes execute until Sam ✅ this triage.

## 1. Universe decision

- Keep **960 rows** in `us_cities_scored` as our working universe (superset of Manus 817 + Census strict 583).
- Add two **truth-toggle columns** so anyone can filter to the official Census view:
  - `place_type` — `'incorporated_city' | 'cdp' | 'town' | 'unknown'` (backfilled from Census FIPS)
  - `census_population_2020` — official Census Vintage 2020 count
- Result: Sam can answer "how many real cities >50k?" three ways (583 / 817 / 960) on demand. Zero UI change today.

## 2. Join key

- Strip trailing `" city" / " town" / " CDP" / " village"` from vendor `City`, match on `(state_abbr, normalized_city_name)`.
- Manus rows not in ours: insert. Ours not in Manus (~143): keep, leave CSI columns NULL.

## 3. Column triage (final)

| Action | Columns |
|---|---|
| **DROP** | `score_pricing_power`, `score_ease_of_operation`, `score_parent_mindset`, vendor `ID` |
| **RENAME (same migration)** | `score_franchise_supply` → `score_tam_teachers`; `score_competitive` → `score_csi` |
| **NEW — CSI bundle (scored)** | `csi_score`, `csi_national_brand_count_weighted`, `csi_local_provider_estimate`, `csi_demand_adjusted_market`, `csi_saturation_category`, `csi_confidence`, `csi_last_updated`, `csi_brand_detail` (jsonb) |
| **NEW — data only, NOT scored, NOT shown in UI yet** (await Brett+Sam review) | `private_elementary_count`, `charter_elementary_count`, `private_charter_share_pct` |
| **NEW — truth toggle** | `place_type`, `census_population_2020` |
| **NEW — misc** | `school_district_count` |
| **KEEP-AS-IS** | `population`, `public_elementary_enrollment`, `median_household_income`, `college_degree_pct`, `cost_of_living_index`, `regional_median_income` |
| **RECOMPUTE LATER** (import as NULL) | `stem_job_concentration` (vendor is state-level; backfill from our BLS pipeline) |
| **IGNORE vendor column** | Vendor "Elementary Schools" total — our `public_elementary_count` stays public-only (NCES). Private/charter land in their own dedicated columns above. |

## 4. Demand category — UNCHANGED

Confirmed locked sub-metrics (no additions from this ingest):
- a) Children ages 5–12 count
- b) Median household income
- c) Dual-income household %
- d) Bachelor's degree or higher %

`private_charter_share_pct` is **imported but NOT wired** into Demand scoring or front-end. Awaits Brett+Sam review.

## 5. 6→3 category reshape

Frontend (`src/stores/cityScoringStore.ts`, `sowMetricRegistry.ts`, weights drawer, table columns):
- Remove 3 categories: Pricing Power, Ease of Operations, Parent Mindset.
- Rename Franchisee Supply → **TAM Teachers**.
- Rename Competitive Landscape → **Competitive Saturation Index (CSI)**.
- Default master weights redistributed across 3 surviving categories (Sam to approve split — proposed: Demand 40 / TAM Teachers 30 / CSI 30).

## 6. Import job (idempotent, additive)

- Stage CSV in `staging_competitive_landscape_2026_05_21`.
- Upsert into `us_cities_scored` on `(state_abbr, normalized_city_name)`. **No TRUNCATE.**
- Touches only triaged columns. Never writes `score_*`.
- Logs to new `imports` table: source, batch id, file checksum, inserted/updated/skipped counts, link to this triage.

## 7. Re-score pass (separate)

- After import succeeds, trigger scoring edge function over affected rows.
- Diff pre-existing rows' scores before/after — must be unchanged except where the rename touched them.
- Attach diff sample to PR.

## 8. Doc-sync (Mode A, draft only, awaits "go")

Drafts for: `PROJECT_CONTEXT.md`, `APIS.md` (Manus CSI v2.0 source row), `OPEN_TASKS.md` (close Step 3, open Step 4 = re-score), `HOW_IT_WORKS.md` (6→3 categories), `GLOSSARY.md` (new terms: CSI, TAM Teachers, place_type).

## 9. Open approval gate

- **Sam** — sign off on this triage table + the proposed 40/30/30 default master weights.
- **Brett** — confirm "import private/charter columns silently, do not score yet" matches his read.

Once both ✅, I queue the migration in one call, then the import job, then the re-score pass.

---

## Technical detail (collapsed reference)

- Migration adds ~15 columns to `us_cities_scored`, drops 3, renames 2. All additive except the 3 drops (those are pure removes — no app code reads them after the frontend reshape lands in the same PR).
- `csi_brand_detail` stored as `jsonb` per Manus methodology (variable brand list per city).
- `place_type` backfill: join on existing `us_cities_geo` + Census FIPS class code (already in our geo loader).
- `census_population_2020` backfill: Census ACS 5-year endpoint (`B01003_001E`) — already wired in `metricFetchers.ts`.
- Frontend store migration: bump `ng:city-scoring-v1` version 4 → 5, drop 3 obsolete keys from persisted `weights` / `appliedWeights` / `subWeights`, map old keys to new ones for any saved searches.
