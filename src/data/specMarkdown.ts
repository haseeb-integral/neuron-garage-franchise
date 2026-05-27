// Markdown source of the Product Specification, used by the Spec page download button.

export const SPEC_MARKDOWN = `# Neuron Garage Franchise Acquisition System — Product Specification

> Detailed specification of the Neuron Garage Franchise Acquisition System.
> Document version 1.3 · Updated May 21, 2026 · For internal review.
> Live URL: neuron-garage-franchise.lovable.app

---

## Table of Contents

1. [Overview](#1-overview)
2. [Users & Roles](#2-users--roles)
3. [End-to-End Journey](#3-end-to-end-journey)
4. [Navigation & Layout](#4-navigation--layout)
5. [Dashboard](#5-dashboard)
6. [Feature 1 — City Search](#6-feature-1--city-search)
7. [Feature 2 — Teacher Search](#7-feature-2--teacher-search)
8. [Feature 3 — Email Outreach](#8-feature-3--email-outreach)
9. [Feature 4 — Candidate Pipeline](#9-feature-4--candidate-pipeline)
10. [Authentication](#10-authentication)
11. [Guided Tour](#11-guided-tour)
12. [Design System](#12-design-system)
13. [Data Model](#13-data-model)
14. [Tech Stack](#14-tech-stack)
15. [Backend & Edge Functions](#15-backend--edge-functions)
16. [Third-Party APIs](#16-third-party-apis)
17. [Future Work](#17-future-work)

---

## 1. Overview

**Neuron Garage Franchise Acquisition System** is an internal tool for the Neuron Garage franchise-development team (3 users: Kaylie, Sam, Haseeb). It is **not public-facing**. The system helps the team:

- Identify the best U.S. markets for new franchises (City Search).
- Source K–6, retired, camp/enrichment, and secondary STEM/maker teachers as candidate franchisees (Teacher Search).
- Run AI-personalized outbound email campaigns via SmartLead, with live reply tracking (Email Outreach).
- Qualify candidates through a structured 7-stage Kanban pipeline (Candidate Pipeline).

> **Phase 2 (deferred):** Onboarding — a 7-step franchisee launch program. Code and the \`/onboarding\` route exist in the app today but are out of scope for Phase 1 and are not specified in this document.

The product is a React + TypeScript single-page app, backed by Lovable Cloud (managed Supabase: Postgres + Auth + Edge Functions + Storage).

### Goals

- Replace ad-hoc spreadsheets and email threads with a single source of truth.
- Use scoring + AI assists to focus the team on the highest-value cities and prospects.
- Make every stage observable, accountable, and time-bound.
- **Show the math.** Every calculated number exposes its inputs, weights, and formula via "Show Formula" — non-negotiable.

### Non-Goals

- No payment processing or contract execution; e-sign is represented as a status only.
- No public-facing franchisee portal.
- No multi-tenancy or mobile app.
- No Google / Microsoft / SSO sign-in (intentionally removed — email-only).

---

## 2. Users & Roles

Current build assumes one role: **Franchise Development Rep** (\`manager\`). Admin role exists for user-management actions.

- **\`manager\`** — default role for every new user. Read/write access to cities, teachers, candidates, email outreach.
- **\`admin\`** — required to write to \`user_roles\`. Manually granted; not handed out automatically.

Roles are stored in a dedicated \`user_roles\` table with an \`app_role\` enum and a \`has_role()\` security-definer function so RLS policies never recurse.

Future roles to consider: FD Manager, Selection Committee Member, external Franchisee (read-only).

---

## 3. End-to-End Journey

The product follows a left-to-right funnel reflected in the sidebar order:

\`\`\`
Dashboard → City Search → Teacher Search → Email Outreach → Candidate Pipeline
\`\`\`

1. **Score a city** — pick a U.S. metro with the right demographics, school density, and competitive landscape.
2. **Find teachers** — surface K–6 / retired / camp / secondary-STEM teachers in that city, ranked by Fit Score.
3. **Run outreach** — push prospects into a SmartLead campaign and track replies with auto-tagged intent (HOT / NOT INTERESTED / OOO / NEUTRAL).
4. **Qualify candidates** — move a prospect through the 7-stage Kanban pipeline.

---

## 4. Navigation & Layout

### App Shell

- Persistent left sidebar on desktop (≥ 768 px), drawer on mobile. Collapsible to an icon rail. **Sidebar layout is locked** — 5 main items: Dashboard, City Search, Teacher Search, Email Outreach, Candidate Pipeline.
- Help icon (?) top-right — restarts the guided tour.
- Mobile top bar with hamburger, brand mark, and help icon. Touch targets ≥ 44 px.

### Routes

Public:
- \`/auth\` — Sign-in / sign-up
- \`/reset-password\` — Password reset

Protected (\`ProtectedRoute\` + \`AppLayout\`):
- \`/\` — Dashboard
- \`/city-scoring\` — City Search
- \`/teacher-prospects\` — Teacher Search (UI label was renamed; route slug retained)
- \`/email-outreach\` — Email Outreach (V2; legacy \`EmailOutreach.tsx\` exists but is not routed)
- \`/candidate-pipeline\` — Candidate Pipeline
- \`/onboarding\` — Onboarding *(Phase 2 — route exists, out of scope for this spec)*
- \`/settings/team\` & \`/users\` — Team Members
- \`/spec\` — This document
- \`*\` — 404

---

## 5. Dashboard

> The Dashboard is the home screen, not a feature in itself — it's the "what should I do next?" view across the 4 numbered features below.

**Purpose:** give the rep a one-screen answer to "what should I do next?"

- **Next Action card** — personalized recommendation with a CTA that deep-links to the right city.
- **Stat cards** — Total Cities Scored, Total Prospects Found, Candidates in Pipeline.
- **Pipeline Snapshot** — horizontal bar chart of candidate count by stage.
- **Recent Activity** — last 6 system events with relative timestamps.

Reads from \`candidates\` and \`teacher_prospects\` via the Supabase client. No edge functions.

---

## 6. Feature 1 — City Search

**Purpose:** rank U.S. cities by their suitability for a new Neuron Garage franchise.

### National seed table

\`us_cities_scored\` is seeded with **948 U.S. cities** (population ≥ 50,000), all carrying a pre-computed \`composite_score_default\` so the national ranking is instant — no live API call at query time. Refreshed by scheduled background jobs, not per-user clicks.

### Scoring model (12 metrics across 3 categories)

> Live source of truth: \`src/lib/sowMetricRegistry.ts\`. The earlier "46 metrics / 6 categories" language is historical — most of that list was never wired. Final 6→3 category reshape: May 21, 2026.

| Category | Sub-metrics | Master slider |
|---|---|---|
| Demand | 4 (Census ACS) | adjustable, auto-rebalances |
| Competitive Opportunity (CSI) | 3 (Manus v2, read-only) | adjustable, auto-rebalances |
| TAM Teachers | 5 (NCES + BLS/BEA) | adjustable, auto-rebalances |

**Math** (computed client-side in \`src/lib/clientSubWeightScoring.ts\`):

\`\`\`
metric_normalized = sowNormalize(raw_value, metric_definition)    // 0–100
sub_share_i       = sub_weight_i / Σ(enabled sub_weights in category)
category_score    = Σ( sub_share_i × metric_normalized_i ) × 100
master_share_c    = master_weight_c / Σ(master_weights)
composite         = Σ( master_share_c × category_score_c )        // 0–100
\`\`\`

- **Master sliders auto-rebalance to 100.**
- **Sub-weights do NOT auto-rebalance** — they're typed as relative-importance numbers (no upper bound). Share = \`sub_i / Σ(enabled sub-weights)\`.
- Empty category falls back to the server-stored \`city_category_scores.score\`.
- Sub-metric weights live in a per-category drawer (\`SubMetricWeightsDrawer.tsx\`); each enabled metric can be re-weighted or disabled.

### Show Formula (non-negotiable)

Every widget with a calculated number exposes a **Show Formula** affordance that opens a raw / normalized / share / contribution table, with column tooltips, a legend, and a plain-English master-weight contribution sentence. Score changes also fire a delta toast: \`old → new\` for both the category and composite.

### Filter bar & top-level UI

- State multi-select (dynamic), tier (A/B/C/D), registration status (38 non-registration states are hard-coded), free-text search, min population, min score.
- Stat cards: total cities, A-tier count, average score, registered states.
- Sortable city table with sticky header.
- **Add to Favorites** writes to \`watchlist_items\` (single list today; multi-list rolled over to OPEN_TASKS #9).
- **Save Search** persists current master + sub weights to \`saved_searches\` per user.
- **Export CSV** (toolbar) — full ranked table.
- **Ask AI** bar — natural-language query → \`ai-city-query\` edge function (Lovable AI Gateway).

### City Detail drawer

Row click opens \`MarketDetailDrawer\` with:

- Composite gauge + verdict label + plain-English reason.
- **Source Data panel** — the 12 live SOW signals grouped by category, with source URLs and confidence values.
- Public Elementary Schools widget — count + enrollment from \`us_cities_scored.public_elementary_count\` / \`public_elementary_enrollment\` (NCES schools with \`lowest_grade_offered ≤ 5\`).
- **Total public schools** is also stored (\`public_school_count\` / \`public_school_enrollment\`) but its widget is deferred (OPEN_TASKS 11a).
- Private elementary count + enrollment from NCES PSS (embedded 2021–22 dataset; 636 / 960 cities covered, full re-pull tracked as B10a).
- Climate signals (annual snowfall, avg temp, sunny days, severe-weather days) from Open-Meteo Historical (506 / 960 seeded, B8 in progress).
- Competitor list (\`city_competitors\`), nearby markets panel, map.
- **Export Raw Signals** — downloads the open city's \`city_market_signals\` rows as \`{city-slug}-source-data-{date}.csv\`.
- **Find Teachers in this City** button → navigates to Teacher Search pre-filtered.

### Refresh Data flow (per-city, manual)

Clicking **Refresh Data** for a city runs:

1. \`fetch-city-market-data-sow\` — official SOW framework (12 live metrics across Demand / CSI / TAM Teachers); writes \`city_market_signals\`, recomputes \`city_category_scores\` and \`cities.composite_score\`.
2. \`fetch-school-counts\` — non-blocking NCES CCD refresh.
3. (Legacy \`fetch-city-market-data\` retained as fallback path.)

Categories with fewer than 3 usable metrics fall back to blended values; missing metrics are tracked as evidence gaps, not counted as zero.

### School-level source of truth

\`public_schools\` is the per-row table of every open public K–12 school nationally (38,196 rows across 948 cities, PK = \`nces_id\`). Stores name, district, address, lat/lng, grades, type, enrollment; \`is_elementary_serving\` is a generated column. Populated by **both** \`seed-cities-database\` (same NCES response as the seed pass — no extra API calls) and \`backfill-public-schools\` (for full rebuilds). Counts on \`us_cities_scored\` are cached aggregates.

### Compare mode

Select up to 4 cities and open a side-by-side modal (\`MarketCompareModal\`).

---

## 7. Feature 2 — Teacher Search

**Purpose:** discover, score, and shortlist teachers who could become franchisees.

### Target segments

\`teacher_prospects.teacher_type\` is a locked enum: \`active\` | \`retired\` | \`camp_enrichment\`. \`segment\` maps to:

1. **Active K–6** elementary teachers (primary)
2. **Retired K–6** elementary teachers (primary)
3. **Camp / enrichment** educators — summer camp, after-school STEM/maker (primary)
4. **Middle/high STEM/maker/shop/art** teachers (secondary — campers stay K–6, but staff can come from grades 6–12)

### UI

- **Filter bar** — city, fit-score range, tag, enrichment status, search.
- **Find Prospects modal** — calls \`fetch-teacher-prospects\` (Apify Google-Maps actor over schools in the target city).
- **Outreach Intelligence panel** — best send-time, recommended channel, draft message template per selection.
- **Prospect table** — name, school, city, masked email, LinkedIn, Fit Score, tag, enrichment status, Promote.
- **Bulk action bar** — bulk-promote, bulk-tag, export.
- **Detail panel** — full profile (bio, contact, school, signals, activity log).

### Fit Score (0–100)

Computed in \`src/utils/fitScore.ts\`. Inputs: grade match (K–6 heavy weighting), teacher type, summer availability heuristic, subject match for Segment 4.

### Promote → Candidate Pipeline

Clicking **Promote** creates a row in \`candidates\` at the **New Lead** stage. (UI exists; end-to-end wiring with FKs back to \`public_schools\` / \`us_cities_scored\` is OPEN_TASKS B3.)

### Today's limitation

Apify-only data. Apollo, purchased vendor lists, and DonorsChoose are not yet wired (blocked on Brett's sourcing decision). \`teacher_prospects_master\` table not yet built (Task #0 / B1).

---

## 8. Feature 3 — Email Outreach

**Purpose:** maintain Neuron Garage's owned teacher recruiting database **and** run AI-personalized outbound campaigns to that database via **SmartLead** (Kaylie's branding: "Integral Leads"). End-to-end live as of May 21, 2026.

> ⚠️ **Current phase: mailbox WARM-UP.** SmartLead is sending to internal staff + a warm-up pool to season our domains. **No teachers are being emailed yet.** The Email Outreach UI is phase-aware (see *Scope Switcher* below) so warm-up traffic is never confused with live teacher outreach. Live outreach is days-to-weeks away and is gated on (a) warm-up completion and (b) the \`{{unsubscribe}}\` merge tag landing in the sequence body (CAN-SPAM).

### v1.2/v1.3 architecture — two pools

Email Outreach treats the teacher database as **two pools** with a single scope toggle at the top of the page:

| Pool | What it is |
|---|---|
| **Master Teacher DB (MTDB)** | The full \`teacher_prospects\` table. CSVs land here first, with **no SmartLead API cost**. This is Neuron Garage's owned recruiting asset. |
| **SmartLead** | The subset of MTDB leads currently loaded into a SmartLead campaign for outreach. (In the warm-up phase, this represents test/plumbing pushes only.) |

\`ScopeSwitcher\` (top of \`/email-outreach\`) gates which page sections render and which dataset the 6-card \`StatStripCards\` strip describes (Total Contacts, With Email, Verified, Catch-All, Invalid, No Email Found). Every card has a **Show Formula** popover (Rule 1) revealing the exact filter. A third pill, **Live Outreach**, is rendered disabled with "Not started" until the \`SMARTLEAD_PHASE\` flag flips from \`"warmup"\` to \`"live"\`; while in warm-up, the SmartLead pill itself is relabeled **Warm-Up** with an amber theme and a banner above the stat strip stating that the numbers reflect mailbox warming, not teacher outreach.

### Page layout

\`EmailOutreachV2.tsx\` — scope-aware single page. Top-right buttons: **Import to Master Pool** (primary), **Import to SmartLead (Legacy)**, **New Campaign**, **CSV**, **Refresh**.

| Panel | Pool | Purpose |
|---|---|---|
| **MasterPoolImportWizard** | Master | 4-step CSV ingest with AI column mapping (see below). |
| **PushToSmartLeadBanner / Modal** | Master | One-click "push N verified leads to SmartLead" with live dry-run preview. |
| **ProspectBatchesPanel** | Master | Recent imports, color-coded by \`destination\` (master-only / master + SmartLead / legacy). |
| **EnrichmentJobsPanel** | Both | Per-city email/contact enrichment runs across providers (Apollo / SmartLead / future Hunter). Cost + status. |
| **SmartLeadConnectionPanel** | SmartLead | API-key status, last successful API call, 24-hour webhook activity. |
| **SmartLeadCampaignsPanel** | SmartLead | Lists campaigns from \`campaign_cache\`; click for status / lead counts / schedule. |
| **AnalyticsPanel** | SmartLead | Single \`GET /analytics/overview\` call (per-campaign fallback only) to respect 10 req / 2 s. |
| **ReplyTriagePanel** | SmartLead | 7-bucket reply queue with category-driven actions (Promote / Reply needed / Snooze / Suppress). |
| **OutreachQueuePanel** | SmartLead | Per-teacher push status (\`queued\` / \`assigned\` / \`sending\` / \`sent\` / \`failed\`) with retry. |
| **EmailAccountsPanel** | SmartLead | Connected mailboxes from \`GET /email-accounts\`. |

### Master Pool Import Wizard (new in v1.2)

\`MasterPoolImportWizard.tsx\` — 4 steps:

1. **Setup** — pick \`destination\` (\`master_only\` or \`master_and_smartlead\`); optional default city/state for rows missing geography.
2. **Map** — upload CSV; \`csv-suggest-mapping\` edge function calls Lovable AI (\`google/gemini-3-flash-preview\`) with the headers + sample rows and returns a suggested source→target map. User can override any row; unmapped columns are stashed in \`teacher_prospects.raw\`.
3. **QA preview** — live counts: valid emails, in-batch duplicates (via generated \`dedupe_key\`), cross-batch duplicates already in MTDB, and rows that will be skipped for missing required fields.
4. **Import** — chunked 500/insert into \`teacher_prospects\`, stamped with a new \`teacher_import_batches.id\` (\`destination\`, \`column_mapping\`, \`unmapped_columns\` recorded). If \`master_and_smartlead\` was chosen, verified leads are immediately handed to \`smartlead-push-leads\` against a chosen campaign.

### Push to SmartLead (new in v1.2)

\`PushToSmartLeadBanner\` + \`PushToSmartLeadModal\` (Master scope only):

- Banner shows "N verified emails ready to push" and opens the modal.
- Modal: campaign picker (from \`campaign_cache\`), state/city filter, include-catch-all toggle, lead limit.
- **Live dry-run preview** — debounced (400 ms), re-runs \`smartlead-push-leads { dry_run: true }\` on filter change. Returns candidate count, already-in-campaign count (joined via \`outreach_queue\`), and the "will push N" count.
- **Push** — chunked 100/batch to \`POST /campaigns/{id}/leads\`. Writes one \`outreach_queue\` row per success (\`smartlead_lead_id\`, \`pushed_at\`) **and** stamps the source \`teacher_prospects\` row with \`status='in_smartlead'\` + \`last_pushed_at\` so the Master Pool view can filter on push state without re-joining \`outreach_queue\`.

### Legacy Import Leads wizard (kept, to be retired)

\`ImportLeadsWizard.tsx\` — 4-step direct-to-SmartLead path that bypasses MTDB. Source → field mapping → QA staging into \`prospects_staging\` → bulk push to a SmartLead campaign. Preserved for backwards compatibility; will be retired once Teacher Search → MTDB handoff is in daily use (deferred to v1.3).

### New Campaign drawer

\`NewCampaignDrawer.tsx\` calls \`POST /campaigns/create\`. **Important:** SmartLead's \`track_settings\` is a NEGATIVE list — the UI emits \`DONT_TRACK_EMAIL_OPEN\`, \`DONT_TRACK_LINK_CLICK\`, \`DONT_TRACK_REPLY_TO_AN_EMAIL\` when toggles are off. Default name auto-fills as \`Outreach · MMM-DD · HH:mm TZ · vN\`. **Test Mode** swaps the recipient list (TO) with the logged-in user's email and prefixes the campaign name \`[TEST]\`. Min gap between emails is enforced at 3 minutes (SmartLead schedule rejects values < 3).

### Reply classifier — 7 buckets (replaces v1.1 HOT/NOT/OOO/NEUTRAL)

SmartLead POSTs to \`smartlead-webhook\` (\`EMAIL_SENT\`, \`EMAIL_OPENED\`, \`EMAIL_CLICKED\`, \`EMAIL_REPLIED\`, \`EMAIL_BOUNCED\`). Replies are classified via regex pre-pass → Lovable AI (\`google/gemini-2.5-flash-lite\`) fallback. Each row stores the bucket, a one-line reason, and a confidence score (0–1).

| Bucket | Color | Default action (queue) |
|---|---|---|
| 🟢 \`INTERESTED\` | green | Promote to Pipeline (creates \`candidates\` row at "New Lead") if confidence ≥ 0.7 |
| 🟢 \`MEETING_REQUEST\` | green | Promote to Pipeline if confidence ≥ 0.7 |
| 🟡 \`INFO_REQUEST\` | yellow | Reply needed (no promote) |
| 🟠 \`SOFT_NO\` | orange | Snooze 6mo (sets \`outreach_queue.snoozed_until\`) |
| 🟠 \`WRONG_PERSON\` | orange | Capture referral |
| 🔴 \`NOT_INTERESTED\` | red | Read-only |
| ⚪ \`OOO\` | gray | Read-only |

A \`⋯\` menu on every row exposes Manual Promote / Snooze 3mo / 6mo / Suppress regardless of category. Legacy \`HOT\`/\`NEUTRAL\` rows were backfilled (\`HOT→INTERESTED\`, \`NEUTRAL→INFO_REQUEST @ 0.3\`). Postgres realtime → Reply Triage panel + Outreach Queue update without refresh.

### Outreach Queue (per-teacher lifecycle)

\`OutreachQueuePanel.tsx\` reads \`outreach_queue\` (any rows added via Teacher Search → Add to Campaign, or via the Push to SmartLead modal). Each row carries a lifecycle \`state\`: \`queued\` → \`assigned\` → \`sending\` → \`sent\` (\`smartlead_lead_id\` + \`pushed_at\` stored) or \`failed\` (\`last_error\` stored). Invalid-campaign guard: rows pointing at a synthetic campaign id render a red "invalid — reassign" pill and Push is blocked.

### AI personalization

Email body generation runs through the Lovable AI Gateway (\`LOVABLE_API_KEY\`). Today: Gemini 2.5 Flash for fast tasks, GPT-5 Mini for nuance.

### Known caveats

- **Open Rate inflation:** Gmail's image proxy and Apple Mail Privacy Protection pre-fetch tracking pixels on delivery, inflating open rate to ~100% on those inboxes. Trust **clicks** and **replies** as real engagement.
- **\`{{unsubscribe}}\` merge tag** is not yet in the sequence body (OPEN_TASKS 17f). Real teacher sends should not launch until this lands (CAN-SPAM).

### Next link

**Task #18** (Teacher → Lead conversion) connects Teacher Search's Promote action to the MTDB → SmartLead push pipeline, and auto-creates a Candidate row when a reply classifies as \`INTERESTED\` or \`MEETING_REQUEST\` at confidence ≥ 0.7.

---

## 9. Feature 4 — Candidate Pipeline

**Purpose:** move candidates through a structured 7-stage qualification flow.

### Stages

1. New Lead
2. Initial Qualification
3. Business Overview
4. FDD Review
5. Immersion (Selection Committee votes)
6. Confirmation
7. Signing

Plus a parallel **Disqualified** column.

### Board behavior

- Kanban with horizontal scroll on small screens; "Jump to" pill nav above the board.
- Pipeline Analytics bar above the board (count per stage, conversion rates).
- Each card: name, fit score, days in stage, last activity, owner.

### Detail panel (sheet)

- **Overview** — contact, source, fit score, deal owner.
- **Qualification** — six 1–5 star ratings (capital, motivation, market knowledge, time commitment, leadership, culture fit) with auto-calc composite stored in \`candidate_qualification\`.
- **Notes & Activity** — chronological log; add a note inline.
- **Homework** — trial-close checklist (territory selected, financing in place, family aligned, etc.).
- **Selection Committee** (Immersion only) — three named members, each casts Approve / Decline.
- **Confirmation checklist** — auto-seeded by DB trigger \`trg_seed_confirmation_checklist\` when stage = \`confirmation\`.
- **Stage History** — every transition with notes (\`candidate_stage_history\`).

### Confirmation Gate (locked)

A candidate **cannot** drop into "Signing" without passing "Confirmation". Hardcoded — do not change.

### Signing → Onboarding handoff *(Phase 2)*

The handoff from a "Signing" card into the Onboarding flow is deferred to Phase 2 and intentionally not specified here.

### Today's limitation

Candidates are placeholder data. Teacher → Candidate promotion path exists in UI but is not wired end-to-end (Task #18).

---

## 10. Authentication

- **Email + password only.** Google / Microsoft / SSO buttons intentionally removed from \`/auth\` — do not re-add.
- **HIBP leaked-password check is OFF** (\`password_hibp_enabled: false\`) so users can pick any password meeting length rules.
- **Email auto-confirm is OFF** — new users must verify their email before sign-in.
- New users land with the \`manager\` role via the \`handle_new_user\` trigger, which also creates a row in \`profiles\`.
- The \`admin\` role is grant-only and required to mutate \`user_roles\`.
- Admin user provisioning goes through the \`admin-create-user\` edge function.

---

## 11. Guided Tour

First-time visitors see a Driver.js tour that highlights each main sidebar item. Ends with a "You're all set" panel that deep-links to City Search.

- Auto-runs on first visit; persists completion in \`localStorage\` under \`ng:tour-completed-v1\`.
- Restartable any time via the **?** icon in the top-right header.

---

## 12. Design System

### Brand colors

- **Primary navy** \`#003c7e\` — sidebar, headings, primary text.
- **Accent blue** \`#0757ff\` / \`#1f5bff\` — active nav, primary CTAs.
- **Accent orange** \`#fd7e14\` — secondary CTAs, progress bars.
- **Success teal** \`#20c997\` · **Warning amber** \`#ffc107\` · **Danger red** \`#dc3545\`.
- **Reply intent chips** — HOT green, NOT_INTERESTED gray, OOO blue, NEUTRAL yellow.
- **Neutrals** — backgrounds \`#f2f4f6\` / \`#f8f9fa\`, borders \`#dee2e6\` / \`#eef2f7\`, body text \`#343a40\`, muted \`#6c757d\`.

All colors are tokenized as HSL CSS variables in \`src/index.css\` and \`tailwind.config.ts\`.

### Typography & spacing

- System sans-serif font stack via Tailwind defaults.
- 8-pt spacing grid; \`rounded-lg\` (8 px) on cards; subtle \`shadow-sm\` elevation.

### Components

shadcn/ui on top of Radix primitives — Sheet, Dialog, Tabs, Table, Select, Toast, Tooltip, Progress, Sidebar, etc.

### Responsiveness

Mobile-first; tested at 320, 375, 414, 768, 1024, 1280+. Tables scroll horizontally on narrow viewports; drawers go full-width below the \`sm\` breakpoint.

---

## 13. Data Model

All tables have RLS enabled.

### Cities & market data

- \`us_cities_scored\` — **national seed table** (948 cities). Pre-computed \`composite_score_default\` + columns backing the 12 live SOW metrics. Cached school counts (\`public_school_count\`, \`public_elementary_count\`, \`public_school_enrollment\`, \`public_elementary_enrollment\`, \`private_elementary_count\`, \`private_elementary_enrollment\`) + climate columns. (Some vestigial columns from the old "46 metrics" era remain physically present; they're not read by the scoring engine.)
- \`public_schools\` — one row per NCES open public K–12 school nationally (PK \`nces_id\`). 38,196 rows across 948 cities. \`is_elementary_serving\` is a generated column (\`lowest_grade_offered ≤ 5\`). FK \`us_cities_scored_id\`. **Source of truth** for school-level data.
- \`cities\` — legacy per-city table (City Search UI still reads this; consolidation tracked as B5).
- \`city_category_scores\` — per-category SOW scores.
- \`city_market_signals\` — every SOW evidence row (\`signal_key, label, value, delta, source, source_url, confidence, raw_data\`). Drives "Show Formula".
- \`city_competitors\` — Apify-scraped competitor records.
- \`city_fetch_jobs\` — audit trail of every edge-function refresh.
- \`us_cities_geo\` — reference table (lat/lng/pop), read-only.
- \`custom_criteria\` — user-defined extra scoring criteria.
- \`scoring_config\` — per-user master-weight preset.
- \`saved_searches\` — per-user saved \`master_weights\` + \`sub_weights\` jsonb.
- \`watchlist_items\` — per-user Favorites (cities).

### Teachers & candidates

- \`teacher_prospects\` — \`city, state, school, fit_score, status, apify_run_id, teacher_type (active|retired|camp_enrichment), subject, segment, linkedin_url, donorschoose_id, enrichment_source, last_enriched_at\`. FKs \`school_nces_id\` → \`public_schools\`, \`us_cities_scored_id\` → \`us_cities_scored\`.
- \`teacher_prospects_master\` — **planned** master multi-source teacher pool (Task #0 / B1).
- \`candidates\` — \`first_name, last_name, email, phone, city, state, current_stage, fit_score, fit_tag, assigned_to\`.
- \`candidate_profiles\` — motivation, background, liquid capital, net worth, timeline, partner involvement, location preferences.
- \`candidate_qualification\` — 5 sub-scores (financial / leadership / teaching / culture / market) + composite.
- \`candidate_stage_history\` — every transition with notes.
- \`candidate_votes\` — Selection Committee rows.
- \`candidate_checklist_items\` — per-stage checklist (auto-seeded for Confirmation via trigger).

### Email Outreach (SmartLead)

- \`teacher_prospects\` *(Master Teacher DB — see §13.2 Teachers)* — extended in v1.2 with \`status\` (\`new\` | \`in_smartlead\` | \`suppressed\` | ...), \`last_pushed_at\`, \`needs_email_enrichment\`, \`verification_status\` (\`valid\` | \`catch_all\` | \`invalid\` | null), \`dedupe_key\` (generated), \`raw\` (jsonb of unmapped CSV columns), \`teacher_import_batch_id\` (FK).
- \`teacher_import_batches\` — one row per CSV import. Columns: \`source\`, \`destination\` (\`master_only\` | \`master_and_smartlead\` | \`legacy\`), \`row_count\`, \`column_mapping\` (jsonb), \`unmapped_columns\` (jsonb), \`created_by\`, \`created_at\`.
- \`outreach_queue\` — per-teacher SmartLead push lifecycle (\`state\`: \`queued\` | \`assigned\` | \`sending\` | \`sent\` | \`failed\` | \`promoted\`, \`smartlead_lead_id\`, \`smartlead_campaign_id\`, \`pushed_at\`, \`last_error\`, \`snoozed_until\`, \`reply_intent_overridden_by\`).
- \`enrichment_jobs\` — per-city email/contact enrichment runs (\`provider\`, \`city\`, \`state\`, \`requested\`, \`succeeded\`, \`failed\`, \`cost_usd\`, \`status\`, \`finished_at\`).
- \`smartlead_events\` — webhook event log (\`event_type, campaign_id, lead_email, payload jsonb, reply_intent, reply_category, reply_confidence, reply_reason\`). Realtime-enabled.
- \`campaign_cache\` — local mirror of SmartLead campaigns.
- \`prospects_staging\` — legacy import-wizard staging (\`batch_id, source, qa_status, smartlead_lead_id, pushed_at\`). Retiring once the legacy Import Leads wizard is removed.

### Auth


- \`profiles\` — mirror of \`auth.users\` (email, full_name).
- \`user_roles\` — \`(user_id, role)\` with \`app_role\` enum.

### DB functions & triggers

\`handle_new_user\`, \`has_role\`, \`update_updated_at_column\`, \`fill_city_coords\`, \`seed_confirmation_checklist\`, \`trg_seed_confirmation_checklist\`.

---

## 14. Tech Stack

- **React 18** + **TypeScript 5** + **Vite 5**
- **Tailwind CSS v3** + **shadcn/ui** + **Radix UI**
- **React Router v6** for routing
- **TanStack Query** for server-state caching
- **Zustand** for client-side stores (city scoring, teacher prospects, candidate pipeline)
- **Driver.js** for the guided tour
- **Sonner** + shadcn Toaster for notifications
- **Lucide** icon set
- **Vitest** for unit tests
- **Lovable Cloud** (managed Supabase) — Postgres, Auth, Storage, Edge Functions, Realtime

---

## 15. Backend & Edge Functions

All deployed as Deno edge functions under \`supabase/functions/\`.

| Function | Purpose |
|---|---|
| \`admin-create-user\` | Admin-only user provisioning |
| \`ai-city-query\` | Lovable AI Gateway proxy for the "Ask AI" bar |
| \`fetch-city-market-data\` | Legacy live city refresh |
| \`fetch-city-market-data-sow\` | Official SOW refresh (12 live metrics across Demand / CSI / TAM Teachers); writes \`city_market_signals\`, recomputes scores |
| \`fetch-school-counts\` | NCES CCD public-elementary counts per city |
| \`seed-cities-database\` | Bulk seed of \`us_cities_scored\` (Census/BLS/BEA/FRED/NCES) **and** per-school upsert into \`public_schools\` from the same NCES response |
| \`seed-cities-weather\` | Open-Meteo Historical Weather seed into \`us_cities_scored\` |
| \`backfill-public-schools\` | Full-rebuild iterator for \`public_schools\` |
| \`enrich-school-staff\` | Staff/teacher enrichment for a given school (Firecrawl + Apify) |
| \`fetch-teacher-prospects\` | Apify-driven teacher prospect pull per city |
| \`smartlead-proxy\` | Server-side proxy to the SmartLead REST API (campaigns, lead push, analytics, email accounts, health check). Respects 10 req / 2 s rate limit |
| \`smartlead-webhook\` | Public webhook receiver for SmartLead events; writes \`smartlead_events\` and runs the 7-bucket reply classifier (regex pre-pass → \`google/gemini-2.5-flash-lite\` fallback) |
| \`smartlead-push-leads\` | Pushes verified Master Pool leads to a SmartLead campaign. Supports \`dry_run\` (used by the live filter preview in PushToSmartLeadModal). Stamps \`teacher_prospects.status='in_smartlead'\` + \`last_pushed_at\` and writes \`outreach_queue\` rows on success. |
| \`csv-suggest-mapping\` | AI-powered CSV header → MTDB column mapper used by the Master Pool Import Wizard. Calls Lovable AI (\`google/gemini-3-flash-preview\`). |

Shared modules: \`_shared/cityGeo.ts\`, \`_shared/metricFetchers.ts\`, \`_shared/scoring.ts\` (category-blend fallback when a category has fewer than 3 usable metrics).

---

## 16. Third-Party APIs

Full reference: see the **APIs & Data Sources** page in the sidebar. Live wired today:

| Provider | Purpose | Secret |
|---|---|---|
| US Census ACS | Population, children, income, density | \`CENSUS_API_KEY\` |
| BLS | STEM jobs, labor force | \`BLS_API_KEY\` |
| BEA | Regional income | \`BEA_API_KEY\` |
| FRED | Median income, COLI | _public_ |
| NCES CCD (Urban Institute) | Public-school records | _public_ |
| NCES PSS (embedded Excel) | Private elementary counts | _static lookup_ |
| Open-Meteo Historical | Climate signals | _public_ |
| Apify Google Maps actor | Competitor + teacher scraping | \`APIFY_API_TOKEN\`, \`APIFY_GOOGLE_MAPS_ACTOR_ID\` |
| Firecrawl | Web scraping / enrichment | \`FIRECRAWL_API_KEY\` |
| Lovable AI Gateway | In-app AI (fit narratives, email body, Ask AI) | \`LOVABLE_API_KEY\` |
| SmartLead ("Integral Leads") | Outbound email | \`SMARTLEAD_API_KEY\` |
| Supabase (Lovable Cloud) | DB / Auth / Edge / Storage / Realtime | \`SUPABASE_*\` |

Pending / blocked: **GreatSchools** (waiting on Brett's key — 14-day-trial strategy), **Apollo** / **DonorsChoose** / **Clay** (awaiting Brett's teacher-sourcing decision).

---

## 17. Future Work

Highlights of remaining work:

- **Task #0** — \`teacher_prospects_master\` table + initial seed (BLOCKER for Teacher Search v2).
- **Task #11** — Wire GreatSchools API once key is provided (trial-then-cancel strategy, $0 cost).
- **Task #18** — Teacher → Lead conversion: Teacher Search Promote → SmartLead campaign push; \`reply_intent = HOT\` auto-creates a Candidate at "New Lead". Paused pending Teacher Search data-layer readiness.
- **Task #19** — Replace placeholder candidates with real leads from Email Outreach.
- **Task #20** — PDF export of candidate lead sheet.
- **Task #21** — Email Outreach production hardening: AI-powered reply classifier (replace keyword heuristic), per-user inbox assignment, A/B testing UI, bounce/unsubscribe automation.
- **Data-layer follow-ups (B-series)** — \`teacher_prospects_master\`, candidate FK backfill, \`cities\` ↔ \`us_cities_scored\` consolidation, Apify nationwide competitor scrape, BLS OEWS metro wages, NCES PSS full re-pull.

Explicitly out of scope: Google / Microsoft / SSO login, multi-tenancy, mobile app, public franchisee portal, e-signature via DocuSign.

---

*End of specification.*
`;
