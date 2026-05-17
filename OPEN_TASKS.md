# Open Tasks — Neuron Garage

> Last reviewed: May 18, 2026.
> GitHub is single source of truth. Do not edit Space OPEN_TASKS.md.
> Source of truth hierarchy: May 15 meeting decisions override May 8 where they conflict.

---

## 🚨 Task #0 — Database Layer (BLOCKER — due Tuesday May 20)

**This task blocks everything else. City Search and Teacher Search cannot move forward until this is live.**

See **`DATABASE_LAYER_SPEC.md`** for full technical plan, schema, options, and build steps.

### Summary of what must be built:

**Table 1: `us_cities_scored`** — all U.S. cities above 50,000 population, pre-scored and pre-ranked
- Pre-computed scores across all 6 categories + composite score
- Instant load — no live API calls at query time
- Sliders re-rank on top of this stored data
- Refreshed on scheduled background job (not per user click)
- This is Neuron Garage's owned city intelligence asset

**Table 2: `teacher_prospects_master`** — master teacher database, target 100,000+ records
- Elementary school teachers and camp/enrichment teachers across all U.S. cities
- Seeded via Apollo, LinkedIn, and any other available source
- Retired teachers flagged separately (Kaylie's addition — high value for summer camp recruitment)
- Enrichment (contact info, fit signals) runs quarterly as background job
- This is Neuron Garage's owned recruiting asset — it compounds in value over time

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

### 12. Wire Teacher Search to real data (Apify + Clay + DonorsChoose + Firecrawl)
- See `day2feature2taskspec.md`
- Stack: Apify K-12 scraper → DonorsChoose API → Clay enrichment webhook → AI fit scoring → Firecrawl fallback
- Store in `prospects` table linked to source city
- **Risk:** medium-high — Clay webhook is the most complex piece

### 13. Prospect list view + filters
- Columns: name, school, city/state, email, fit score
- Filters: city, school, grade level, experience, enrichment status
- **Risk:** medium

### 14. AI fit scoring (1–100)
- Heavily weight summer camp / youth camp experience (per SOW)
- Full scoring prompt in `day2feature2taskspec.md`
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
