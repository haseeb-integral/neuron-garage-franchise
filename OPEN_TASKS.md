# Open Tasks — Neuron Garage (3-day sprint)

> Last reviewed: May 14, 2026 — merged Space version (Brett, May 13) into GitHub.
> All four features ship in this sprint. No deferrals to Phase 2 except explicitly listed at the bottom.

---

## 📋 CHANGELOG — Read This First

### May 14, 2026 — Merged Space OPEN_TASKS into GitHub (single source of truth)

- Added Tasks 10, 11 (NCES + GreatSchools APIs) from Brett's May 13 Space edits
- Added Task 16 (rename sidebar "Teacher Prospects" → "Teacher Search") from Brett's May 13 Space edits
- Updated Task 12 Teacher Search stack (Apify + Clay + DonorsChoose + Firecrawl, not just Firecrawl)
- Marked completed Day 1 items with ✅
- Renumbered all tasks to 1–20 consistently
- **GitHub is now single source of truth. Do not edit Space OPEN_TASKS.md going forward.**

### May 12, 2026 — Changes made via Perplexity (Sonnet 4.6) while Claude Code limit was hit

**Context:** Haseeb hit Claude Code usage limit mid-session and switched to Perplexity AI (Sonnet 4.6) to continue. Perplexity created GitHub branches, reviewed diffs, and instructed Lovable via prompts. All changes are merged to `main`.

#### Changes merged to main (in order)

**PR #5 — `fix/metro-county-labels`** ✅ merged
- Replaced 4 hardcoded strings with live DB bindings in `CityScoring.tsx`

**PR #6 — `feat/city-geo-lookup`** ✅ merged
- New `supabase/functions/_shared/cityGeo.ts` — 50-city lookup map
- Updated `fetch-city-market-data` edge function to write `metro_area`, `county`, `market_type` to DB

---

## ✅ Completed — Day 1 (May 12–14)

~~**Task 1: Fix "Dallas-Fort Worth" metro label bug**~~ ✅ May 12
- Root cause: hardcoded literals on 4 lines in `CityScoring.tsx`
- Fix: PR #5 (UI binding) + PR #6 (edge function geo lookup) + SQL backfill

~~**Task 2: Rename "Add to Watch List" → "Add to Favorites" + working favorites list**~~ ✅ May 13

~~**Task 3: Remove 50% cap on master category sliders + auto-rebalance to 100%**~~ ✅ May 13

~~**Task 4: Sub-weight drawer system**~~ ✅ May 14
- Drawer with editable sub-metric weights, running total, auto-normalizes to 100% on save

~~**Task 5: Score explanation panel (verdict + plain-English reason under gauge)**~~ ✅ May 14
- Verdict label + reason text now re-evaluates from `score × applied weight` — 0% categories excluded

~~**Task 6: "Show Formula" button — Raw/Norm/Share/Contrib table**~~ ✅ May 14
- Column header tooltips added
- Legend: "Raw → Norm → Share → Contrib. Sum of Contrib = category score."
- Plain-English master weight contribution sentence added

~~**Score-delta toast after Save & Recalculate**~~ ✅ May 14
- Toast shows `old → new` for category score AND composite score

---

## ⚡ Day 1 — City Search (remaining)

### 7. Export City Search to CSV
- Export full ranked table: city, rank, tier, composite score, all 6 category scores, active master weights, sub-metric values
- "Export Source Data" button already exists — wire it
- **Risk:** low
- **Verify by:** export, open in Excel, confirm all columns present and math matches UI

### 8. Save Search (saved configurations)
- Save full scoring config (master + sub-weights) by name
- "Saved (2)" dropdown already exists — wire it to actually persist and recall
- Recall → repopulates all sliders and sub-weight drawers
- **Risk:** medium — needs persistent storage (Supabase `saved_searches` table)
- **Verify by:** save a config, reload page, recall it — all weights restore correctly

### 9. Multiple named favorites lists (if time)
- Drop-down on "Add to Favorites" → pick list
- Create / rename / delete lists; move cities between lists
- **Risk:** low-medium
- **If Day 1 is full → push to Day 2 morning**

### 10. Wire NCES CCD API — public elementary school count per city
- **What:** Connect the NCES Common Core of Data API to pull public elementary school count, enrollment, and location for each scored city
- **Why:** School count is a scored sub-metric under Demand and Franchisee Supply. Currently showing "Not available yet."
- **API:** `https://educationdata.urban.org/api/v1/schools/ccd/` (Urban Institute wrapper — free, no key needed)
- Pull per city: school count, total enrollment
- Store in `city_market_signals` table: add columns `public_elementary_count`, `public_elementary_enrollment`
- **Risk:** low — free, well-documented API
- **Verify by:** check Austin TX → should return ~130 AISD elementary schools

### 11. Wire GreatSchools API — private + charter elementary school count per city
- **What:** Connect GreatSchools NearbySchools API to pull private and charter elementary school counts alongside NCES public data
- **Why:** SOW explicitly requires elementary school counts broken out by public and private. NCES only covers public schools.
- **First step — Brett:** Sign up for 14-day free trial at https://www.greatschools.org/api (School Essentials plan) → copy API key → send to Haseeb
- **First step — Haseeb:** Add API key to Lovable environment variables as `GREATSCHOOLS_API_KEY`
- Pull per city: private school count, charter school count, school names
- Store in `city_market_signals`: add columns `private_elementary_count`, `charter_elementary_count`
- **Risk:** low-medium — new API key needed, but well-documented
- **Cost:** Free for 14 days, then $52.50/mo — decide after Friday demo whether to keep
- **Verify by:** check Austin TX → returns a non-zero private school count
- **BLOCKED:** waiting on Brett's API key

---

## ⚡ Day 2 — Teacher Search

### 12. Wire Teacher Search to real data (Apify + Clay + DonorsChoose + Firecrawl)
- See full Day 2 task spec: `day2feature2taskspec.md`
- **Stack:** Apify K-12 School Staff Directory Scraper → DonorsChoose API → Clay enrichment webhook → Lovable AI fit scoring → Firecrawl as fallback
- Pull: name, school, city/state, email, phone, LinkedIn, grade level, fit score
- Store in `prospects` table linked to source city
- **Risk:** medium-high — Clay webhook is the most complex piece

### 13. Prospect list view + filters
- Columns: name, school, city/state, email (when available), fit score
- Filters: city, school, grade level, years of experience, enrichment status
- **Risk:** medium

### 14. AI fit scoring (1–100)
- Lightweight AI reviews each prospect's profile, scores 1–100 with reasoning
- Heavily weight prior summer camp or youth camp experience (per SOW)
- Use Lovable's built-in AI — no separate API
- Full scoring prompt in `day2feature2taskspec.md`
- **Risk:** medium — needs a defined prompt and scoring rubric

### 15. Prospect segmentation / tagged lists
- Tag teachers into named lists ("High Potential Austin", "Follow-Up Needed", "Not a Fit")
- Export to CSV
- **Risk:** low-medium

### 16. Rename sidebar label "Teacher Prospects" → "Teacher Search"
- Update every instance in the UI: sidebar nav, page header, any button or tooltip that says "Teacher Prospects" or "Prospects"
- **Risk:** low — label change only, no logic changes
- **Verify by:** check sidebar, page title, and any cross-feature references (e.g. "Add to Pipeline" buttons)

---

## ⚡ Day 3 — Email Outreach + Candidate Pipeline

### 17. SmartLead integration (Feature 3 / Email Outreach)
- Wire SmartLead ("Integral Leads") into the app
- Connect to teacher list from Teacher Search
- AI personalizes each email using enriched data (school, district, role, experience)
- Send a small test batch first before any real send
- **Risk:** high — external API, real emails go out, easy to mess up
- **Verify by:** send 1 test email to yourself before any real sends

### 18. Teacher → Lead conversion
- When a teacher responds via SmartLead, they convert to "lead" and enter Candidate Pipeline at "New Lead" stage
- **Risk:** medium — needs webhook or polling

### 19. Candidate Pipeline (Feature 4) — real data wiring
- Replace dummy candidates with real leads from Email Outreach
- Existing drag-and-drop confirmation gate stays as-is
- **Risk:** medium

### 20. PDF export of candidate lead sheet
- Kaylie's ask from May 8
- Per-candidate PDF with all card details
- **Risk:** low-medium

---

## 🚧 Realistic risk: this sprint is aggressive

Honest read for Haseeb: 3 days to wire 3 features end-to-end (Days 2 and 3 each contain things that normally take days alone). Pre-sprint, raise with Brett:

- **Day 2 alone could spill** depending on Firecrawl response shape and AI scoring complexity.
- **SmartLead integration on Day 3 is a high-risk new external API.**
- **Sam's QA bar is high.** A buggy fully-wired app is worse than a fully-working City Search.

**Recommendation to negotiate:** if pressure mounts, the safe fallback is "City Search 100% done + Teacher Search partially wired" rather than "all 4 features wired but Sam finds bugs everywhere." Sam values working math over feature count.

---

## 🛑 Explicitly out of scope this sprint

- Google / Microsoft / SSO login (intentionally removed)
- Multi-tenancy / public version
- Onboarding flow (Phase 2)
- Mobile app
- "Ask AI" sparkle button (nice to have, defer)
- PDF report generation for City Search (separate from candidate PDF)
- Module 2 migration to Cursor + VS Code
- Anything not on this list — write it in a `LATER.md` file, don't build it

---

## How to use this file

- Review at the start of each day and after every client touchpoint
- Strike through completed items with `~~text~~ ✅ <date>` — keep history
- If priorities shift, move items between days but don't delete them silently
- If something new comes up mid-sprint, ask: does this block the sprint? If no → add to `LATER.md` (create if it doesn't exist)
- **GitHub is single source of truth. Do not edit the Space OPEN_TASKS.md.**
