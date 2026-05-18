
## Part 1 — The proactive walk you asked for

I walked every current screen + every future screen on `OPEN_TASKS.md` and pattern-matched what data each one needs. Here is the full gap list, grouped by urgency.

### A. Gaps that are now blocking — fix this sprint

| # | Gap | Why it matters | Screens affected |
|---|---|---|---|
| A1 | `seed-cities-database` doesn't upsert into `public_schools` | The moment anyone re-seeds or adds new cities, `public_schools` drifts from cached counts. Same NCES response, zero extra API calls. | City Search, Teacher Search seeding, "Show Formula" school list |
| A2 | `us_cities_scored.composite_score_default` is null on all 948 rows | City Search can't rank nationally — the whole point of the seeded table. Cause: seed function only populated raw signals, never ran the normalize/score pass. | City Search (national ranked list) |
| A3 | `teacher_prospects` has no FK to `public_schools` (only free-text `school`) | Can't join a teacher to her school record, can't compute "schools with ≥3 prospects" cluster signal, can't dedupe Apollo + Apify hits on the same school. | Teacher Search, Email Outreach personalization |
| A4 | `teacher_prospects` has no FK to `us_cities_scored` (only free-text `city`/`state`) | Same problem at city level — can't reliably filter "teachers in my favorited cities". Today's matching is string compare. | Teacher Search, Dashboard counts |
| A5 | No `teacher_type` / `subject` / `segment` columns on `teacher_prospects` | Fit scoring per `TEACHER_IDEAL_PROFILE.md` needs these. Right now everything is mapped to `K-2 / 3-5 / 6-8` via fragile string parsing of `grade`. | Teacher Search fit score, all four target segments |

### B. Gaps that block the next sprint (Task #11, #12, #17, #18, #19)

| # | Gap | When it bites |
|---|---|---|
| B1 | `teacher_prospects_master` table doesn't exist (only `teacher_prospects` with placeholder schema) | The whole Task #0 teacher half is unfinished. Apollo / vendor CSV / DonorsChoose have nowhere to land. |
| B2 | No email-send tracking columns (`smartlead_campaign_id`, `last_contacted_at`, `reply_status`, `unsubscribed_at`) on `teacher_prospects` | Task #17 SmartLead integration has no place to write back. |
| B3 | `candidates` has `prospect_id` but no `school_nces_id` / `us_cities_scored_id` / `source_segment` | Lead Sheet PDF (Task #20), source-funnel analytics, and "show me where this candidate came from" all stay weak. |
| B4 | `candidates.city` / `state` are free text, not FKs | Same problem as A4 — can't join candidates to a scored city to show market context on the candidate card. |
| B5 | `cities` table and `us_cities_scored` table duplicate each other | Two sources of truth for the same city. Eventually one must absorb the other. |
| B6 | No `donorschoose_id` / `linkedin_url` / `years_experience` (proper int) / `has_summer_camp_exp` (real signal) on teacher rows | Fit scoring per the ideal profile can't read what isn't there. |

### C. Gaps that don't bite yet but will

| # | Gap |
|---|---|
| C1 | No `nces_id` on `public_schools` is set as UNIQUE constraint visibly — verify before next backfill (today it's PK, fine — flagging for audit) |
| C2 | `public_schools.us_cities_scored_id` set via "last city wins" on alias overlap — accepted, but document it on the column so future readers don't think it's authoritative |
| C3 | No `school_district` table — district-level recruiting (one Apollo search per district instead of per school) will want it |
| C4 | No `school_principal` / `school_contact_email` columns — Apify and Firecrawl already pull these, currently discarded |

---

## Part 2 — What to do NOW (this turn, after you approve)

### Step 1 — Migration: add the missing structural columns + FKs

```sql
-- A3 + A5 + B6
alter table public.teacher_prospects
  add column if not exists school_nces_id text references public.public_schools(nces_id) on delete set null,
  add column if not exists us_cities_scored_id uuid references public.us_cities_scored(id) on delete set null,
  add column if not exists teacher_type text,        -- 'active_k6' | 'retired' | 'camp_enrichment' | 'secondary_hands_on'
  add column if not exists subject text,             -- 'stem' | 'maker' | 'art' | 'general_elementary' | 'robotics' | etc.
  add column if not exists segment text,             -- denormalized segment label for filtering
  add column if not exists linkedin_url text,
  add column if not exists donorschoose_id text,
  add column if not exists last_enriched_at timestamptz,
  add column if not exists enrichment_source text;   -- 'apollo' | 'apify' | 'vendor_csv' | 'firecrawl'

create index if not exists idx_tp_school_nces on public.teacher_prospects(school_nces_id);
create index if not exists idx_tp_city_scored on public.teacher_prospects(us_cities_scored_id);
create index if not exists idx_tp_type on public.teacher_prospects(teacher_type);
```

This **adds** columns only — no rename, no widening of existing column meaning. Safe.

### Step 2 — Wire `seed-cities-database` to also upsert into `public_schools` (A1)

In the inner loop right after `fetchNcesForCity` returns, take the raw `openSchools` array (already in memory — no extra API call) and upsert each row into `public_schools` on `nces_id`, setting `us_cities_scored_id` to the city being processed. ~30 lines added. Same upsert shape `backfill-public-schools` uses today, so the two functions stay consistent.

### Step 3 — Run the normalize/score pass to fix A2

Call `seed-cities-database` with `{ normalize_only: true }`. This is already implemented (lines 406–470 of the function) — it reads all 948 rows, computes percentile ranks, writes `score_demand` / `score_pricing_power` / `score_competitive` / `score_franchise_supply` / `score_ease_of_operation` / `score_parent_mindset` and `composite_score_default`. Takes ~30 seconds. Unblocks City Search national ranking immediately.

### Step 4 — Verify

- `select count(*) from us_cities_scored where composite_score_default is not null;` → expect 948
- `select count(*) from public_schools;` → expect ≥ 38,196 (slightly higher if seed run picks up any new aliases)
- Top 10 by composite for sanity check (Frisco/Austin/Plano should be near the top per Sam's gut check)

### Step 5 — Doc updates (Mode A — drafts shown in chat, wait for "go")

- `PROJECT_CONTEXT.md` § 2 — new columns on `teacher_prospects`
- `PROJECT_CONTEXT.md` § 5 — drop the "composite null on all rows" entry
- `HOW_IT_WORKS.md` § 3 — Teacher Search: school + city are now FK-linked, not text-matched
- `APIS.md` — note `seed-cities-database` now writes to both `us_cities_scored` and `public_schools`
- `OPEN_TASKS.md` — close 11d (now done) and the "composite null" gap; open new line-items B1–B6 as deferred follow-ups so they're tracked, not floating in my head

---

## Part 3 — What I am explicitly NOT doing in this turn

To keep the change reviewable:
- Not building `teacher_prospects_master` (B1) — that's a big design moment, deserves its own plan after Brett's sourcing decision
- Not touching `candidates` columns (B3, B4) — additive, but better to bundle with the Teacher → Candidate promotion wiring
- Not consolidating `cities` ↔ `us_cities_scored` (B5) — high blast radius, separate plan
- Not adding `school_district` or `principal` columns (C3, C4) — wait for the use case to be real

These all become tracked OPEN_TASKS items in Step 5 so nothing slips.

---

## Risk

- **Step 1 (migration):** low. Pure additive, all new columns nullable, no data backfill required.
- **Step 2 (seed function edit):** low-medium. Logic change to a deployed function. Mitigated by: same upsert shape as `backfill-public-schools` (already proven), tested via a dry-run invocation first.
- **Step 3 (normalize pass):** low. Already written, idempotent, only writes to `us_cities_scored` columns that are currently null.

## How to undo
- Step 1: `alter table teacher_prospects drop column ...` per added column.
- Step 2: revert the seed function file from git.
- Step 3: `update us_cities_scored set composite_score_default = null, score_demand = null, ...;` — no harm done, just back to today's state.
