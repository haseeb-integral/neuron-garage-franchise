# DATABASE_LAYER_SPEC.md — Neuron Garage

> Created: May 18, 2026
> Author: Dev Lead
> Status: ACTIVE — this is the build spec for Task #0
> Deadline: Tuesday May 20, 2026 — tables live in Supabase with initial data seeded

---

## Why This File Exists

The May 15 client review revealed a fundamental architecture problem: City Search was fetching live data per city on demand, taking 5+ minutes per city. This makes a national ranked list impossible to deliver in real time.

The solution is a **pre-built database layer** — two Supabase tables that are seeded in advance and refreshed on a schedule. The app reads from these tables instantly. All ranking, filtering, and slider re-sorting happens on top of stored data, not live API calls.

This is also a business asset decision. Both tables — the scored city database and the teacher database — are **owned by Neuron Garage** and grow in value over time.

---

## Table 1: `us_cities_scored`

### Purpose
Store all U.S. cities above 50,000 population, pre-scored across all 6 categories, so City Search can return a fully ranked national list instantly.

### Target row count
~800–1,000 cities (all U.S. cities above 50,000 population per Census data)

### Schema

```sql
create table us_cities_scored (
  id                        uuid primary key default gen_random_uuid(),
  city_name                 text not null,
  state_abbr                text not null,           -- e.g. "TX"
  state_name                text not null,           -- e.g. "Texas"
  population                integer,                 -- latest Census estimate
  latitude                  numeric(9,6),
  longitude                 numeric(9,6),
  metro_area                text,                    -- e.g. "Dallas-Fort Worth"
  is_registration_state     boolean default false,   -- 12 registration states flagged

  -- Raw signal values (stored so formula is always visible)
  children_5_12             integer,
  median_household_income   integer,
  dual_working_families_pct numeric(5,2),
  college_degree_pct        numeric(5,2),
  population_density        numeric(10,2),
  stem_job_concentration    numeric(8,4),
  labor_force_participation numeric(5,2),
  regional_median_income    integer,
  cost_of_living_index      numeric(6,2),
  public_elementary_count   integer,
  public_elementary_enrollment integer,
  private_elementary_count  integer,
  charter_elementary_count  integer,
  summer_camp_count         integer,
  avg_camp_price_per_hour   numeric(6,2),
  school_hosted_camp_count  integer,
  camp_waitlist_signals     integer,

  -- Normalized scores (0–100 per sub-metric, percentile ranked vs all cities)
  score_demand              numeric(6,2),
  score_pricing_power       numeric(6,2),
  score_competitive         numeric(6,2),
  score_franchise_supply    numeric(6,2),
  score_ease_of_operation   numeric(6,2),
  score_parent_mindset      numeric(6,2),

  -- Composite score (calculated with default weights — re-ranked by sliders at query time)
  composite_score_default   numeric(6,2),

  -- Data freshness
  census_last_updated       date,
  bls_last_updated          date,
  fred_last_updated         date,
  nces_last_updated         date,
  greatschools_last_updated date,
  apify_last_updated        date,
  firecrawl_last_updated    date,
  scored_at                 timestamptz default now(),
  created_at                timestamptz default now()
);

-- Indexes for fast ranked queries
create index idx_cities_composite   on us_cities_scored (composite_score_default desc);
create index idx_cities_state       on us_cities_scored (state_abbr);
create index idx_cities_population  on us_cities_scored (population desc);
```

### How slider re-ranking works (no extra API calls)
When Sam moves a slider in City Search, the frontend recalculates composite score using stored category scores:

```
composite = (score_demand × w_demand)
          + (score_pricing_power × w_pricing)
          + (score_competitive × w_competitive)
          + (score_franchise_supply × w_franchise)
          + (score_ease_of_operation × w_ease)
          + (score_parent_mindset × w_mindset)
```

Where `w_*` = current slider values. This runs in the browser on the already-loaded dataset — instant, zero API calls.

### Data sources per column

| Column group | Source | Cost | Notes |
|---|---|---|---|
| Population, children, income, density | US Census ACS API | Free | Already wired |
| STEM jobs, labor participation | BLS API | Free | Already wired |
| Regional income, cost of living | FRED API | Free | Already wired |
| Public school counts | NCES CCD (Urban Institute) | Free | Already wired |
| Private + charter counts | GreatSchools API | $52.50/mo after trial | Waiting on Brett's key |
| Summer camp count, ratings | Apify Google Maps Scraper | ~$4/1k results | Already connected |
| Camp pricing, school-hosted flags | Firecrawl | Per crawl | Already connected |

### Seeding strategy — Phase 1 (Tuesday deadline)

**Step 1:** Pull the master city list from Census (all places above 50,000 population). Store city_name, state, population, lat/lon. ~800 rows. This is the skeleton.

**Step 2:** For each city, call the already-wired APIs (Census ACS, BLS, FRED, NCES) in batches. Store raw signal values. These are free and fast — can batch 50 cities at a time.

**Step 3:** Score each city. Normalize each raw signal to 0–100 percentile rank vs all cities in dataset. Calculate category scores. Calculate default composite score.

**Step 4:** Table is now queryable. City Search can return top 20 / top 50 / full list instantly.

**Phase 2 (after Tuesday):** Add Apify camp data and Firecrawl camp pricing per city. Add GreatSchools private school counts once Brett provides API key.

### Refresh schedule
- Census / BLS / FRED / NCES: quarterly (data doesn't change faster)
- Apify / Firecrawl: monthly (competitive landscape changes more)
- Triggered by Supabase Edge Function `refresh-city-scores` on cron schedule
- Manual trigger available via admin panel (not exposed to Sam/Kaylie)

---

## Table 2: `teacher_prospects_master`

### Purpose
A master database of teachers across all U.S. cities — Neuron Garage's owned recruiting asset. Target 100,000+ records. The Teacher Search screen queries this table by city, school, or criteria. No live scraping at search time.

### Target row count
100,000+ teachers. Start with elementary school teachers and camp/enrichment teachers. Grow over time.

### Schema

```sql
create table teacher_prospects_master (
  id                    uuid primary key default gen_random_uuid(),

  -- Identity
  full_name             text not null,
  first_name            text,
  last_name             text,

  -- School / location
  school_name           text,
  school_city           text,
  school_state          text,
  school_zip            text,
  district_name         text,

  -- Role
  grade_level           text,           -- e.g. "3rd Grade", "K-2", "Elementary"
  subject               text,           -- e.g. "STEM", "General", "Arts"
  years_experience      integer,
  teacher_type          text,           -- "active" | "retired"

  -- Contact (enriched)
  email                 text,
  email_verified        boolean default false,
  phone                 text,
  linkedin_url          text,

  -- Fit signals
  has_camp_experience   boolean default false,
  camp_experience_notes text,
  fit_score             integer,        -- 1-100, AI-generated
  fit_reasoning         text,

  -- Segment tags
  segment_tags          text[],         -- e.g. ["High Potential", "Follow-Up Needed"]

  -- Source tracking
  source                text,           -- "apollo" | "linkedin" | "apify" | "donorschoose" | "manual"
  source_id             text,           -- original ID from source system
  enriched_via          text[],         -- which tools were used to enrich this record

  -- Data freshness
  last_enriched_at      timestamptz,
  enrichment_due_at     timestamptz,    -- set to +90 days after each enrichment
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- Indexes
create index idx_teachers_city      on teacher_prospects_master (school_city, school_state);
create index idx_teachers_fit       on teacher_prospects_master (fit_score desc);
create index idx_teachers_type      on teacher_prospects_master (teacher_type);
create index idx_teachers_camp      on teacher_prospects_master (has_camp_experience);
create index idx_teachers_enrich    on teacher_prospects_master (enrichment_due_at);
```

### Seeding strategy

**Primary sources (use in this order):**

1. **Apollo** — search by job title ("elementary school teacher", "camp director", "enrichment teacher") + location. Apollo returns name, school, email where available, LinkedIn URL.
2. **LinkedIn** — via Apollo's LinkedIn data or Clay enrichment. Fills gaps Apollo misses.
3. **Apify K-12 School Staff Directory Scraper** — school-by-school staff scraping for teachers Apollo doesn't index.
4. **DonorsChoose API** — teachers who have posted classroom projects. Strong signal for engagement and camp interest. Free API.

**Email enrichment rule:**
- If a teacher record already has a verified email from the source dataset → store it directly, do not re-enrich
- If a teacher record has no email → trigger enrichment waterfall: Apollo → LinkedIn → Clay → any other available tool
- Never block seeding on missing emails — store the record and flag `email_verified = false`, enrich async

**Retired teachers:**
- Flag `teacher_type = 'retired'` for retired teachers
- Source via Apollo (search for "retired teacher" + city) and LinkedIn alumni searches
- These are a separate high-value segment for summer camp franchisee recruitment (Kaylie's addition)
- Stored in the same table, filtered by `teacher_type` in the UI

### Enrichment cadence
- Full enrichment pass runs quarterly via Supabase Edge Function `enrich-teacher-prospects`
- Checks `enrichment_due_at < now()` and processes in batches of 500
- Updates email, phone, LinkedIn, fit score, camp experience signals
- Sets `enrichment_due_at = now() + interval '90 days'` after each pass

### AI fit scoring
- Fit score (1–100) generated by Lovable's built-in AI per teacher record
- Heavily weights: prior summer camp experience, youth enrichment background, STEM subject, K-5 grade level
- Fit reasoning stored in `fit_reasoning` column — always visible in the UI (Show Formula principle)
- Re-scored quarterly during enrichment pass or when new signals are added

---

## Edge Functions Required

| Function name | Trigger | What it does |
|---|---|---|
| `seed-cities-database` | Manual (run once to bootstrap) | Pulls all 800+ cities from Census, calls ACS/BLS/FRED/NCES per city, scores and normalizes, populates `us_cities_scored` |
| `refresh-city-scores` | Cron (quarterly) + manual | Re-fetches raw signals for all cities, re-scores, updates `scored_at` |
| `seed-teachers-database` | Manual (run once to bootstrap) | Seeds initial teacher records from Apollo + DonorsChoose + Apify |
| `enrich-teacher-prospects` | Cron (quarterly) | Processes all records where `enrichment_due_at < now()`, fills missing emails, updates fit scores |

---

## Build Order for Tuesday Deadline

**Monday May 18:**
- [ ] Write and deploy `seed-cities-database` edge function
- [ ] Test run on 50 cities — verify scores look correct
- [ ] Full run on all 800+ cities
- [ ] Verify City Search screen reads from `us_cities_scored` table and returns ranked list instantly

**Tuesday May 19–20:**
- [ ] Write and deploy `seed-teachers-database` edge function
- [ ] Seed initial teacher batch (target: 10,000+ records minimum for first pass)
- [ ] Verify Teacher Search screen queries `teacher_prospects_master` by city
- [ ] Both tables live — report to Brett

---

## Definition of Done

- [ ] `us_cities_scored` populated with 800+ cities, all with composite scores
- [ ] City Search screen opens on full ranked national list, loads in under 3 seconds
- [ ] Sliders re-rank the list in real time with no loading spinner
- [ ] `teacher_prospects_master` seeded with 10,000+ records minimum
- [ ] Teacher Search screen can filter by city and return results from the database
- [ ] Show Formula still works — raw signal values visible per city
- [ ] Export CSV still works — exports from stored data

---

## What This Is NOT

- This is not replacing the existing `city_market_signals` table immediately — that table stays for the per-city detail view. The new `us_cities_scored` table powers the ranked national list.
- This is not a one-time scrape — both tables are living assets with scheduled refresh
- This is not blocking Email Outreach or Candidate Pipeline — those features do not depend on the database layer

---

*One branch per function. Test each before moving to the next. Small reversible steps.*
