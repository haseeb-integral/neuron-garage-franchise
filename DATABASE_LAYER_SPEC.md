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

> For the full definition of who we are recruiting and why, see **`TEACHER_IDEAL_PROFILE.md`** — read that file before building anything related to Teacher Search or fit scoring.

---

## Table 1: `us_cities_scored`

### Purpose
Store all U.S. cities above 50,000 population, pre-scored across all 6 categories, so City Search can return a fully ranked national list instantly.

### Target row count
~800–1,000 cities (all U.S. cities above 50,000 population per Census data)

### ⚠️ Use existing `us_cities_geo` as seed skeleton

Supabase already has a `us_cities_geo` table (read-only reference: city name, state, lat/lng, population). **Do not re-fetch the city list from Census raw.** The `seed-cities-database` edge function should:

1. Read all rows from `us_cities_geo` where population ≥ 50,000 — this is your ~800-city skeleton
2. For each city, call the enrichment APIs (Census ACS, BLS, BEA, FRED, NCES) to fill raw signal values
3. Score, normalize, and write into `us_cities_scored`

This avoids duplicate geo data and saves a Census API call for the city list itself.

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
  regional_median_income    integer,                 -- sourced from BEA API (already wired)
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
  bea_last_updated          date,
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
When a user moves a slider in City Search, the frontend recalculates composite score using stored category scores:

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
| City list skeleton | `us_cities_geo` (existing Supabase table) | Free | Use this — do NOT re-fetch from Census raw |
| Population, children, income, density | US Census ACS API | Free | Already wired (`CENSUS_API_KEY`) |
| STEM jobs, labor participation | BLS API | Free | Already wired (`BLS_API_KEY`) |
| Regional income | BEA API | Free | Already wired (`BEA_API_KEY`) |
| Cost of living index | FRED API | Free | Already wired (no key needed) |
| Public school counts | NCES CCD (Urban Institute) | Free | Already wired (no key needed) |
| Private + charter counts | GreatSchools API | $52.50/mo after trial | Waiting on Brett's key (`GREATSCHOOLS_API_KEY`) |
| Summer camp count, ratings | Apify Google Maps Scraper | ~$4/1k results | Already connected (`APIFY_API_TOKEN`) |
| Camp pricing, school-hosted flags | Firecrawl | Per crawl | Already connected (`FIRECRAWL_API_KEY`) |

### Seeding strategy — Phase 1 (Tuesday deadline)

**Step 1:** Read city skeleton from existing `us_cities_geo` table (filter: population ≥ 50,000). ~800 rows. No API call needed for this step.

**Step 2:** For each city, call the already-wired APIs (Census ACS, BLS, BEA, FRED, NCES) in batches. Store raw signal values. These are free and fast — can batch 50 cities at a time.

**Step 3:** Score each city. Normalize each raw signal to 0–100 percentile rank vs all cities in dataset. Calculate category scores. Calculate default composite score.

**Step 4:** Table is now queryable. City Search can return top 20 / top 50 / full list instantly.

**Phase 2 (after Tuesday):** Add Apify camp data and Firecrawl camp pricing per city. Add GreatSchools private school counts once Brett provides API key.

### Refresh schedule
- Census / BLS / BEA / FRED / NCES: quarterly (data doesn't change faster)
- Apify / Firecrawl: monthly (competitive landscape changes more)
- Triggered by Supabase Edge Function `refresh-city-scores` on cron schedule
- Manual trigger available via admin panel (not exposed to Sam/Kaylie)

---

## Table 2: `teacher_prospects_master`

### Purpose
A master database of teachers across all U.S. cities — Neuron Garage's owned recruiting asset. Target 100,000+ records. The Teacher Search screen queries this table by city, school, or criteria. No live scraping at search time.

> **Note:** The existing `teacher_prospects` table (Apify-only, no Apollo/vendor data) stays in place — it powers the current Teacher Search UI. `teacher_prospects_master` is a new, separate table that will replace it once seeded.

> **Who we are seeding:** Active elementary school teachers (K–6), retired elementary school teachers, and summer camp / enrichment educators. See **`TEACHER_IDEAL_PROFILE.md`** for the full profile, fit scoring criteria, and reasoning.
>
> ⚠️ This scope is a strong starting point confirmed in the May 15 meeting. It can be expanded or reduced by Kaylie/Sam as the recruiting strategy evolves. The fit scoring system is designed to be adjustable without re-seeding.

### Target row count
100,000+ teachers. Start with the three target segments above. Grow over time.

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
  subject               text,           -- e.g. "STEM", "Maker", "General", "Arts"
  years_experience      integer,
  teacher_type          text,           -- "active" | "retired" | "camp_enrichment"

  -- Contact (enriched)
  email                 text,
  email_verified        boolean default false,
  phone                 text,
  linkedin_url          text,

  -- Fit signals
  has_camp_experience   boolean default false,
  camp_experience_notes text,
  fit_score             integer,        -- 1–100, AI-generated, see TEACHER_IDEAL_PROFILE.md
  fit_reasoning         text,           -- always stored and visible in UI (Show Formula principle)

  -- Segment tags
  segment_tags          text[],         -- e.g. ["High Potential", "STEM Teacher", "Retired", "Camp Educator"]

  -- Source tracking
  source                text,           -- "apollo" | "linkedin" | "apify" | "donorschoose" | "vendor_list" | "manual"
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

---

## Teacher Sourcing Options — Open Decision for Brett

> **This decision must be made before `seed-teachers-database` is built.** The seeding strategy and edge function design depend on which sources are used. Brett to decide.

We have four realistic paths to seed `teacher_prospects_master`. They are not mutually exclusive — the best outcome is likely a combination.

### Option A: Apollo (Recommended starting point)

**What it does:** Search by job title + city/state. Use the query templates in `TEACHER_IDEAL_PROFILE.md`. Returns name, school, email (where available), LinkedIn URL, phone.

| Factor | Detail |
|---|---|
| Volume | 50,000–150,000 U.S. teacher records depending on search filters |
| Email coverage | ~40–60% of records have a verified email |
| Cost | Credits-based. ~$0.01–0.05 per exported record depending on plan |
| Speed | Fast — export in bulk via Apollo API |
| Quality | Good for active teachers and camp educators. Weaker on retired teachers. |
| Our status | Already have Apollo access |

**Verdict:** Best starting point. Pull as many records as credits allow, then fill gaps with other sources.

---

### Option B: Purchased Vendor Lists

**What it does:** Buy a pre-built teacher contact list from a B2B data vendor. Delivered as a CSV. Upload directly to Supabase.

**Vendors to evaluate:**

| Vendor | Specialty | Est. Cost | Notes |
|---|---|---|---|
| **EducationData.gov + NCES** | Public school teacher names by district | Free | Name + school only, no email. Needs enrichment. |
| **Exact Data** | K-12 teacher mailing lists | ~$500–2,000 per 50k records | Postal + email. Worth a quote. |
| **InfoUSA / Data.com** | General professional lists incl. teachers | ~$300–1,500 per 50k | Mixed quality. Check freshness. |
| **Melissa Data** | Education sector lists | ~$400–1,500 | Good deliverability guarantees. |
| **LeadsPlease** | Teacher + school admin lists by state | ~$200–800 per state | Smaller vendor, can buy by state. |
| **K12 Prospects (specialty vendor)** | K-12 educators only | ~$1,000–3,000 for national | Purpose-built for this use case. |

**Pros:**
- Fastest path to 50,000–200,000 records in a single step
- No scraping infrastructure needed
- Some vendors include verified emails already

**Cons:**
- One-time purchase — data goes stale (re-purchase annually)
- Quality varies — always request a sample (500 records) before purchasing
- Must confirm CAN-SPAM compliance before loading into SmartLead

**Verdict:** High leverage if we buy from a quality vendor. Request samples from 2–3 vendors before committing. Budget: $500–2,000.

---

### Option C: Apify K-12 School Staff Directory Scraper

**What it does:** Scrapes school websites and staff directories school-by-school.

| Factor | Detail |
|---|---|
| Volume | Unlimited but slow — one school at a time |
| Email coverage | Low — most school sites list name + room number only |
| Cost | ~$4 per 1,000 results |
| Speed | Too slow for national first pass |
| Our status | Already connected |

**Verdict:** Gap-filler for top 20–50 priority cities only. Not for national first pass.

---

### Option D: DonorsChoose API

**What it does:** Free API returning teachers who have posted classroom project requests. Strong mission-driven signal — exactly the profile Neuron Garage wants.

| Factor | Detail |
|---|---|
| Volume | ~500,000 teacher records nationally |
| Email coverage | No direct email — cross-reference with Apollo or vendor list |
| Cost | Free |
| Speed | Fast API |
| Our status | Not yet connected |

**Verdict:** Excellent fit-signal layer. Pull all records, match by name+school, boost fit scores for matched records. See `TEACHER_IDEAL_PROFILE.md` for why DonorsChoose is a strong signal.

---

### Recommended Combination (pending Brett's call)

1. **Apollo bulk export** — first pass (~50k records, use all available credits)
2. **One vendor list purchase** — request samples from Exact Data + LeadsPlease this week (~$500–1,000 budget)
3. **DonorsChoose API** — pull all records, use as fit signal layer
4. **Apify** — targeted gap-fill for top 20 priority cities only

Target outcome: **100,000+ seeded records, ~60–70% with verified email**.

---

### Email enrichment rule (all sources)
- If a record already has a verified email from the source → store it directly, do not re-enrich
- If a record has no email → trigger enrichment waterfall: Apollo → LinkedIn → Clay → any other available tool
- Never block seeding on missing emails — store the record, flag `email_verified = false`, enrich async
- Retired teachers: same rule applies. Source via Apollo + LinkedIn alumni searches + vendor lists where available.

---

## Edge Functions Required

| Function name | Trigger | What it does |
|---|---|---|
| `seed-cities-database` | Manual (run once to bootstrap) | Reads `us_cities_geo` (pop ≥ 50k), calls ACS/BLS/BEA/FRED/NCES per city, scores and normalizes, populates `us_cities_scored` |
| `refresh-city-scores` | Cron (quarterly) + manual | Re-fetches raw signals for all cities, re-scores, updates `scored_at` |
| `seed-teachers-database` | Manual (run once to bootstrap) | Seeds initial teacher records from chosen sources (Apollo / vendor CSV upload / Apify / DonorsChoose) |
| `enrich-teacher-prospects` | Cron (quarterly) | Processes all records where `enrichment_due_at < now()`, fills missing emails, updates fit scores |

---

## Build Order for Tuesday Deadline

**Monday May 18:**
- [ ] Brett decides on teacher sourcing approach (Option A / B / combo)
- [ ] Write and deploy `seed-cities-database` edge function
- [ ] Test run on 50 cities — verify scores look correct
- [ ] Full run on all 800+ cities
- [ ] Verify City Search screen reads from `us_cities_scored` and returns ranked list instantly

**Tuesday May 19–20:**
- [ ] Write and deploy `seed-teachers-database` edge function (once sourcing decision is made)
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
- [ ] Show Formula still works — raw signal values visible per city (fit_reasoning column)
- [ ] Export CSV still works — exports from stored data

---

## What This Is NOT

- This is not replacing the existing `city_market_signals` table or `teacher_prospects` table immediately — both stay for the current UI. The new tables power the upgraded national-scale features.
- This is not a one-time scrape — both tables are living assets with scheduled refresh
- This is not blocking Email Outreach or Candidate Pipeline — those features do not depend on the database layer

---

*One branch per function. Test each before moving to the next. Small reversible steps.*
