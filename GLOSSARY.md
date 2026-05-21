# GLOSSARY.md — Neuron Garage

> One-line definitions for terms used across the app, docs, and meetings.
> If a term has a deeper home, the line links to it.
> Add a row whenever a new domain term enters the project.

---

## Product

- **City Search** — the `/city-scoring` screen; ranks U.S. cities by composite fit score.
- **Teacher Search** — the `/teacher-prospects` screen; finds K–6, retired, camp/enrichment, and secondary middle/high hands-on (STEM/maker/shop/art) teachers in target cities. (Route name still says "teacher-prospects".)
- **Email Outreach** — the `/email-outreach` screen; AI-personalized outbound emails via SmartLead.
- **Candidate Pipeline** — the `/candidate-pipeline` Kanban: New Lead → Qualification → Confirmation → Signing.
- **Onboarding** — the `/onboarding` screen; 7-step tracker per franchisee from signing through grand opening.
- **Composite Score** — 0–100 fit score for a city. Math in `HOW_IT_WORKS.md` § 4.
- **Tier A / B / C** — qualitative bucket assigned to a city based on composite score. A = top, C = weakest.
- **Master Weight** — one of the 6 category-level sliders in City Search. Auto-rebalance to 100.
- **Sub-weight Share** — relative-importance number per metric inside a category. Does NOT auto-rebalance; share = `sub_i / Σ(enabled sub-weights)`.
- **Tracked-no-value** — a metric in the 46-metric registry that is flagged `enabled: false` and has no seeded value yet. Surfaced as its own chip in the City Detail drawer for visibility, but does **not** contribute to the composite score. Distinct from "Not seeded yet" (which is `enabled: true` + no value — will count once seeded). Flip `enabled: true` to promote.
- **Ask AI — Absolute weight mode** — when the user gives Ask AI an exact/literal request ("100% demand", "only pricing", "demand 50 pricing 30"), the assistant returns `weightMode: "absolute"` and `absoluteWeights` (0-100 per category). The frontend sets the 6 master sliders to exactly those numbers — any category the user did not name goes to **0%**. No auto-rebalance, no dominant-detection. Vague requests ("lean toward demand") still use `weightMode: "delta"` with ±20 nudges. Added May 19, 2026.
- **Show Formula** — the affordance (button / drawer / tooltip) that exposes inputs, weights, and the formula behind any calculated number. Non-negotiable per Rule 1.
- **Saved Search** — user-saved slider configuration in `saved_searches` table.
- **Watchlist / Favorites** — same thing. UI says "Favorites", table is `watchlist_items`. Only one list works today.
- **Non-registration state** — one of 38 U.S. states/territories where Kaylie's franchise cannot legally register. Hardcoded business logic. Do not change.
- **Fit Score** (teacher) — 0–100 score in `teacher_prospects.fit_score`. See `TEACHER_IDEAL_PROFILE.md`.
- **Teacher Type** — value in `teacher_prospects.teacher_type`. One of `active` (current K–6), `retired`, `camp_enrichment` (summer camp / after-school enrichment educators). Locked enum — see `DATABASE_LAYER_SPEC.md`.
- **Segment** — value in `teacher_prospects.segment`. Maps to the 4 recruiting segments in `TEACHER_IDEAL_PROFILE.md` (1: active K–6, 2: retired K–6, 3: camp/enrichment, 4: middle/high STEM/maker/shop/art).
- **Fit Tag** — qualitative label on a candidate (`Hot`, `Warm`, `Cold`, `Untagged`).
- **Confirmation Gate** — Kanban rule: a candidate cannot move into "Signing" without passing "Confirmation". Already working — do not modify.
- **Selection Committee** — group voting on candidate fit; rows in `candidate_votes`.
- **Homework** — tasks assigned to a candidate between stages; tab in candidate detail panel.
- **Lead Sheet** — printable one-pager about a candidate; PDF export not yet built.
- **FDD Countdown** — 14-day Franchise Disclosure Document waiting period, tracked in `onboarding_records`.
- **7-step Onboarding** — fixed template in `src/lib/onboardingTemplate.ts`.

---

## Vendor Aliases

- **"Integral Leads"** = **SmartLead**. Same product. Kaylie's branding.
- **"Lovable Cloud"** = managed Supabase under the hood. **Say "Lovable Cloud" to the client, not Supabase.**
- **"Apify Google Maps actor"** = the `compass/crawler-google-places` actor on Apify (configurable via `APIFY_GOOGLE_MAPS_ACTOR_ID`).
- **NCES CCD** = National Center for Education Statistics — Common Core of Data, served via the Urban Institute Education Data API.

---

## Email Outreach (SmartLead)

- **Reply Intent (7-bucket)** — auto-tag on every `EMAIL_REPLIED` row in `smartlead_events`, mirrors Smartlead's Lead Categories. Values:
  - `INTERESTED` 🟢 — auto-promotable to Candidate Pipeline (with confidence gate)
  - `MEETING_REQUEST` 🟢 — auto-promotable; flag for scheduling
  - `INFO_REQUEST` 🟡 — needs a human reply, never auto-promotes
  - `SOFT_NO` 🟠 — "not now / not this summer / maybe next year"; offers Snooze, never promotes
  - `WRONG_PERSON` 🟠 — capture forwarded contact; never promotes
  - `NOT_INTERESTED` 🔴 — hard no / unsubscribe; auto-suppressed
  - `OOO` ⚪ — auto-reply; Smartlead retries
  Classified by `smartlead-webhook` (regex pre-pass → Lovable AI `gemini-2.5-flash-lite` fallback). Stores `reply_intent_reason` + `reply_intent_confidence` (0–1). Users can override category from the Inbox; override is logged in `reply_intent_overridden_by`. Replaces the deprecated `HOT / NEUTRAL` 4-bucket scheme (May 19); legacy rows backfilled (`HOT→INTERESTED`, `NEUTRAL→INFO_REQUEST` @ 0.3).
- **Auto-Promote Rule** — a queue row auto-shows the Promote-to-Pipeline button only when `reply_intent ∈ {INTERESTED, MEETING_REQUEST}` AND `reply_intent_confidence ≥ 0.7` AND not bounced/suppressed. Single source: `src/lib/replyCategories.ts::isAutoPromotable`. A `⋯` menu always exposes Manual Promote / Snooze 3mo / Snooze 6mo / Suppress regardless of category.
- **Snooze** — `outreach_queue.snoozed_until` timestamp. Set by SOFT_NO action or manual override. Row drops off active outreach until that date.
- **Import Batch** — a group of leads staged via the Import Leads wizard, sharing a `batch_id` in `prospects_staging`. Pushed to SmartLead as a single bulk call; failed rows keep `qa_status='rejected'` and expose a Retry button.
- **Prospect Source** — value in `prospects_staging.source`. One of `apollo`, `clay`, `linkedin_navigator`, `csv`, `manual` (Step 1 of the wizard).
- **Campaign Cache** — `campaign_cache` table. Local mirror of SmartLead campaigns so Batches/Inbox can resolve names without hitting the API on every render.
- **Negative `track_settings`** — SmartLead's `POST /campaigns/create` expects opt-OUT flags (`DONT_TRACK_EMAIL_OPEN`, `DONT_TRACK_LINK_CLICK`, `DONT_TRACK_REPLY_TO_AN_EMAIL`), not opt-IN. Sending `TRACK_OPENS`/`TRACK_CLICKS` returns 400. (Phase 4 hotfix.)
- **Connection Health Strip** — top-of-page widget in `SmartLeadConnectionPanel` showing "Last successful API call" timestamp + 24-hour webhook activity indicator.
- **SmartLead rate limit** — 10 requests per 2 seconds per API key. Always prefer `/analytics/overview` (one call) over looping campaigns.
- **Master Pool** — the `teacher_prospects` table treated as Neuron Garage's owned teacher database. CSVs land here first (no SmartLead cost). Distinct from the **SmartLead pool**, which is the subset of leads actively loaded into a SmartLead campaign for outreach. The `ScopeSwitcher` on `/email-outreach` toggles which pool the stat strip + tables describe.
- **Push to SmartLead** — the action of promoting verified Master Pool rows into a SmartLead campaign. Triggered from the `PushToSmartLeadBanner` (Master scope) → `PushToSmartLeadModal` → `smartlead-push-leads` edge function. Always offers a dry-run preview (candidates / already-in-campaign / will-push) before committing.
- **Destination (import)** — `teacher_import_batches.destination`. One of `master_only` (CSV lands in Master Pool only) or `master_and_smartlead` (Master Pool, then immediately push verified rows to a chosen SmartLead campaign). Selected in Step 1 of the Master Pool Import Wizard.
- **dedupe_key** — generated column on `teacher_prospects`. Lowercased email when present, otherwise `lower(name|school|city|state)` composite. Non-unique index — used by the wizard's QA step to flag in-batch and cross-batch duplicates before insert. Not enforced as unique (Manus-sourced CSVs vary too much).
- **Unmapped columns** — CSV columns the AI mapper could not match to a `teacher_prospects` field. Stashed in `teacher_prospects.raw` (jsonb) and listed in `teacher_import_batches.unmapped_columns` so a future "promote-to-column" UI can lift recurring ones into real columns.
- **AI-suggested mapping** — Step 2 of the Master Pool Import Wizard. `csv-suggest-mapping` sends headers + sample rows to `google/gemini-3-flash-preview` and returns a proposed source→target map. User can override every row before continuing.
- **`last_pushed_at`** — `teacher_prospects.last_pushed_at` (added Sprint 3, May 21). Timestamp the row was most recently sent to a SmartLead campaign by `smartlead-push-leads`. Paired with `status='in_smartlead'` so the Master Pool view can fast-filter "already in outreach" without joining `outreach_queue`.
- **`in_smartlead` status** — value of `teacher_prospects.status` meaning the row has been pushed to at least one SmartLead campaign. Set by `smartlead-push-leads` alongside `last_pushed_at`. Other values: `new` (default), legacy ad-hoc values from older imports.

---

## Data / Architecture

- **`us_cities_scored`** — planned seed table for all ~800 U.S. cities with pre-computed scores. Replaces per-city live fetches. Task #0 deliverable.
- **Elementary-serving school** — an NCES open public school (`school_status = 1`) with `lowest_grade_offered ≤ 5` (PK / KG / 01–05). The K–6 camper-relevant subset of the broader public-schools dataset.
- **`public_school_count` vs `public_elementary_count`** — on `us_cities_scored`, `public_school_count` is all open public schools in the city (any grade). `public_elementary_count` is the derived subset of elementary-serving schools. Same pattern for `_enrollment`. (Renamed May 18 — was previously `public_elementary_*` storing only K–6.) These are **cached counts** — source of truth is the `public_schools` table.
- **`public_schools`** — per-row table of every open public K-12 school nationally (PK = `nces_id`). Stores name, district, address, lat/lng, grades, type, enrollment. `is_elementary_serving` is a generated column. Linked to its seeded city via `us_cities_scored_id`. Populated by `backfill-public-schools`. Added May 18 — 38,196 rows across 948 cities.
- **`teacher_prospects_master`** — planned seed table for the teacher recruiting database. Task #0 deliverable.
- **Per-row live fetch** — today's pattern: edge function calls Census / BLS / etc. once per city on demand. Slow (5+ min/city).
- **Bulk seed** — new pattern: one batch pull across all cities, refreshed on a schedule.
- **Seeded vendor CSV** — purchased data list (Exact Data, LeadsPlease, K12 Prospects) — **not an API**, ingested via one-time CSV import.
- **Edge function** — Deno function in `supabase/functions/<name>/index.ts`, deployed to Supabase, callable via `supabase.functions.invoke()`.
- **RLS policy** — Row-Level Security rule on a Postgres table; gates `SELECT` / `INSERT` / `UPDATE` / `DELETE` per role.
- **Lovable AI Gateway** — built-in proxy to OpenAI / Gemini models via `LOVABLE_API_KEY` — no separate vendor key needed.

---

## People / Roles

- **Kaylie Reed** — owner / product decisions / final word on UX and targeting.
- **Sam Reed** — owns the scoring engine math; only person who approves changes to the 46-metric / 6-category formula.
- **Haseeb** — builds in Lovable + GitHub. Non-technical; needs why-before-how.
- **Brett** — operations; owns API key procurement (GreatSchools, SmartLead, Apollo, etc.) and the teacher-sourcing decision.
- **`manager` role** — default role granted to every new user via `handle_new_user` trigger. Full read/write on most tables.
- **`admin` role** — grant-only. Required to write `user_roles`. Manually assigned.
