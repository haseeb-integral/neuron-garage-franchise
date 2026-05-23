# HOW_IT_WORKS.md — Neuron Garage

> Snapshot date: May 19, 2026 (Email Outreach / SmartLead end-to-end live)
> Audience: Anyone (Kaylie, Sam, Haseeb, any AI agent) who needs to understand the app as a working product, not as an inventory.
> Companion files: `PROJECT_CONTEXT.md` (what exists), `APIS.md` (integrations).

---

## 1. The job the app does

Neuron Garage is an internal SaaS that helps Kaylie's franchise education company **(a) decide which U.S. cities to expand into next**, **(b) find the right teachers in those cities to run a location**, **(c) contact them**, and **(d) move the best candidates through a hiring and onboarding pipeline**. It is used by 3 people. It is not public-facing.

---

## 2. The user journey (end to end)

```
Dashboard ─▶ City Search ─▶ Teacher Search ─▶ Email Outreach ─▶ Candidate Pipeline ─▶ Onboarding
   (overview)   (pick a market)  (find people)    (contact them)     (qualify & confirm)   (open the location)
```

What the user gets out of each step:

| Step | Output |
|---|---|
| Dashboard | A single screen showing pipeline counts and what to do next |
| City Search | A ranked list of U.S. cities by composite fit score, with the math visible |
| Teacher Search | A list of teacher prospects inside the favorited cities, with a fit score |
| Email Outreach | AI-personalized outreach sent through SmartLead (not wired yet) |
| Candidate Pipeline | A Kanban: new lead → qualification → confirmation → signing |
| Onboarding | A step tracker per new franchisee from signing through grand opening |

---

## 3. How each screen works

### `/` Dashboard — `Index.tsx`
- **User sees:** Pipeline tiles (candidates by stage), recent activity, shortcut tiles to the 5 main features.
- **Behind the scenes:** Reads counts from `candidates` and `teacher_prospects` via Supabase client. No edge functions.

### `/city-scoring` City Search — `CityScoring.tsx`
- **User sees:** A table of cities with a composite score, 6 category scores, sliders for the 6 master weights, a sub-weight drawer per category, "Show Formula", and "Add to Favorites".
- **User action:** Adjust sliders, save the configuration as a Saved Search, drill into a city to see raw signals, export to CSV, add a city to Favorites, **Add City** (top-right) to extend the list.
- **Behind the scenes:**
  - Reads from `us_cities_scored` (+ `city_market_signals` for Show Formula). Legacy `cities` / `city_category_scores` / `city_fetch_jobs` / `city_competitors` tables were **dropped May 19**.
  - **Composite score is calculated client-side** in `src/lib/clientSubWeightScoring.ts` so slider changes update the table instantly.
  - **Add City flow (rewired May 19):** user types City + State → `AddCityModal` does a case-insensitive lookup in `us_cities_geo` (`city` or `city_ascii` + `state_name`) → if found, inserts a new row into `us_cities_scored` with coords, population, and `is_registration_state` derived from the hardcoded 38-state list. Scores stay NULL until the next bulk seed run. If not found in `us_cities_geo`, the modal aborts with a toast. If already in `us_cities_scored`, toast says "Already in your list".
  - Bulk seeding still runs via `seed-cities-database` (Census / BLS / BEA / FRED / NCES / Apify pull → `us_cities_scored` + `public_schools`).
- **Today's status (May 19):** `us_cities_scored` is the canonical city table — 948 cities with `composite_score_default` populated. `county_name` is backfilled for all 960 rows from `us_cities_geo`; `metro_area` is backfilled for ~326/960 (Austin, Dallas, etc.) — remaining cities show `—` until the metro backfill finishes. City Detail drawer surfaces the full 46-metric registry across 4 chips (Pre-seeded / Not seeded yet / Tracked-no-value / Source unavailable).
- **Ask AI bar (top of City Search):** Free-text questions go to the `ai-city-query` edge function. The assistant returns filters (state, tier, min score) **and** master weight changes in one of two modes:
  - **Absolute mode** — triggered by literal requests ("100% demand", "only pricing", "demand 50 pricing 30", "exclusively", "just X"). Sliders snap to the exact numbers the user named; categories the user did not mention go to **0%**. No auto-rebalance. Added May 19, 2026 after a user reported "rank by 100% demand" being silently rewritten to 60/8/8/8/8/8.
  - **Delta mode** — triggered by vague intents ("lean toward demand", "care more about pricing"). Returns ±20 nudges; frontend rebalances to 100. If exactly one category is nudged positive, the frontend treats it as dominant (60% / 40% split across the rest).
  Multi-turn refinement is capped at 6 turns per conversation. Every turn is persisted to `ai_query_history` for the Google-style history dropdown.
- **Public schools vs public elementary (added May 18):** We store **all** open public schools per city in `public_school_count` / `public_school_enrollment`. The "Public Elementary Schools" widget in the City Detail drawer reads the derived subset `public_elementary_count` / `public_elementary_enrollment`, defined as NCES schools with `lowest_grade_offered ≤ 5`. Camp franchise-supply scoring still uses the elementary subset (K–6 camper base); the total-schools number is reserved for a future widget and for the wider teacher-recruiting pool (middle/high STEM/maker teachers, see Segment 4 in `TEACHER_IDEAL_PROFILE.md`).
- **School-level data store (May 18):** Counts on `us_cities_scored` are cached aggregates. The **source of truth** is the `public_schools` table — one row per NCES school nationally, with name, district, address, lat/lng, grades, type, enrollment. Populated by **both** `seed-cities-database` (during normal seeding, using the same NCES response — no extra API calls) and `backfill-public-schools` (for full rebuilds). 38,196 schools across 948 cities live. Cities with overlapping aliases can drift by a few rows (last-processed city claims the school); Boston spot-check matches exactly (129 / 94).

### `/teacher-prospects` Teacher Search — `TeacherProspects.tsx`
- **User sees:** A table of teachers in the cities the user picked, with school, grade, fit score, and status.
- **User action:** Pick cities (defaults to Favorites), trigger a search, filter, bulk-select, mark hot/warm, promote to candidate.
- **Behind the scenes:**
  - "Find prospects" calls `fetch-teacher-prospects`, which runs an Apify Google-Maps actor over schools in the target city.
  - `enrich-school-staff` fills missing teacher detail per school.
  - Fit score (0–100) is computed in `src/utils/fitScore.ts` from grade match (K–6), summer availability heuristic, and teacher type (`active` / `retired` / `camp_enrichment`).
  - Writes to `teacher_prospects`. As of May 18, the table has FK columns (`school_nces_id` → `public_schools`, `us_cities_scored_id` → `us_cities_scored`) plus `teacher_type`, `subject`, `segment`, `linkedin_url`, `donorschoose_id`, `enrichment_source`, `last_enriched_at` — populated by future sourcing, not by the current Apify pull.
- **Today's limitation:** Placeholder / Apify-only data. Apollo, vendor lists, and DonorsChoose are not wired (blocked on Brett's decision — see `APIS.md`).

### `/email-outreach` Email Outreach — `EmailOutreachV2.tsx`
- **User sees:** A 3-panel layout (Connection / Campaigns / Inbox) by default, with a tab toggle to swap the Campaigns panel for the Analytics panel. Side panels for Email Accounts and Prospect Batches sit below. Top-right buttons: "New Campaign" (opens `NewCampaignDrawer`) and "Import Leads" (opens `ImportLeadsWizard`).
- **Connection panel (`SmartLeadConnectionPanel.tsx`)** — shows API-key status, last successful API call timestamp, and a 24-hour webhook activity indicator. Health strip is the at-a-glance "is SmartLead working?" widget.
- **Campaigns panel (`SmartLeadCampaignsPanel.tsx`)** — lists campaigns from `campaign_cache` (refreshed from SmartLead via `smartlead-proxy`). Click a row to see status / lead counts / send schedule.
- **Analytics panel (`AnalyticsPanel.tsx`)** — pulls `GET /analytics/overview` in a single call (preferred over per-campaign loops to respect the 10 req / 2 s rate limit). Falls back to per-campaign aggregation only if the overview endpoint fails.
- **Inbox panel (`SmartLeadInboxPanel.tsx`)** — live reply feed from `smartlead_events` (Supabase Realtime subscription). Each row shows the lead, campaign, reply snippet, and a **7-bucket category chip**: 🟢 INTERESTED / MEETING · 🟡 INFO · 🟠 SOFT NO / WRONG PERSON · 🔴 NOT INTERESTED · ⚪ OOO. Hover the chip → tooltip shows the classifier's one-line reason + confidence %. Per-row override dropdown lets Sam reclassify (logged in `reply_intent_overridden_by`). Red unread badge counts `EMAIL_REPLIED` events since last view (persisted in `localStorage`); "Mark all read" clears it.
- **Email Accounts panel (`EmailAccountsPanel.tsx`)** — lists connected mailboxes pulled from `GET /email-accounts`.
- **Prospect Batches panel (`ProspectBatchesPanel.tsx`)** — groups `prospects_staging` rows by `batch_id`, resolves campaign names via `campaign_cache`, and exposes a "Retry" button per lead with `qa_status='rejected'` to re-push it to SmartLead.
- **New Campaign drawer (`NewCampaignDrawer.tsx`)** — creates a campaign via `POST /campaigns/create`. Open/click/reply tracking toggles are emitted as SmartLead's NEGATIVE flags (`DONT_TRACK_EMAIL_OPEN`, `DONT_TRACK_LINK_CLICK`, `DONT_TRACK_REPLY_TO_AN_EMAIL`) — sending `TRACK_OPENS`/`TRACK_CLICKS` returns 400.
  - **Default name** auto-fills as `Outreach · MMM-DD · HH:mm TZ · vN` (vN persisted in `localStorage.ng_campaign_seq`); user can overwrite.
  - **Test Mode** (yellow toggle): swaps the recipient list (TO) with the logged-in user's `auth.users.email` plus an override field. FROM is always the SmartLead mailbox — Test Mode only swaps TO. Campaign name is prefixed `[TEST]` automatically so it never gets confused with real sends in the campaign list.
  - **Inbox picker:** user selects which connected mailboxes the campaign sends from (default = all). All / None toggles. Per-inbox = parallel sends; single-inbox = sequential sends. SmartLead's cron polls every ~10–15 min so the time you click Launch is **not** the exact moment the first email goes out — there's a poll delay.
  - **Min gap between emails** enforced at 3 minutes minimum (SmartLead `/campaigns/{id}/schedule` rejects values < 3).
  - **Sequence body today does not include `{{unsubscribe}}`** — blocker tracked as OPEN_TASKS 17f. Real (non-test) sends should not launch until that merge tag is added (CAN-SPAM).
- **Import Leads wizard (`ImportLeadsWizard.tsx`)** — Step 1 picks a Source (Apollo, Clay, LinkedIn Navigator, CSV, Manual). Step 2 maps fields. Step 3 QA-stages rows into `prospects_staging`. Step 4 pushes approved rows to SmartLead in a batch.
- **Webhook → Inbox → Pipeline loop:** SmartLead POSTs to `smartlead-webhook` → row inserted into `smartlead_events` (replies classified into 7 buckets with confidence + reason via regex pre-pass → Lovable AI `gemini-2.5-flash-lite` fallback) → Postgres realtime → Inbox panel + Outreach Queue row update live. The Queue row's action is **category-driven** (`src/lib/replyCategories.ts::isAutoPromotable`):
  - `INTERESTED` / `MEETING_REQUEST` @ confidence ≥ 0.7 → **Promote to Pipeline** (creates `candidates` row at "New Lead")
  - `INFO_REQUEST` → **Reply needed** (no promote)
  - `SOFT_NO` → **Snooze 6mo** (sets `outreach_queue.snoozed_until`)
  - `WRONG_PERSON` → **Capture referral**
  - `NOT_INTERESTED` / `OOO` → read-only
  A `⋯` menu on every row exposes Manual Promote / Snooze 3mo / 6mo / Suppress regardless of category. The summer-camp failure mode ("not available for summer" being treated as HOT) is closed — that reply now classifies as `SOFT_NO` and never reaches a Promote button.
- **Open-rate caveat:** Gmail's image proxy and Apple Mail Privacy Protection pre-fetch every tracking pixel as soon as an email lands, so the **Open Rate metric is inflated to ~100% on those inboxes**. Trust **clicks** and **replies** as real engagement signals, not opens. Tooltip on the Analytics panel is tracked as OPEN_TASKS 17g.
- **AI personalization** continues to run through `LOVABLE_API_KEY` for email-body generation.
- **Today's status (May 20):** End-to-end live with the 7-bucket classifier. Verified SOFT_NO replies show Snooze instead of Promote; manual override menu on all rows; legacy `HOT`/`NEUTRAL` rows backfilled (`HOT→INTERESTED`, `NEUTRAL→INFO_REQUEST @ 0.3`). Pause/Resume/Stop verified earlier. Still not ready for real teacher sends — blocked on Brett teacher-source decision.

- **Outreach Queue panel (`OutreachQueuePanel.tsx`, added May 20):** Newer per-teacher push path that bypasses the CSV Import Wizard. Reads `outreach_queue` (any rows added via Teacher Search → "Add to Campaign"). Each row carries a lifecycle `state`:
  - `queued` — added to outreach but no SmartLead campaign chosen yet (draft).
  - `assigned` — has a real `campaign_id` locally, **not yet pushed** to SmartLead.
  - `sending` — push in progress.
  - `sent` — SmartLead accepted the lead; `smartlead_lead_id` + `pushed_at` stored.
  - `failed` — push failed; `last_error` stored and shown inline under the State pill.
- **Push button:** calls `smartlead-proxy → POST campaigns/{id}/leads` with first/last name, email, school (as `company_name`), and city (as `location`). Disabled when there's no real campaign, no email, or the row is already sent/sending.
- **Invalid-campaign guard:** `AddToCampaignModal` only lists real SmartLead campaigns (numeric ids + real lifecycle status). Any row that still points at a synthetic id (e.g. legacy "Analytics Overview" cache row) renders a red "invalid — reassign" pill in the panel and Push is blocked.

#### Master Pool vs SmartLead (v1.2, May 21, 2026)

Email Outreach now treats the teacher database as **two pools** with a single scope toggle at the top of the page:

- **Master Teacher DB** (slate theme) — the full `teacher_prospects` table. CSVs are ingested here first, with no SmartLead API cost. This is Neuron Garage's owned recruiting asset.
- **SmartLead** (blue theme) — the subset of leads currently loaded into a SmartLead campaign for active outreach.

`ScopeSwitcher` (top of `/email-outreach`) swaps which pool the 6-card `StatStripCards` strip describes — Total Contacts, With Email, Verified, Catch-All, Invalid, No Email Found. Every card has a Show Formula popover (Rule 1) revealing the exact filter that produced the number.

**Ingest flow — `MasterPoolImportWizard` (top-right "Import to Master Pool"):**
1. **Setup** — pick `destination`: `master_only` or `master_and_smartlead`. Optionally set a default city/state for rows missing geography.
2. **Map** — upload CSV; `csv-suggest-mapping` edge function calls `google/gemini-3-flash-preview` with headers + sample rows and returns a suggested source→target map. User can override any row. Unmapped columns are stashed in `teacher_prospects.raw` and listed on the batch.
3. **QA** — live preview shows valid-email count, in-batch duplicates (via generated `dedupe_key`), and rows that will be skipped for missing required fields.
4. **Import** — chunked 500/insert into `teacher_prospects`, all rows stamped with the new `teacher_import_batches.id` (`destination`, `column_mapping`, `unmapped_columns` recorded).
5. **Optional Push** — if `master_and_smartlead` was chosen, verified leads are immediately handed to `smartlead-push-leads` against a chosen campaign.

**Push flow — `PushToSmartLeadBanner` + `PushToSmartLeadModal` (Master scope only):**
- Banner shows "N verified emails ready to push" and opens the modal.
- Modal: campaign picker (from `campaign_cache`), state/city filter, include-catch-all toggle, lead limit.
- "Preview" calls `smartlead-push-leads` with `dry_run=true` → returns candidate count, already-in-campaign count (joined via `outreach_queue`), and will-push count.
- "Push" runs live: chunked 100/batch to `POST /campaigns/{id}/leads`, writes one `outreach_queue` row per success (`smartlead_lead_id`, `pushed_at`), AND stamps the source `teacher_prospects` row with `status='in_smartlead'` + `last_pushed_at` so the Master Pool view can filter on push state without re-joining `outreach_queue`.
- Modal dry-run preview re-runs automatically (400ms debounce) as filters change, so the "Will push N" counter updates live as the user types a state/city or toggles catch-all.

**Scope-gated page (Sprint 3):** `ScopeSwitcher` no longer just changes stat formulas — it gates which page sections render. Master DB scope shows the pool overview + recent imports (`ProspectBatchesPanel`). SmartLead scope shows reply triage + campaigns + outreach queue + setup. The legacy mini stat strip is hidden in Master scope (its numbers come from SmartLead).

The legacy 4-step "Import Leads" button is preserved as **"Import to SmartLead (Legacy)"** for the direct-to-SmartLead path that bypasses the Master Pool. It will be retired once Teacher Search → Master Pool handoff is in daily use.

City-level enrichment (Apollo / SmartLead / future Hunter) is tracked in `enrichment_jobs`. One backend function services both Master DB and SmartLead surfaces so cost + status are visible regardless of which scope the user is in.







### `/candidate-pipeline` Candidate Pipeline — `CandidatePipeline.tsx`
- **User sees:** Kanban board with columns: New Lead → Qualification → Confirmation → Signing. Click a candidate to open the detail panel (Overview / Qualification / Committee Votes / Homework / Lead Sheet / Notes / Stage History).
- **User action:** Drag cards across columns, score qualification, cast committee votes, complete confirmation checklist.
- **Behind the scenes:**
  - Reads/writes `candidates`, `candidate_profiles`, `candidate_qualification`, `candidate_votes`, `candidate_stage_history`, `candidate_checklist_items`.
  - **Automatic:** when a candidate enters the `confirmation` stage, the DB trigger `trg_seed_confirmation_checklist` calls `seed_confirmation_checklist()` to insert the 5 default checklist items.
  - **Hardcoded rule:** cannot drop into "Signing" without passing "Confirmation". Do not change.
- **Today's limitation:** Candidates are placeholder data. Teacher → Candidate promotion path exists in UI but is not wired end-to-end.

### `/onboarding` Onboarding — `Onboarding.tsx`
- **User sees:** Table of franchisees in onboarding, each with a 7-step progress bar and FDD countdown.
- **User action:** Open a record, complete steps, upload documents, log activity.
- **Behind the scenes:** Reads/writes `onboarding_records` and `onboarding_steps`. Template comes from `src/lib/onboardingTemplate.ts`. No edge function — pure DB.

### `/settings/team` & `/users` Team Members — `TeamMembers.tsx`
- **User sees:** List of users + roles. Admin can invite new users.
- **User action:** Invite a user (admin only).
- **Behind the scenes:** `admin-create-user` edge function creates the auth user; trigger `handle_new_user` creates a `profiles` row + a `user_roles` row with `manager` role. RLS on `user_roles` requires `admin` to write.

### `/spec` Spec — `Spec.tsx`
- Internal markdown viewer of `src/data/specMarkdown.ts`. Not user-facing.

---

## 4. Key calculations (the "show your math" stuff)

### City composite score
```
metric_normalized = sowNormalize(raw_value, metric_definition)    // 0–100
sub_share_i = sub_weight_i / Σ(enabled sub_weights in category)   // sums to 1.0
category_score = Σ( sub_share_i × metric_normalized_i ) × 100
master_share_c = master_weight_c / Σ(master_weights)              // sums to 1.0
composite = Σ( master_share_c × category_score_c )                // 0–100
```
- Master sliders auto-rebalance to 100. Sub-weights do **not** — they're relative-importance numbers.
- An empty category falls back to the server-stored `city_category_scores.score`.
- Every drawer exposes "Show Formula" with the raw / normalized / share / contribution table.

#### Score display invariant (added May 23, 2026; enforced May 23, 2026)
There is exactly **one** composite score per market per applied-weight set. Every UI surface that displays a market's score reads from a `MarketView` built by `src/lib/marketView.ts` — `buildMarketView(market).composite` / `.compositeFormatted`. As of the second-pass fix the wired surfaces are: the ranked-markets table (`CityTable`), the right-panel gauge / market summary / executive summary / formula popover (`CityScoring.tsx`), the map tooltip (`MarketsMap`), the spreadsheet view (`CitySpreadsheetView`), the city detail drawer (`CityDetailDrawer`), the compare modal (`CompareModal`), the market compare modal (`MarketCompareModal`), the nearby-markets panel (`NearbyMarketsPanel`), the global search dropdown (`GlobalSearch`), the dashboard stat cards (`StatCards`), the find-prospects modal (`FindProspectsModal`), and the dashboard top-markets list (in `CityScoring.tsx`). Three guard rails keep new code honest: (1) the branded `CompositeScore` TS type that only `marketView.ts` can mint; (2) a dev-mode drift detector that throws a red `console.error` if the same `(cityId, weightsHash)` ever produces two values in one render pass; (3) an ESLint rule (`no-restricted-syntax` on `.compositeScore` member reads) that fails the build if any new component in `src/components/**` or `src/pages/**` reads the raw field — `src/data/**`, `src/stores/**`, `src/integrations/**`, and the scoring libs under `src/lib/` that populate the raw field are the only allowlisted call sites. Origin: on May 23, 2026 the table showed `88` while the gauge showed `23` for the same city — two files held two formulas under the same label "Score". First-pass fix rerouted only the gauge; second-pass (same day) rerouted every consumer and added the lint rule, so that class of bug is now structurally impossible.

### Teacher fit score (0–100)
Computed in `src/utils/fitScore.ts`. Inputs: grade match (K–6), teacher type (active/retired/camp_enrichment), summer availability heuristic. See `TEACHER_IDEAL_PROFILE.md` for full criteria.

### Candidate qualification composite
Stored in `candidate_qualification` — five sub-scores (financial readiness, leadership, teaching experience, culture fit, market fit) → `composite_score`.

---

## 5. Cross-feature links

| Link | Status |
|---|---|
| Favoriting a city in City Search → Teacher Search defaults to that city | **Working** |
| Promoting a hot teacher → new row in `candidates` with `prospect_id` set | **UI exists, not wired end-to-end** |
| Candidate reaches `signing` stage → seeds an `onboarding_records` row | **Not built** |
| Email Outreach → SmartLead campaigns + lead push + reply inbox | **Working (Phases 1–5, May 19)** |
| Email Outreach → updates `teacher_prospects.status` after send | **Not wired** — needs Teacher Search → Import Wizard bridge |

---

## 6. Manual vs automatic

| Action | How |
|---|---|
| City refresh | **Manual**, per-city (will become scheduled bulk refresh after Task #0) |
| Teacher search | **Manual**, per-city, triggered by user |
| Composite score recompute | **Automatic** (client-side, on slider change) |
| Confirmation checklist seeding | **Automatic** (DB trigger on stage = `confirmation`) |
| Stage transitions in Kanban | **Manual** (drag and drop) |
| New user → profile + role row | **Automatic** (`handle_new_user` trigger) |
| City lat/lng backfill | **Automatic** (`fill_city_coords` trigger from `us_cities_geo`) |
| Email send | **Not yet** — will be manual via SmartLead UI |

---

## 7. Auth & access

- Email + password only. No Google / Microsoft / SSO (intentionally removed).
- HIBP leaked-password check is **off** so users can pick any password meeting length rules.
- Email auto-confirm is **off** — new users must verify their email before sign-in.
- 3 users total: Kaylie, Sam, Haseeb. New users get `manager` role by default; `admin` role must be granted manually.

---

*Regenerate this file when product behavior changes — not when a table or API changes. For inventory, see `PROJECT_CONTEXT.md`. For integrations, see `APIS.md`.*
