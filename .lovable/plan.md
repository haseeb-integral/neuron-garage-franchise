## The Real Fix for Fulshear (and ~24 similar cities)

No estimates, no dummies, no fabricated values. Every missing field gets filled from an authoritative source — or stays NULL with a logged reason.

---

### Root cause (confirmed)

`backfill-public-schools` matches NCES schools by **exact `city_location` / `city_mailing` string**. For Fulshear, TX:
- 0 NCES rows have `city_location = "FULSHEER"`/"FULSHEAR"
- Schools serving Fulshear residents are coded under **Katy, Richmond, Houston** (Lamar CISD / Katy ISD mailing addresses)
- Same pattern for ~23 other cities (e.g. Milford CT schools under New Haven, suburbs of consolidated metros, etc.)

Result: `public_elementary_count`, `public_elementary_teacher_count`, `private_elementary_count`, `charter_elementary_count` = NULL.

`col_salary_index` is NULL because the deterministic compute step (`avg_salary × 100 / cost_of_living_index`) was never wired — not because data is missing.

---

### Fix — 4 parts, all real data

**1. Geo-radius school matching (replaces exact city-name match)**

Stop matching by string. Match by geography:
- For each city in `us_cities_scored`, use its `latitude`/`longitude` + `metro_counties[]`
- Pull NCES CCD schools within **10 mi radius** of the city centroid AND inside the city's county/metro
- This is how NCES itself recommends attributing schools to "place served" — schools have lat/long in the CCD directory

This is authoritative NCES data, just joined correctly. No fuzzy strings, no aliases to maintain.

**2. Rebuild the 4 counts from `public_schools` after re-match**

Once `public_schools.us_cities_scored_id` is correctly assigned by geo-match:
- `public_elementary_count` = COUNT where `school_level IN ('elementary','elementary_middle')` AND `is_charter=false` AND `school_type='regular'`
- `charter_elementary_count` = same but `is_charter=true`
- `public_elementary_teacher_count` = SUM(`teachers_fte`) over the elementary set
- `private_elementary_count` = pull from **NCES PSS (Private School Survey)** — already listed in OPEN_TASKS as B10a. Apply same geo-radius logic.

All values traceable to NCES rows. Zero estimation.

**3. Deterministic `col_salary_index` compute**

Where both inputs exist:
```
col_salary_index = round(avg_elementary_teacher_salary_usd × 100.0 / cost_of_living_index, 1)
```
Where either input is NULL → leave NULL. No imputation.

**4. Gap log table**

New table `city_data_gaps` (city_id, field_name, reason, checked_at). When the geo-match returns 0 schools for a city, we log *why* (e.g. "no NCES schools within 10mi", "lat/long missing", "county FIPS missing") instead of silently leaving NULL. This is what unblocks the next pass cleanly.

---

### What this does NOT do

- Does NOT copy values from neighboring cities
- Does NOT use Manus enrollment as a proxy for counts
- Does NOT estimate teacher counts from population
- Does NOT touch `score_*` columns (separate re-score pass per TPD.md §3 Step 5)

---

### Deliverables

1. **Migration**: add `city_data_gaps` table + RLS
2. **Rewrite** `supabase/functions/backfill-public-schools/index.ts` — geo-radius matching, returns per-city match counts
3. **New** `supabase/functions/backfill-private-schools/index.ts` — NCES PSS, same geo logic
4. **New** `supabase/functions/recompute-city-derived/index.ts` — recomputes the 4 counts + `col_salary_index` from `public_schools` after re-match; writes to `city_data_gaps` on misses
5. **Run** all three on the full 977-city universe
6. **Re-score pass** (separate, per TPD.md) to refresh `score_tam_teachers` for affected rows
7. **Diff report**: before/after for Fulshear, Milford, + 8 other prior-NULL cities — every filled value linked to its NCES source row

### Technical notes

- NCES Urban Institute API supports `latitude`/`longitude` bbox filters — no need to pull full state directories
- 10mi radius is the default; configurable per call so we can tighten/loosen during validation
- Idempotent upserts on `public_schools.nces_id` (existing PK) — safe to re-run
- PSS data is annual; cache the state dump in-memory per invocation like the current CCD code does

### Open question for you before I build

**Radius**: 10 miles is the NCES-recommended default for "place served." For dense metros (NYC boroughs) this over-matches; for rural TX exurbs (Fulshear) 10mi may still miss. Options:
- (a) Fixed 10mi everywhere — simplest, ~95% coverage
- (b) Adaptive: 5mi if population_density > 3000/sq mi, else 15mi
- (c) County-bounded: any school in same county as city, no radius cap

I'd pick **(c) county-bounded** — it's the most defensible ("schools in your county count"), needs no tuning, and Fulshear's Lamar CISD schools all sit in Fort Bend County alongside Fulshear itself.

Want me to proceed with (c)?