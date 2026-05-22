# Open Tasks — Neuron Garage

> Last reviewed: May 22, 2026.
> GitHub is single source of truth. Do not edit Space OPEN_TASKS.md.
> Source of truth hierarchy: May 15 meeting decisions override May 8 where they conflict.

---

## 📘 Third-Party Data Imports — follow the Playbook

Any rich vendor table (Manus 817-city demographics, Apollo / Apify teacher exports, the incoming Competitive Landscape table, and future refreshes) MUST be imported per **`TPD.md`**. Universe Audit → Column Triage → Name-vs-Meaning check → idempotent upsert → separate re-score pass. Specifically:

- **Manus 817 cities import** → `us_cities_scored`. Manus is the city UNIVERSE, our schema stays the SCORING LAYER. Upsert on `(state_abbr, city_name)`, do not touch `score_*` columns from the import.
- **Competitive Landscape table (incoming)** → same playbook. Triage every column before it lands in our schema.

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

### Outreach Queue — Teacher Search → SmartLead push path (shipped May 20)
- New `outreach_queue` table + `OutreachQueuePanel` on `/email-outreach`. Parallel to the older Import Wizard / `prospects_staging` flow — no CSV step.
- States: `queued` → `assigned` → `sending` → `sent` (stores `smartlead_lead_id`, `pushed_at`) or `failed` (stores `last_error`).
- Push wired to `smartlead-proxy → POST campaigns/{id}/leads` (single-lead payload built from `teacher_prospects` row).
- `AddToCampaignModal` dropdown now filters `campaign_cache` to real SmartLead campaigns only (numeric id + real lifecycle status), so synthetic cache rows (e.g. legacy "Analytics Overview" analytics-fallback marker) can't be selected. Existing rows with a synthetic `campaign_id` show a red "invalid — reassign" pill and Push is blocked.
- One-time cleanup (May 20): deleted `campaign_cache.id = 'smartlead_analytics_overview'`; reset Anna Weisberg's row to `queued` with `campaign_id = NULL`.
- **Still open:** UI in Teacher Search to show which campaign a teacher is currently queued in (currently only visible from the Outreach Queue panel side). Also: webhook hookup from `smartlead_events` back into `outreach_queue` (auto-flip `sent → opened/replied/bounced`).

---

### v1.2 — Two-pool architecture (Master Pool ↔ SmartLead) — Sprints 1 + 2 + 3 ✅ May 21
- **Schema:** `teacher_prospects` extended with `first_name`, `last_name`, `enrichment_cost_cents`, `enrichment_provider`, `import_batch_id`, generated `dedupe_key` (non-unique index), and (Sprint 3) `last_pushed_at`. `verification_status` standardized to `valid`/`catch_all`/`invalid`/`unknown`. `prospect_batches` renamed → `teacher_import_batches` + `destination`/`column_mapping`/`unmapped_columns`. New `enrichment_jobs` table.
- **Edge functions:** `csv-suggest-mapping` (Gemini-powered AI header mapping), `smartlead-push-leads` (chunked push with `dry_run` preview, writes `outreach_queue` rows AND stamps source `teacher_prospects` with `status='in_smartlead'` + `last_pushed_at` on success).
- **UI:** `ScopeSwitcher` (Master DB ↔ SmartLead) now gates page sections — Master scope shows pool overview + recent imports; SmartLead scope shows replies + campaigns + queue + setup. `StatStripCards` (6-card SmartLead-parity strip with per-card Show Formula popovers per Rule 1), `PushToSmartLeadBanner` + `PushToSmartLeadModal` (live debounced dry-run preview), `MasterPoolImportWizard` (5 steps: setup → AI-mapped CSV → QA dupe preview w/ cross-batch `dedupe_key` check → chunked insert → optional push). Legacy "Import Leads" renamed "Import to SmartLead (Legacy)".

### v1.2 follow-ups (pending, added May 21)
- ~~**V12a.** Surface `enrichment_jobs` in the UI~~ ✅ May 21 — `EnrichmentJobsPanel` lives in Master scope (Section 3) and SmartLead Setup; shows city/provider/status/cost across last 50 runs.
- **V12b.** Add Apollo + Hunter providers behind the existing enrichment job runner (SmartLead is the first; the abstraction is in place).
- **V12c.** "Promote-to-column" UI — list recurring keys in `teacher_import_batches.unmapped_columns` across batches; one-click "promote" to a real `teacher_prospects` column + add to the AI mapper's prompt allow-list.
- **V12d.** Master-pool prospect list view with filters (state, city, verification, source, enrichment provider, has-email) — replaces the current SmartLead-only Teacher Search lens when scope = Master DB. Sprint 3 currently links out to `/teacher-prospects`; deeper inline view still pending.
- **V12e.** Retire the legacy 4-step "Import to SmartLead (Legacy)" button once Teacher Search is fully wired to the Master Pool path.
- **Polish ✅ May 21:** verification-status backfill (already normalized by Sprint 1 migration — `valid`/`catch_all`/`invalid`/null); import batches now show a Destination badge (Master only / Master + SmartLead / Legacy); Master scope shows an empty-state CTA when `teacher_prospects` is 0 rows.
- **Risk:** mostly low; V12b medium (provider quirks).

---

### City universe + orphan-metric cleanup ✅ May 22
- Deleted 160 non-Manus rows from `us_cities_scored` (`WHERE csi_last_updated IS NULL`) — universe locked at **817 cities** (Manus). Verified 0 `teacher_prospects` orphaned by the delete.
- Removed `includeExtras` toggle + `csi_last_updated` filter from `loadLiveRankedMarkets`. City Search now reads the full table.
- Removed from spreadsheet/drawer UI (DB columns kept): `avg_camp_price_per_hour` (Pricing retired May 15), `avg_school_rating` (legacy, not in 46-metric approved list), `summer_weather_index` / `avg_peak_summer_temperature` / `days_above_90f` / `summer_precip_days` (Ops weather orphans), `school_district_count` (not in any live category). `school_hosted_camp_count` stays Manus-owned (surface via CSI panel only if delivered).
- Excel export (`DASHBOARD_DB_KEYS`) and live query (`loadLiveRankedMarkets` SELECT) also purged of `school_district_count` and `school_hosted_camp_count` — spreadsheet + export now fully aligned with live UI metrics only.
- Fixed NULL→0 coercion bug in `cityScoringLiveData.ts` — `RankedMarket.population` and `competitorCount` now typed `number | null`; mapper preserves NULL; spreadsheet renders NULL as "—" and 0 as "0". Composite math excludes NULL rows from the percentile pool. Rule going forward: **never default NULL to 0** in fetch/transform code.

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

### 13. Prospect list view + filters ✅ May 20 (Variant A — Surgical)
- Migrated `/teacher-prospects` from dummy data to live `teacher_prospects` (11,752 rows).
- 3 honest stat cards: Total Imported, Email-Ready, Needs Email Enrichment.
- Sanitized source labels via `src/lib/teacherSourceLabels.ts` (`smartlead_csv` → "SmartLead Enriched", `linkedin_danish` → "LinkedIn Import"). Contractor names never rendered.
- New `SourceBadge` (emerald/amber/slate/sky/indigo) combines source + verification + email presence.
- Source filter dropdown (All / SmartLead / LinkedIn / Needs Email). Default city = All.
- Client pagination 25/page; pagination store keys persisted as `ng:teacher-prospects-v2`.
- Removed v1.0 dummy columns (Experience, Signals, Fit Tag) and `sampleTeachers` from `src/data/teacherData.ts`.
- **Hidden / deferred — see LATER.md "Hidden on Teacher Search (May 20)"** for the full restore list (Fit Score, Response Rate, Market Context, Expand Reach card, Camp Experience, Grades/Tags filters).


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

### B10a. NCES PSS full re-pull — 357 missing cities (added May 18, still open May 22)
- Current embedded PSS dataset has 460 of 817 cities filled; ~357 of the 817 are missing entirely (incl. Dallas, St. Louis, St. Paul).
- Need one-time download of NCES PSS Excel (2021–22) + parse script → upsert `private_elementary_count` / `private_elementary_enrollment` on `us_cities_scored`.
- Effort: ~30 min script + 5 min run. Free.
- **Risk:** low (additive)

> `school_district_count` backfill **dropped** May 22 — column is not in any live scoring category; no point pulling.



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

### 17f. Add `{{unsubscribe}}` to default sequence body 🟡 DEFERRED (May 19)
- `src/components/email-outreach/NewCampaignDrawer.tsx` ~line 125 (initial sequence text) + ~line 141 (follow-up body)
- **Deferred per Haseeb May 19** — accepting CAN-SPAM risk for internal smoke tests targeting his own inbox only. **Must add before sending to any real teacher.**
- SmartLead replaces `{{unsubscribe}}` with the per-lead opt-out URL automatically
- **Effort:** ~5 min · **Risk:** low now, high once real teachers are in the loop

### 17g. Open Rate tooltip — explain Gmail proxy / Apple MPP inflation
- AnalyticsPanel: add (ⓘ) next to "Open Rate" → tooltip: "Gmail and Apple Mail pre-fetch tracking pixels automatically, so open rate is inflated to ~100% on those inboxes. Trust **clicks** and **replies** as real engagement signals."
- **Effort:** ~15 min · **Risk:** low

### 17h. Import Leads CSV end-to-end test (in progress May 19)
- 2-row dummy CSV (`/mnt/documents/dummy_test_leads.csv`, `haseeb+test1` / `haseeb+test2` `@integralassociates.com`) → Import Wizard → batch appears in Import Batches panel → push to SmartLead → confirm leads visible in SmartLead campaign

### 17i. Real (non-test) 1-lead launch (in progress May 19, follows 17h)
- Test Mode OFF → use the 2-alias dummy batch above → launch → confirm both emails arrive in `haseeb@integralassociates.com` inbox within ~10–15 min

### 17j. AI email body personalization per lead (deferred, added May 19)
- Model: `google/gemini-2.5-flash` via Lovable AI Gateway (no extra key)
- Template uses `{first_name}`, `{school}`, `{subject}`, `{years_experience}` from the lead row
- Falls back to non-personalized body if any required merge field is missing
- **Effort:** ~3–4 hrs · **Risk:** medium

### 17k. AI reply-intent classifier ✅ shipped May 20 (supersedes part of #21)
- Replaced 4-bucket `HOT/NOT_INTERESTED/OOO/NEUTRAL` keyword classifier with a 7-bucket Smartlead-mirror taxonomy: `INTERESTED / MEETING_REQUEST / INFO_REQUEST / SOFT_NO / WRONG_PERSON / NOT_INTERESTED / OOO`.
- Two-tier: regex pre-pass (covers ~60% incl. OOO, hard-no, SOFT_NO "not this summer"); Lovable AI `gemini-2.5-flash-lite` fallback returns `{category, confidence, reason}` JSON.
- Stores `reply_intent_reason`, `reply_intent_confidence`, `reply_intent_overridden_by`, `referral_contact` on `smartlead_events`. Adds `outreach_queue.snoozed_until`. Legacy rows backfilled (`HOT→INTERESTED`, `NEUTRAL→INFO_REQUEST @ 0.3`).
- UI: category chip + tooltip (reason + confidence%) in Inbox; category-driven action button in Outreach Queue (Promote / Reply needed / Snooze / Capture referral); `⋯` menu always offers Manual Promote / Snooze 3mo / 6mo / Suppress.
- Auto-promote rule lives in `src/lib/replyCategories.ts::isAutoPromotable` — only `INTERESTED + MEETING_REQUEST` @ confidence ≥ 0.7.
- **Closes the false-promote regression** ("not available for summer" no longer reaches Promote).
- **Files:** `src/lib/replyCategories.ts` (new), `supabase/functions/smartlead-webhook/index.ts`, `SmartLeadInboxPanel.tsx`, `OutreachQueuePanel.tsx`, migration `20260520114040_*.sql`.

### 17k-followup. Smoke-test 7-bucket classifier with live replies (added May 20)
- Send one reply per category from a Gmail `+alias`; verify chip color, tooltip reason, action button matches taxonomy, and override menu reclassifies + relogs.
- Confirm `outreach_queue.snoozed_until` populated when Snooze chosen, and `candidates` row appears only when Promote clicked on `INTERESTED`/`MEETING` @ ≥0.7.
- **Effort:** ~30 min · **Risk:** low — manual QA only.



### 17l. Import Wizard Step 4 — inline "Create new campaign" option (added May 19)
- Step 4 dropdown only lets you pick an existing campaign. If every existing campaign is PAUSED/STOPPED/DRAFTED, the user has no in-flow way to make a fresh ACTIVE campaign — they must Back → close wizard → open New Campaign drawer → re-open wizard.
- Add a "+ Create new campaign…" item at the top of the dropdown → inline lightweight form (name + inbox picker) → calls `smartlead-proxy` create-campaign → auto-selects it → user clicks Send.
- **Effort:** ~2 hrs · **Risk:** low · **File:** `src/components/email-outreach/ImportLeadsWizard.tsx`

### 17m. Import Wizard — prevent double-send + dedup guardrails (added May 19) ✅ v1 shipped May 19
- **Background:** May 19 — user clicked "Send 2 to SmartLead" twice. SmartLead deduped by email (verified: same `lead_id` reused, no duplicate rows) so no harm done, but our UI had zero post-success terminal state — only `importing` disabled the button, which then re-enabled after the first run, inviting a second click.
- **v1 shipped (May 19, this commit):** added `sent` terminal state in `ImportLeadsWizard.tsx`. After a successful run the Send button is replaced with a green "✓ Sent — N/N imported" pill + a Close button. Back is also locked. Re-import requires closing and re-opening the wizard. Hard guard `if (importing || sent) return` inside `runImport`.
- **Still to do (v2):** idempotency key per batch — pass `prospect_batches.id` as `x-idempotency-key` header to `smartlead-proxy`; proxy keeps a small in-memory LRU (60s TTL) and returns the cached response on replay. Also a "this batch was already pushed to campaign X 5 min ago — re-send?" warning keyed off `prospect_batches.batch_name + campaign_id + day`.
- **Effort remaining:** ~1.5 hrs · **Risk:** low · **Files:** `supabase/functions/smartlead-proxy/index.ts` (idempotency cache).


### 17n. Import Batches — per-batch lead drill-down (added May 19) ✅ v1 shipped May 19
- **Background:** May 19 — user pushed a 2-row CSV but the destination SmartLead campaign showed 5 leads. Cause: 3 leftover test leads pre-existed in the campaign + SmartLead's account-wide dedup reused existing `lead_id`s for the 2 new emails. No duplicate sends occurred, but the UI gave the user no way to verify this without leaving the app.
- **v1 shipped (May 19, this commit):** rows in the Import Batches panel are now clickable → opens `BatchDetailDrawer` showing every row from `prospects_staging` filtered by `batch_id` (email, name, city, QA status, rejection reason), a deep link to the SmartLead campaign analytics page, and an amber disambiguation banner whenever the campaign's `total_leads` (from `campaigns/<id>/leads`) differs from this batch's `approved_count`. Banner copy explains SmartLead's account-wide `lead_id` reuse so users don't think it's a bug.
- **Still to do (v2):** real-time per-lead SmartLead status (SCHEDULED / SENT / OPENED / REPLIED) inside the drawer — currently rows only show our staging QA state, not what SmartLead is doing with each lead. Will fold into Task 21.
- **Effort remaining:** ~4 hrs · **Risk:** low · **Files:** `BatchDetailDrawer.tsx` (extend), `smartlead-proxy` (per-lead status fetch).

### 17o. New Campaign Drawer — Test Mode default OFF + persist (added & shipped May 20)
- **Background:** May 20 — user toggled Test Mode OFF for the smoke-test campaign, closed the wizard, reopened it, and the checkbox was back to ON. Misleading: looks like the previous launched campaign got flipped, when really only the local form state resets. Risk: user accidentally launches a real campaign in TEST mode (or vice versa) because the UI lies about the default.
- **Shipped (May 20):** `NewCampaignDrawer.tsx` — initial state reads from `localStorage["ng.newCampaign.testMode"]` (default OFF if unset), persists on every toggle, and the close/reset effect now restores from localStorage instead of hard-coding `true`. Already-launched campaigns are unaffected — this is pure form-state UX.
- **Files:** `src/components/email-outreach/NewCampaignDrawer.tsx`. **Effort:** 15 min · **Risk:** low.


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
