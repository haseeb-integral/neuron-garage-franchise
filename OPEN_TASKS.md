# Open Tasks — Neuron Garage (3-day sprint)

> Last reviewed: May 14, 2026 — merged Space version (Brett, May 13) into GitHub.
> All four features ship in this sprint. No deferrals to Phase 2 except explicitly listed at the bottom.

---

## 📋 CHANGELOG — Read This First

### May 14, 2026 — Merged Space OPEN_TASKS into GitHub (single source of truth)
- Added Tasks 10, 11 (NCES + GreatSchools APIs) from Brett's May 13 Space edits
- Added Task 16 (rename sidebar "Teacher Prospects" → "Teacher Search") from Brett's May 13 Space edits
- Updated Task 12 Teacher Search stack (Apify + Clay + DonorsChoose + Firecrawl, not just Firecrawl)
- **GitHub is now single source of truth. Do not edit Space OPEN_TASKS.md going forward.**

### May 12, 2026 — Changes made via Perplexity (Sonnet 4.6) while Claude Code limit was hit
- PR #5 `fix/metro-county-labels` ✅ merged — replaced 4 hardcoded strings with live DB bindings
- PR #6 `feat/city-geo-lookup` ✅ merged — 50-city geo lookup map + edge function writes to DB

---

## ✅ Completed — Day 1 (May 12–14)

~~**Task 1: Fix "Dallas-Fort Worth" metro label bug**~~ ✅ May 12

~~**Task 2: Rename "Add to Watch List" → "Add to Favorites" + working favorites list**~~ ✅ May 13

~~**Task 3: Remove 50% cap on master category sliders + auto-rebalance to 100%**~~ ✅ May 13

~~**Task 4: Sub-weight drawer system**~~ ✅ May 14
- Editable sub-metric weights, running total, auto-normalizes to 100% on save

~~**Task 5: Score explanation panel**~~ ✅ May 14
- Verdict label + plain-English reason under gauge; re-evaluates from `score × applied weight`

~~**Task 6: "Show Formula" button — Raw/Norm/Share/Contrib table**~~ ✅ May 14
- Column header tooltips, legend, plain-English master weight contribution sentence
- Score-delta toast: shows `old → new` for category AND composite score

~~**Task 7: Export City Search to CSV**~~ ✅ May 14
- Toolbar "Export CSV" = full ranked table (unchanged, was already working)
- Drawer footer renamed "Export Raw Signals" — new handler exports open city's `city_market_signals` rows only
- Columns: Signal Key, Label, Value, Unit, Source, Source URL, Last Updated
- Filename: `{city-slug}-source-data-{date}.csv`
- `buildCsvDownload` (toolbar) untouched

~~**Task 8: Save Search (saved configurations)**~~ ✅ May 14
- Confirmed fully working end-to-end — no build needed
- `saved_searches` table persists `master_weights` + `sub_weights` as jsonb, scoped by `user_id`
- "(2)" count is live from DB, not hardcoded
- Insert, recall, and delete all working

~~**Task 10: Wire NCES CCD API — public elementary school count per city**~~ ✅ May 14
- Edge function `fetch-school-counts` live — free, no API key
- 48/50 cities matched (Summerlin NV + Town and Country MO expected misses — not bugs)
- Verified: Frisco TX=35 schools/22,950 enrolled · Austin TX=156 schools/77,563 enrolled

~~**Task 10a: Wire school refresh into per-city Refresh button**~~ ✅ May 14
- Per-city Refresh now calls `fetch-school-counts` with `{ cityIds: [<id>] }` (non-blocking)

~~**Task 10b: Surface school counts in city drawer UI**~~ ✅ May 14
- Drawer shows "Public elementary (NCES CCD 2022): {count} schools · {enrollment} enrolled"

---

## ⚡ Day 1 — Remaining

### 9. Multiple named favorites lists (lower priority — push to Day 2 if tight)
- Drop-down on "Add to Favorites" → pick list; create / rename / delete; move cities between lists
- **Risk:** low-medium

### 11. Wire GreatSchools API — private + charter elementary school count
- **BLOCKED — waiting on Brett's API key**
- Brett: sign up at https://www.greatschools.org/api (School Essentials, free 14 days, then $52.50/mo)
- Haseeb: add key to Lovable env as `GREATSCHOOLS_API_KEY` once received
- Store: `private_elementary_count`, `charter_elementary_count` in `city_market_signals`

---

## ⚡ Day 2 — Teacher Search

### 12. Wire Teacher Search to real data (Apify + Clay + DonorsChoose + Firecrawl)
- See `day2feature2taskspec.md`
- Stack: Apify K-12 scraper → DonorsChoose API → Clay enrichment webhook → AI fit scoring → Firecrawl fallback
- Store in `prospects` table linked to source city
- **Risk:** medium-high

### 13. Prospect list view + filters
- Columns: name, school, city/state, email, fit score
- Filters: city, school, grade level, experience, enrichment status
- **Risk:** medium

### 14. AI fit scoring (1–100)
- Heavily weight summer camp / youth camp experience (per SOW)
- Full prompt in `day2feature2taskspec.md`
- **Risk:** medium

### 15. Prospect segmentation / tagged lists + CSV export
- Tag into named lists ("High Potential Austin", "Follow-Up Needed", "Not a Fit")
- **Risk:** low-medium

### 16. Rename sidebar "Teacher Prospects" → "Teacher Search"
- All instances: sidebar nav, page header, buttons, tooltips
- **Risk:** low — label change only

---

## ⚡ Day 3 — Email Outreach + Candidate Pipeline

### 17. SmartLead integration (Feature 3)
- Wire SmartLead ("Integral Leads"); AI-personalized emails from teacher data
- **Risk:** high — real emails go out; verify with 1 test email to yourself first

### 18. Teacher → Lead conversion
- Teacher responds via SmartLead → enters Candidate Pipeline at "New Lead"
- **Risk:** medium

### 19. Candidate Pipeline — real data wiring
- Replace dummy candidates with real leads from Email Outreach
- **Risk:** medium

### 20. PDF export of candidate lead sheet
- Per-candidate PDF with all card details (Kaylie's ask, May 8)
- **Risk:** low-medium

---

## 🚧 Realistic risk: this sprint is aggressive

- Day 2 alone could spill depending on Clay webhook complexity
- SmartLead on Day 3 is a high-risk new external API
- Sam values working math over feature count — don't ship buggy features to hit a number

**Safe fallback:** City Search 100% done + Teacher Search partially wired.

---

## 🛑 Explicitly out of scope this sprint

- Google / Microsoft / SSO login · Multi-tenancy · Onboarding flow · Mobile app
- "Ask AI" sparkle button · PDF report for City Search · Module 2 migration to Cursor
- Anything not on this list — add to `LATER.md`

---

## How to use this file

- Strike through completed items with `~~text~~ ✅ <date>`
- New mid-sprint items that don't block the sprint → `LATER.md`
- **GitHub is single source of truth. Do not edit the Space OPEN_TASKS.md.**
