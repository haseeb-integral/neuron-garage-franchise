## Phase 1 — `us_cities_scored` (free APIs only, cities by Tuesday)

Approved scope: Census ACS, BLS, BEA, FRED, NCES CCD. Apify, Firecrawl, GreatSchools deferred to Phase 1b. Teachers deferred to next sprint.

---

### Step 1 — Migration: `us_cities_scored` table

Create the table per `DATABASE_LAYER_SPEC.md`:
- Identity: `city_name`, `state_abbr`, `state_name`, `population`, `latitude`, `longitude`, `metro_area`, `is_registration_state`
- Raw signals: `children_5_12`, `median_household_income`, `dual_working_families_pct`, `college_degree_pct`, `population_density`, `stem_job_concentration`, `labor_force_participation`, `regional_median_income`, `cost_of_living_index`, `public_elementary_count`, `public_elementary_enrollment`
- Phase 1b raw signals included as nullable columns (so we don't migrate again later): `private_elementary_count`, `charter_elementary_count`, `summer_camp_count`, `avg_camp_price_per_hour`, `school_hosted_camp_count`, `camp_waitlist_signals`
- Normalized scores: `score_demand`, `score_pricing_power`, `score_competitive`, `score_franchise_supply`, `score_ease_of_operation`, `score_parent_mindset`
- Composite: `composite_score_default`
- Freshness columns (each gets the vintage date returned by the source, NOT seed time): `census_last_updated`, `bls_last_updated`, `bea_last_updated`, `fred_last_updated`, `nces_last_updated`, `greatschools_last_updated`, `apify_last_updated`, `firecrawl_last_updated`
- Run-tracking columns: `scored_at` (timestamptz, last full re-score), `seed_run_id` (uuid), `refresh_count` (int, increments on each re-score)
- Indexes: `composite_score_default desc`, `state_abbr`, `population desc`
- RLS: authenticated SELECT; INSERT/UPDATE/DELETE only via service role (edge function)

Also create `city_seed_runs` audit table: `id`, `started_at`, `completed_at`, `phase` (`'phase_1_free'` | `'phase_1b_paid'` | `'refresh'`), `cities_processed`, `cities_failed`, `error_summary jsonb`. This is the "how many times updated" log.

### Step 2 — Edge function: `seed-cities-database`

Logic:
1. Insert row into `city_seed_runs` with phase `'phase_1_free'`
2. Read `us_cities_geo` WHERE `population >= 50000` (~800 rows)
3. Process in batches of 25, with per-city try/catch so one failure doesn't kill the run
4. For each city call the 5 free APIs and capture the vintage date each API returns (Census ACS year, BLS period, BEA year, FRED observation date, NCES school year) — store in the matching `*_last_updated` column
5. Upsert into `us_cities_scored` keyed on `(city_name, state_abbr)`
6. After all cities seeded, run a second pass to compute percentile-normalized 0–100 scores per category and `composite_score_default` using the default weights from `src/lib/scoringPresets.ts`
7. Update `city_seed_runs` row with `completed_at`, counts, and any failures

Manual trigger only. No cron in Phase 1.

### Step 3 — Wire City Search to read from `us_cities_scored`

- Replace live-fetch path with a single query: `SELECT * FROM us_cities_scored ORDER BY composite_score_default DESC`
- Slider re-rank stays client-side (already in `clientSubWeightScoring.ts`)
- Leave `cities`, `city_market_signals`, `city_fetch_jobs` untouched — they still power the per-city detail drawer

### Step 4 — Verification (Haseeb runs)

- City Search loads full ranked list in < 3 sec
- Slider moves re-rank instantly
- Show Formula on top 3 cities → raw values match what's stored
- Export CSV → ~800 rows
- Open `city_seed_runs` row → confirm 1 run, ~800 processed, 0 failed (or list failures)
- Spot-check 3 cities for `census_last_updated`, `bls_last_updated`, etc. → real vintage dates, not seed time

### Step 5 — Doc updates (Mode A: I draft, you say "go")

After verification passes:
- `PROJECT_CONTEXT.md` — add `us_cities_scored` + `city_seed_runs` tables, add `seed-cities-database` function
- `OPEN_TASKS.md` — Task #0 → split into #0a (cities, mark done) + #0b (teachers, blocked on Brett)
- `DATABASE_LAYER_SPEC.md` — split scope into Phase 1 / Phase 1b / Phase 2; remove "both tables by Tuesday"; note freshness columns store source vintage dates and `city_seed_runs` tracks run history
- `APIS.md` — mark Census/BLS/BEA/FRED/NCES as "used in Phase 1 seed"; mark GreatSchools/Apify/Firecrawl as "Phase 1b deferred"
- `HOW_IT_WORKS.md` — City Search now reads from pre-seeded table; slider re-rank is client-side over stored normalized scores

---

### Risk / undo

- Risk: **Low**. New table, new function, City Search read path swap. Old tables stay in place.
- Undo: revert City Search to read from `cities` (one file change). Drop `us_cities_scored` + `city_seed_runs` via migration. Edge function can stay dormant.

### What I am NOT doing in this sprint

- No teacher table, no teacher edge function
- No Apify, Firecrawl, GreatSchools calls
- No cron / scheduled refresh (manual trigger only)
- No UI changes beyond swapping the data source
- No doc writes until you say "go" after verification

---

On approval I'll start with the migration (Step 1), wait for your confirmation it ran clean, then build the edge function (Step 2).
