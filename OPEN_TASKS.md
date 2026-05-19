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

### 9. Multiple named favorites lists / "campaign list" on City Search (rolled over from Day 1, locked May 19)
- ⭐ button on city row → popover with checkboxes per list + "➕ New list" inline create
- Left rail inside City Search with list names + per-list counts (NOT chip strip — UI locked with user May 19)
- "Promote list" button per list = jump to Teacher Search **pre-filtered by those cities**. Does NOT bypass the natural City → Teacher → Email flow.
- New `watchlists` table (id, user_id, name, created_at) + `watchlist_id uuid` FK on `watchlist_items`
- Migration: move existing `watchlist_items` rows into a default "My watchlist" list per user
- **Risk:** low-medium · **Effort:** ~2–3 hrs


### 11. Wire GreatSchools API — `avg_school_rating` (trial-then-cancel strategy)
- **BLOCKED — waiting on Brett's API key**
- **Strategy (updated May 18):** 14-day free trial → pull all 960 cities in week 1 → cancel day 13. Ratings are stable, one snapshot lasts 12+ months. $0 cost.
- Brett: sign up at https://www.greatschools.org/api, paste key into Lovable Cloud as `GREATSCHOOLS_API_KEY`
- Store: `avg_school_rating` on `us_cities_scored` (private + charter elementary counts now covered free by NCES PSS + CCD — see B10a)
- **Cost decision:** $0 if cancelled day 13; $52.50/mo if kept

### 11a. City Search: add "Total public schools" widget alongside "Public elementary" (deferred, added May 18)
- Data already stored in `us_cities_scored.public_school_count` / `public_school_enrollment`
- Add a new `signal_key` row in `fetch-school-counts` (e.g. `public_school_count`) and a corresponding row in `CityScoring.tsx` City Detail drawer below the existing "Public Elementary Schools" widget
- **Risk:** low

### 11b. Rename `private_elementary_count` / `charter_elementary_count` → `_school_count` + add elementary-subset siblings (deferred, added May 18)
- Apply the same name-vs-meaning fix to GreatSchools-sourced columns once Task #11 is unblocked
- Do this in the **same migration** that first populates those columns — do not ship the rename as a follow-up
- **Risk:** low (columns currently unpopulated)

### 11c. Decide whether `score_franchise_supply` should blend elementary + middle/high once camp-staff enrichment teachers are part of recruiting (deferred, added May 18)
- Today the franchise-supply formula uses elementary-only (K–6 camper base)
- If/when Segment 4 (middle/high STEM/maker teachers) becomes a real recruiting channel, Sam may want to blend in the broader public-school pool
- **Owner:** Sam (scoring math)

~~### 11d. Wire `seed-cities-database` to also upsert into `public_schools`~~ ✅ May 18
- `mapNcesSchoolRow()` added; per-school upsert into `public_schools` runs inside the seed loop using the already-fetched NCES rows (no extra API call). Re-seeds and new cities now keep `public_schools` in sync with cached counts.

### 11e. Backfill `composite_score_default` on seeded cities ✅ May 18
- All 948 seeded cities now have `composite_score_default` populated via `normalize_only: true` pass. City Search national ranking unblocked.

### 11f. Backfill `county_name` + `metro_area` on `us_cities_scored` (in progress, added May 19)
- **`county_name`:** ✅ 960/960 — joined against `us_cities_geo`.
- **`metro_area`:** ⚠️ 326/960 done via CBSA crosswalk. Houston, Fort Worth, San Antonio, and most non-major-metro cities still NULL because the bulk SQL UPDATE was truncated. **Next session:** finish the remaining ~634 in smaller batches, then patch `seed-cities-database` and `AddCityModal` to populate both fields on insert so this never regresses.
- **Risk:** low

### 11g. Ask AI literal-compliance mode ✅ May 19
- `ai-city-query` now returns `weightMode: "absolute" | "delta"` + `absoluteWeights`. Requests like "rank Texas cities by 100% demand weight" now snap sliders to Demand 100 / others 0 instead of being rewritten to 60/8/8/8/8/8. Vague intents still use the old delta path.




---

## ⚡ Teacher Search — Pending (unblocked after Task #0)

### 12. Wire Teacher Search to real data
- See `DATABASE_LAYER_SPEC.md` → Teacher Sourcing Options and `TEACHER_IDEAL_PROFILE.md`
- Stack depends on sourcing decision (Apollo / vendor list / Apify + DonorsChoose + Clay)
- Store in `teacher_prospects_master` table
- **Risk:** medium-high — Clay webhook is the most complex piece if used

### 12a. Expand Teacher Search sourcing to Segment 4 — middle/high STEM/maker/shop/art teachers (deferred, added May 18)
- Per the May 18 correction in `TEACHER_IDEAL_PROFILE.md`: middle/high teachers in hands-on subjects are a **secondary** target, not out of scope (only campers are locked at K–6, not staff)
- Add Apollo / vendor / Apify queries for: high-school robotics teacher, shop teacher, CS teacher, STEM teacher, maker teacher, art/design teacher
- Fit scoring: lower base than K–6, boosted by hands-on subject match
- **Risk:** low (additive)

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

## ⚡ Data-layer follow-ups (deferred, added May 18 after screen-walk)

### B1. Build `teacher_prospects_master` table
- Master multi-source teacher pool that Apollo / vendor CSV / DonorsChoose all land in, distinct from per-search `teacher_prospects`. Blocked on Brett sourcing decision.
- **Risk:** medium

### B3. Add `school_nces_id`, `us_cities_scored_id`, `source_segment` FKs to `candidates`
- So a promoted teacher carries city + school + segment context into the pipeline. Today `candidates.city`/`state` are free-text.
- **Risk:** low

### B4. Add FKs from `candidates.city/state` (or replace with `us_cities_scored_id`)
- Pairs with B3. Decide replace-vs-augment.
- **Risk:** low

~~### B5. Consolidate `cities` ↔ `us_cities_scored`~~ ✅ May 19
- Dropped legacy `cities`, `city_category_scores`, `city_fetch_jobs`, `city_competitors`. Deleted edge functions `fetch-city-market-data` and `fetch-city-market-data-sow`. `AddCityModal` rewired to look up in `us_cities_geo` and INSERT into `us_cities_scored` (RLS: authenticated users can INSERT). Drawer / Compare / Report modals neutralized of legacy reads.

### B11. Seed the 8 "Tracked-no-value" metrics (low priority, added May 19)
- 8 metrics are flagged `enabled: false` in the registry — audit-only, no values yet, do not affect composite score. If/when Sam wants them to count, flip `enabled: true` and seed values; they will auto-move from the "Tracked-no-value" chip into "Not seeded yet".
- **Risk:** low (additive, opt-in)

### B6. SmartLead send/reply tracking columns on `teacher_prospects`
- `smartlead_campaign_id`, `last_sent_at`, `last_replied_at`, `reply_status`. Required before Task #17 wiring.
- **Risk:** low

### C3 / C4. `school_district` table + `school_principal` / `school_contact_email` columns on `public_schools`
- District-level rollups and direct school contacts for outreach. Not blocking current sprint.
- **Risk:** low (additive)

### B7. Apify nationwide competitor scrape — $15 test + ~$1,200 full seed (added May 18)
- Unlocks 15 of 46 city-scoring metrics (competitor_count, competitor density, avg rating/review count, years-in-market, summer camp / tutoring / kids activity center counts, robotics clubs, avg competitor pricing, staffing signal, waitlist signal, national brand presence, etc.)
- Pending Brett approval. $15 test on 10 cities first → $900–$1,200 one-time full seed of 960 cities.
- **Risk:** low (additive — free fallback is OpenStreetMap/Firecrawl, both inferior)

### B8. Weather seeding finish — Open-Meteo Historical (in progress, added May 18)
- Source: Open-Meteo Archive API (free, no key). Edge function `seed-cities-weather`.
- Status: 506/960 done; remaining 454 firing in background batches (offsets 500, 700, 900). ~1 hr to completion.
- **Risk:** low

### B9. BLS OEWS metro wages — free, ~4 hrs code + 2 days rate-limited pulls (added May 18)
- Metro-area wages per occupation (childcare, K-12 teachers). Series IDs vary per metro × occupation; need verification table before bulk pull.
- Schedule next sprint after B7/B10a complete.
- **Risk:** low-medium (rate-limit pacing)

### B10a. NCES PSS full re-pull — 340 missing cities (added May 18)
- Current embedded PSS dataset has 636 rows; ~340 of the 960 seeded cities (incl. Dallas, St. Louis, St. Paul) are missing entirely.
- Need one-time download of NCES PSS Excel (2021–22) + parse script → upsert `private_elementary_count` / `private_elementary_enrollment` on `us_cities_scored`.
- Effort: ~30 min script + 5 min run. Free.
- **Risk:** low
- **Risk:** low (additive)

---

## ⚡ Email Outreach + Candidate Pipeline — Pending

~~### 17. SmartLead integration (Feature 3)~~ ✅ May 19 — Phases 1–5 complete
- Phase 1: `smartlead-proxy` edge function + `SMARTLEAD_API_KEY` + Connection panel
- Phase 2: Import Leads wizard + `prospects_staging` + Source dropdown (Apollo / Clay / LinkedIn Navigator / CSV / Manual)
- Phase 3: Campaigns panel + `campaign_cache` + New Campaign drawer (with NEGATIVE `track_settings` flags)
- Phase 4: Analytics panel (single `/analytics/overview` call, per-campaign fallback) + Email Accounts panel + Dashboard|Analytics tab toggle
- Phase 5: `smartlead-webhook` + `smartlead_events` table + Realtime Inbox + intent classifier (HOT green / NOT_INTERESTED gray / OOO blue / NEUTRAL yellow) + unread badge + batch retry + connection health strip

### 18. Teacher → Lead conversion (next up)
- Teacher promoted in Teacher Search → row staged in `prospects_staging` → pushed to a SmartLead campaign via the Import Wizard programmatically
- Reply with intent `HOT` → auto-create row in `candidates` at "New Lead"
- **Risk:** medium

### 19. Candidate Pipeline — real data wiring
- Replace placeholder candidates with real leads from Email Outreach (depends on #18)
- **Risk:** medium

### 20. PDF export of candidate lead sheet
- Per-candidate PDF with all card details (Kaylie's ask, May 8)
- **Risk:** low-medium

### 21. Email Outreach — production hardening follow-ups (deferred, added May 19)
- Replace keyword-based reply-intent classifier with Lovable AI Gateway (Gemini Flash) — better OOO detection on multi-language replies
- Per-user inbox assignment / shared inbox views
- Sequence A/B testing UI
- Bounce / unsubscribe automation rules
- **Risk:** low-medium

---

## ⚡ Email Outreach — May 19 cockpit polish (locked plan, partial done)

> Locked in chat May 19 across Phases 1a → 4. Promoted out of chat into this file so future sessions don't drop it. See PROJECT_CONTEXT § 5 + HOW_IT_WORKS `/email-outreach` for behavior detail.

~~### 17a. Strip hardcoded mock data from Email screen~~ ✅ May 19
- Removed: 6 placeholder prospects, "1,248 prospects in outreach", "58 interested leads" tile, hardcoded fit-score badges, "Recommended Next Step" card
- Stats now read live from SmartLead `/analytics/overview` + `campaign_cache`

~~### 17b. NewCampaignDrawer + Test Mode toggle~~ ✅ May 19
- Launch a campaign from inside the app (no need to go to SmartLead website)
- Test Mode: yellow toggle swaps recipient list with logged-in user's email (`auth.users.email`) + manual override field
- `[TEST]` prefix automatically added to campaign name when Test Mode is on
- FROM is always the SmartLead mailbox — Test Mode only swaps TO

~~### 17c. Auto-generated default campaign name + min-gap floor~~ ✅ May 19
- Default name format: `Outreach · MMM-DD · HH:mm TZ · vN`. `vN` increments via `localStorage.ng_campaign_seq` so two drafts in the same minute don't collide. Field stays editable.
- `min_time_btw_emails` floor enforced at 3 (SmartLead `/campaigns/{id}/schedule` returns 400 below 3)

~~### 17d. Inbox picker on campaign create~~ ✅ May 19
- User selects which connected mailboxes the campaign sends from (default: all)
- "All" / "None" toggle buttons
- Helper text explains: per-inbox = parallel sends · single-inbox = sequential sends · SmartLead cron polls every ~10–15 min so launch time ≠ send time

~~### 17e. End-to-end test loop proven~~ ✅ May 19
- Gmail `+alias` CSV (5 leads) → Import Wizard → SmartLead → first email sent → reply arrived → Inbox classifier tagged it → Pause/Resume/Stop ✅ → manual Promote to Pipeline path verified
- Reply detection ✅ confirmed by Haseeb (Isabella reply showed in Analytics)

### 17f. Add `{{unsubscribe}}` to default sequence body 🔴 BLOCKER for real sends
- `src/components/email-outreach/NewCampaignDrawer.tsx` ~line 125 (initial sequence text) + ~line 141 (follow-up body)
- **CAN-SPAM legal requirement** — must exist before any non-test campaign launches
- SmartLead replaces `{{unsubscribe}}` with the per-lead opt-out URL automatically
- **Effort:** ~5 min · **Risk:** low

### 17g. Open Rate tooltip — explain Gmail proxy / Apple MPP inflation
- AnalyticsPanel: add (ⓘ) next to "Open Rate" → tooltip: "Gmail and Apple Mail pre-fetch tracking pixels automatically, so open rate is inflated to ~100% on those inboxes. Trust **clicks** and **replies** as real engagement signals."
- **Effort:** ~15 min · **Risk:** low

### 17h. Import Leads CSV end-to-end test (paused, resume after 17f)
- 2-row dummy CSV → Import Wizard → batch appears in Import Batches panel → push to SmartLead → confirm leads visible in SmartLead campaign

### 17i. Real (non-test) 1-lead launch (paused, resume after 17f)
- Test Mode OFF → enter one real address Haseeb controls (not a `+alias`) → launch → confirm send

### 17j. AI email body personalization per lead (deferred, added May 19)
- Model: `google/gemini-2.5-flash` via Lovable AI Gateway (no extra key)
- Template uses `{first_name}`, `{school}`, `{subject}`, `{years_experience}` from the lead row
- Falls back to non-personalized body if any required merge field is missing
- **Effort:** ~3–4 hrs · **Risk:** medium

### 17k. AI reply-intent classifier (deferred, added May 19, supersedes part of #21)
- Replace keyword regex in `smartlead-webhook` with `gemini-2.5-flash-lite` call
- Better OOO + multi-language detection. Keeps HOT / NOT_INTERESTED / OOO / NEUTRAL enum unchanged.
- **Effort:** ~1–2 hrs · **Risk:** low


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
