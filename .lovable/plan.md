## What to build

Three documentation files for the GitHub repo, all generated from live Lovable Cloud state (secrets, tables, edge functions, routes) — not from memory.

### 1. Create `HOW_IT_WORKS.md`

Narrative of how the product actually works, end-to-end. Sections:

- **The job the app does** — 2–3 sentences
- **The user journey** — Dashboard → City Search → Teacher Search → Email Outreach → Candidate Pipeline → Onboarding (with what the user gets at each step)
- **How each screen works** — for each of the 7 protected pages: what the user sees, what action they take, what fires behind the scenes (edge function / table / API), what comes out
- **Key data flows** — city scoring math (46 metrics → normalized → weighted → composite), teacher fit score, candidate stage transitions, checklist auto-seeding on `confirmation`
- **Cross-feature links** — favorites filter Teacher Search, promoting a teacher creates a candidate, candidate → onboarding handoff (flagged as built vs not-yet-built)
- **What's manual vs automatic** — kanban moves manual, checklist seeding automatic, city refresh manual per-city (today)

### 2. Create `APIS.md`

Per-API reference page. Three sections:

**Section A — Live & wired** (one block per API using this template):
```
## Census ACS
- Purpose: ...
- Secret: CENSUS_API_KEY
- Used in: supabase/functions/_shared/metricFetchers.ts
- Called from: fetch-city-market-data-sow
- Cost / rate limit: Free / 500 per day per key
- Owner of key: Haseeb
- Fallback if down: Cached last value in city_market_signals
- Docs: <url>
- Status: Live
```
Covers: Census ACS, BLS, BEA, FRED, NCES CCD, Apify (Google Maps actor), Firecrawl, Lovable AI Gateway, Supabase.

**Section B — Approved but not wired**: GreatSchools, SmartLead ("Integral Leads"), Apollo, DonorsChoose, Clay — each with what it's for and what's blocking.

**Section C — Database-seeding APIs (new sub-section per your question)**:
Explicit table of which APIs feed which database table, separating the two patterns:
- **Per-row live fetch** (today): Census/BLS/FRED/NCES/Apify called per city, writes to `city_market_signals` / `city_competitors`
- **Bulk seed for `us_cities_scored`** (Task #0): which APIs are batch-pulled once and refreshed on a schedule
- **Bulk seed for `teacher_prospects_master`** (Task #0): Apollo bulk export / vendor list / Apify school directory / DonorsChoose — including the open decision from May 15 (Brett picks A+B+D combo)
- **Purchased data lists**: vendor lists (Exact Data, LeadsPlease, K12 Prospects) noted as one-time CSV ingest, not an API

This directly answers your question: yes, `APIS.md` should call out which APIs are for live calls vs which feed the seeded database, and which data sources are purchased CSVs (no API at all).

### 3. Answer: which files need updating after app changes?

I'll add a short "Maintenance" section at the top of `PROJECT_CONTEXT.md` with this table:

| Change | Update file(s) |
|---|---|
| Added/removed a page or route | `PROJECT_CONTEXT.md` § 1 + `HOW_IT_WORKS.md` |
| Added/removed/renamed a Supabase table or column | `PROJECT_CONTEXT.md` § 2 |
| Added/removed an edge function | `PROJECT_CONTEXT.md` § 3 + `APIS.md` (if it calls a new API) |
| Wired a new third-party API | `APIS.md` (new block) + `PROJECT_CONTEXT.md` § 4 |
| Removed an API or rotated key owner | `APIS.md` only |
| Product behavior changed (flow, math, rules) | `HOW_IT_WORKS.md` + `MAY15_MEETING_NOTES.md` successor if it was a client decision |
| Known bug fixed or new bug found | `PROJECT_CONTEXT.md` § 5 |
| Sprint task done | `OPEN_TASKS.md` |
| Anything visual | `DESIGN.md` (only if rule changes; not for one-off tweaks) |

Rule of thumb: `PROJECT_CONTEXT.md` is high-churn inventory, `HOW_IT_WORKS.md` is low-churn behavior, `APIS.md` is medium-churn reference.

### Data sources I'll use to generate

- Live secrets list (already have it: 8 third-party keys configured)
- Live tables list (already have it: 21 tables)
- `supabase/functions/` directory (6 functions + shared modules)
- `src/App.tsx` routes
- `MAY15_MEETING_NOTES.md` for the database-seeding decisions
- `DATABASE_LAYER_SPEC.md` for the seed table plan
- `OPEN_TASKS.md` for blocked/pending API status

### Files created / edited

- `HOW_IT_WORKS.md` — new
- `APIS.md` — new
- `PROJECT_CONTEXT.md` — add Maintenance section at top (no other changes)
- `README.md` — add the two new files to the file map

### Out of scope (intentionally not doing)

- No code changes
- No DB migrations
- Not refactoring `PROJECT_CONTEXT.md` content (just prepending the Maintenance section)
- Not touching `CLAUDE.md` (rules unchanged)
