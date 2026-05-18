
## Plan: `public_schools` table + backfill

### Step 1 — Migration: create `public_schools`

```sql
create table public.public_schools (
  nces_id                 text primary key,
  school_name             text not null,
  district_name           text,
  district_nces_id        text,

  -- location
  street_address          text,
  city_name               text,
  state_abbr              text,
  zip                     text,
  latitude                numeric(9,6),
  longitude               numeric(9,6),
  phone                   text,

  -- city link (nullable; set when we can match to a seeded city)
  us_cities_scored_id     uuid references public.us_cities_scored(id) on delete set null,

  -- grade / level
  lowest_grade_offered    text,           -- "PK","KG","01"…"12"
  highest_grade_offered   text,
  school_level            text,           -- elementary | middle | high | other
  is_elementary_serving   boolean generated always as (
    lowest_grade_offered in ('PK','KG','01','02','03','04','05')
  ) stored,

  -- type
  school_type             text,           -- regular, special ed, vocational, alternative
  is_charter              boolean default false,
  is_magnet               boolean default false,
  school_status           text,           -- open / closed / new etc.

  -- enrollment
  enrollment              integer,
  teachers_fte            numeric(8,2),

  -- source
  nces_year               integer,
  nces_last_updated       date,
  raw                     jsonb,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index idx_schools_city        on public.public_schools (us_cities_scored_id);
create index idx_schools_state       on public.public_schools (state_abbr);
create index idx_schools_district    on public.public_schools (district_nces_id);
create index idx_schools_elem        on public.public_schools (is_elementary_serving);
create index idx_schools_level       on public.public_schools (school_level);
create index idx_schools_name_trgm   on public.public_schools using gin (school_name gin_trgm_ops);

alter table public.public_schools enable row level security;

create policy "Authenticated can view public_schools"
  on public.public_schools for select to authenticated using (true);

create trigger trg_public_schools_updated_at
  before update on public.public_schools
  for each row execute function public.update_updated_at_column();
```

RLS: SELECT only for authenticated. No client INSERT/UPDATE/DELETE (writes happen via edge function with service role).

`us_cities_scored.public_school_count` / `public_elementary_count` remain as cached counts — `public_schools` becomes source of truth.

### Step 2 — Edge function: `backfill-public-schools`

- Iterates all 909 cities with `nces_last_updated is not null`
- For each: re-call NCES CCD (same call `seed-cities-database` already makes, no filter)
- Upsert each row into `public_schools` on `nces_id`
- Set `us_cities_scored_id` to the city it came from
- Batched 25 cities at a time; resumable via offset param
- Background invocation, ~15–18 min total. Doesn't block anything.

### Step 3 — Verify

- Row count ~45k–55k
- Spot-check Boston / Frisco / NYC: school list matches prior elementary counts
- Confirm `is_elementary_serving = true` count ≈ `us_cities_scored.public_elementary_count` totals

### Step 4 — Doc-sync drafts (Mode A — wait for "go")

- `PROJECT_CONTEXT.md` — add `public_schools` table
- `HOW_IT_WORKS.md` — note schools are now stored per-row, counts are derived
- `APIS.md` — NCES section: "stored as `public_schools`, one row per school"
- `GLOSSARY.md` — add `public_schools` entry
- `OPEN_TASKS.md` — unblocks Teacher Search seeding (school-name scoped Apollo), `enrich-school-staff`, City Detail "Show Formula" school list

### Not in this plan
- No changes to `seed-cities-database` yet (next task: have it also upsert into `public_schools` so future seeds stay in sync)
- No changes to `us_cities_scored` columns
- `composite_score_default = null` gap still parked, awaiting your call

### Order of execution
1. Run migration (you approve via Supabase migration tool)
2. Write + deploy `backfill-public-schools`
3. Kick off backfill, monitor
4. Spot-check, then draft doc updates for your "go"
