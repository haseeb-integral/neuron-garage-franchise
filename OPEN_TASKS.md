# Open Tasks — Neuron Garage

> Last reviewed: May 18, 2026.
> GitHub is single source of truth. Do not edit Space OPEN_TASKS.md.
> Source of truth hierarchy: May 15 meeting decisions override May 8 where they conflict.

---

## 🚨 Task #0 — Database Layer (BLOCKER — due Tuesday May 20)

**This task blocks everything else. City Search and Teacher Search cannot move forward until this is live.**

See **`DATABASE_LAYER_SPEC.md`** for full technical plan, schema, sourcing options, and build steps.
See **`TEACHER_IDEAL_PROFILE.md`** for who we are recruiting and why — read this before building Teacher Search or fit scoring.

### Summary of what must be built:

**Table 1: `us_cities_scored`** — all U.S. cities above 50,000 population, pre-scored and pre-ranked
- Pre-computed scores across all 6 categories + composite score
- Instant load — no live API calls at query time
- Sliders re-rank on top of this stored data
- Refreshed on scheduled background job (not per user click)
- This is Neuron Garage's owned city intelligence asset

**Table 2: `teacher_prospects_master`** — master teacher database, target 100,000+ records
- **Three target segments (confirmed May 15 meeting):**
  - Active elementary school teachers (K–6)
  - Retired elementary school teachers
  - Summer camp / enrichment educators
- **Data sourcing is an open decision — see `DATABASE_LAYER_SPEC.md` → Teacher Sourcing Options**
  (Options include Apollo, purchased vendor lists, Apify, DonorsChoose — likely a combination)
- If a teacher record does not have an email in the dataset, enrich via Apollo, LinkedIn, or any other available source to fill it
- Fit score (1–100) ranks teachers by match to Neuron Garage franchisee profile — see `TEACHER_IDEAL_PROFILE.md`
- This is Neuron Garage's owned recruiting asset — it compounds in value over time

> ⚠️ Teacher segment scope is a strong starting point. Can be expanded or reduced by Kaylie/Sam as strategy evolves.

**Deadline: Tuesday May 20 — database tables live in Supabase with initial data seeded**

---

## ✅ Completed — Day 1 (May 12–14)

~~**Task 1: Fix "Dallas-Fort Worth" metro label bug**~~ ✅ May 12

~~**Task 2: Rename "Add to Watch List" → "Add to Favorites" + working favorites list**~~ ✅ May 13

~~**Task 3: Remove 50% cap on master category sliders + auto-rebalance to 100%**~~ ✅ May 13

~~**Task 4: Sub-weight drawer system**~~ ✅ May 14
- Editable sub-metric weights, running total, auto-normalizes to 100% on save

~~**Task 5: Score explanation panel**~~ ✅ May 14
- Verdict label + plain-English reason under gauge

~~**Task 6: "Show Formula" button**~~ ✅ May 14
- Raw/Norm/Share/Contrib table, column tooltips, legend, master weight contribution sentence
- Score-delta toast: `old → new` for category AND composite

~~**Task 7: Export City Search to CSV**~~ ✅ May 14
- Toolbar "Export CSV" = full ranked table (unchanged)
- Drawer "Export Raw Signals" = open city's `city_market_signals` rows only
- Filename: `{city-slug}-source-data-{date}.csv`

~~**Task 8: Save Search (saved configurations)**~~ ✅ May 14
- Confirmed fully working — `saved_searches` table persists `master_weights` + `sub_weights` jsonb per user

~~**Task 10: NCES CCD API — public elementary school count**~~ ✅ May 14
- `fetch-school-counts` edge function live, no API key
- 48/50 cities matched; Frisco TX=35 schools/22,950 enrolled · Austin TX=156/77,563
- Per-city Refresh button also calls school count refresh (non-blocking)
- Drawer shows "Public elementary (NCES CCD 2022): {count} schools · {enrollment} enrolled"

~~**Task 16: Rename "Teacher Prospects" → "Teacher Search" across all UI**~~ ✅ May 14
- Updated: sidebar nav, journey bar, page header, global search, dashboard tile, spec page, onboarding tour, find-teachers dialog
- Left untouched: historical activity-log entry in `pipelineData.ts` + code comment in `fitTags.ts` (neither rendered as UI label)

---

## ⚡ City Search — Pending (unblocked after Task #0)

### 9. Multiple named favorites lists (rolled over from Day 1)
- Drop-down on "Add to Favorites" → pick list; create / rename / delete; move cities between lists
- **Risk:** low-medium

### 11. Wire GreatSchools API — private + charter elementary school count
- **BLOCKED — waiting on Brett's API key**
- Brett: sign up at https://www.greatschools.org/api (School Essentials, free 14 days then $52.50/mo)
- Haseeb: add key to Lovable env as `GREATSCHOOLS_API_KEY` once received
- Store: `private_elementary_count`, `charter_elementary_count` in `city_market_signals`
- **Cost decision:** confirm purchase before next client review

---

## ⚡ Teacher Search — Pending (unblocked after Task #0)

### 12. Wire Teacher Search to real data
- See `DATABASE_LAYER_SPEC.md` → Teacher Sourcing Options and `TEACHER_IDEAL_PROFILE.md`
- Stack depends on sourcing decision (Apollo / vendor list / Apify + DonorsChoose + Clay)
- Store in `teacher_prospects_master` table
- **Risk:** medium-high — Clay webhook is the most complex piece if used

### 13. Prospect list view + filters
- Columns: name, school, city/state, email, fit score, teacher type
- Filters: city, school, grade level, teacher type (active / retired / camp), fit score threshold
- **Risk:** medium

### 14. AI fit scoring (1–100)
- Scoring criteria defined in `TEACHER_IDEAL_PROFILE.md` — use that as the AI prompt source
- Heavily weights: K–6 grade level, STEM/maker subject, summer camp experience, retired status, DonorsChoose presence
- **Risk:** medium

### 15. Prospect segmentation / tagged lists + CSV export
- Tag into named lists ("High Potential Austin", "Follow-Up Needed", "Not a Fit")
- **Risk:** low-medium

---

## ⚡ Email Outreach + Candidate Pipeline — Pending

### 17. SmartLead integration (Feature 3)
- Wire SmartLead ("Integral Leads"); AI-personalized emails from teacher data
- **Risk:** high — real emails go out; send 1 test email to yourself first

### 18. Teacher → Lead conversion
- Teacher responds via SmartLead → enters Candidate Pipeline at "New Lead"
- **Risk:** medium

### 19. Candidate Pipeline — real data wiring
- Replace placeholder candidates with real leads from Email Outreach
- **Risk:** medium

### 20. PDF export of candidate lead sheet
- Per-candidate PDF with all card details (Kaylie's ask, May 8)
- **Risk:** low-medium

---

## 🚧 Current risk

- **Database layer (Task #0) is the single critical path item.** Everything stacks behind it.
- **Teacher sourcing decision is open** — vendor list vs Apollo vs scraping. Brett needs to decide before Teacher Search seeding starts.
- Teacher Search stack (Clay webhook) is the hardest single integration piece
- SmartLead is high-risk: real emails go out to real people — test thoroughly before any real send
- Sam's QA bar is high — working math over feature count, always

---

## 🛑 Explicitly out of scope

- Google / Microsoft / SSO login · Multi-tenancy · Onboarding flow · Mobile app
- "Ask AI" sparkle button · PDF report for City Search · Module 2 migration to Cursor
- Anything not on this list — add to `LATER.md`

---

## How to use this file

- Strike through completed items with `~~text~~ ✅ <date>`
- New items that don't block current work → `LATER.md`
- **GitHub is single source of truth. Do not edit the Space OPEN_TASKS.md.**
