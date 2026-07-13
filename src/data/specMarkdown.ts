// Markdown source of the Product Specification.
// Rendered inline on /spec AND downloaded verbatim by the "Download Markdown"
// button on that page. Editing this constant updates both surfaces.

export const SPEC_MARKDOWN = `# Neuron Garage Franchise Acquisition System — Product Specification

> Detailed specification of the Neuron Garage Franchise Acquisition System.
> **Document version 1.4 · Updated May 31, 2026** · For internal review.
> Live URL: neuron-garage-franchise.lovable.app
> **What's new since v1.3:** see §18 Recent Changes for the v1.3 → v1.4 delta. Highlights: Neuron AI global assistant (⌘K), header-bell notifications, Database Health & Observability surface, Candidate Pipeline Documents tab + compliance + score-override + 16-day FDD gate, transactional email infrastructure, Manus CSI v2 upload, recomputed "one calibrated number everywhere" rule, Phase 2 cabinet at \`.lovable/phase-2/\`.

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
12. [Neuron AI — Global Assistant](#12-neuron-ai--global-assistant)
13. [Notifications (Header Bell)](#13-notifications-header-bell)
14. [Database Health & Observability](#14-database-health--observability)
15. [In-App Reference Docs](#15-in-app-reference-docs)
16. [Design System](#16-design-system)
17. [Data Model](#17-data-model)
18. [Tech Stack](#18-tech-stack)
19. [Backend & Edge Functions](#19-backend--edge-functions)
20. [Third-Party APIs](#20-third-party-apis)
21. [Phase 2 Roadmap](#21-phase-2-roadmap)
22. [Recent Changes (v1.3 → v1.4)](#22-recent-changes-v13--v14)

---

## 1. Overview

**Neuron Garage Franchise Acquisition System** is an internal tool for the Neuron Garage franchise-development team. It is **not public-facing**. The system helps the team:

- Identify the best U.S. markets for new franchises (**City Search**).
- Source K–6, retired, camp/enrichment, and secondary STEM/maker teachers as candidate franchisees (**Teacher Search**).
- Run AI-personalized outbound email campaigns via SmartLead, with live reply tracking (**Email Outreach**).
- Qualify candidates through a structured 7-stage Kanban pipeline (**Candidate Pipeline**).
- Drive everything from a single **Neuron AI** ⌘K assistant available on every screen (§12).

> **Phase 2 (in planning, source of truth = \`.lovable/phase-2/\`):** 9-item SOW covering Market Validation 1A, Site Analysis 1B, Candidate portal, Teacher Search 1.5, SmartLead 1.5, Mailboxes, Video Training module, and the Manus CSI app. Onboarding (7-step franchisee launch program) code and the \`/onboarding\` route exist but remain out of scope for Phase 1 production use.

The product is a React + TypeScript single-page app, backed by Lovable Cloud (managed Supabase: Postgres + Auth + Edge Functions + Storage + Realtime).

### Key numbers (May 31, 2026)

- **817 U.S. cities** pre-scored in \`us_cities_scored\` (population ≥ 50,000).
- **38,196 public K–12 schools** in \`public_schools\` (NCES CCD).
- **12 live SOW metrics** across 3 categories (Demand · Operator & Venue Supply · Competitive Opportunity).
- **30 deployed edge functions** (§19).

### Goals

- Replace ad-hoc spreadsheets and email threads with a single source of truth.
- Use scoring + AI assists to focus the team on the highest-value cities and prospects.
- Make every stage observable, accountable, and time-bound.
- **Show the math.** Every calculated number exposes its inputs, weights, and formula via a "Show Formula" affordance — non-negotiable.
- **One calibrated number everywhere.** Every surface (table row, score popover, market detail, compare modal, exports) reads pillar + composite scores from the same recomputed helper (\`src/lib/recomputedPillars.ts\` / \`src/lib/marketView.ts\`) — never from stale DB-stored values.

### Non-Goals

- No payment processing or contract execution; e-sign is represented as a status only.
- No public-facing franchisee portal.
- No multi-tenancy or mobile app.
- No Google / Microsoft / SSO sign-in (intentionally removed — email-only).

---

## 2. Users & Roles

Current build assumes one role: **Franchise Development Rep** (\`manager\`). \`admin\` exists for user-management actions.

- **\`manager\`** — default role for every new user. Read/write access to cities, teachers, candidates, email outreach.
- **\`admin\`** — required to write to \`user_roles\`. Manually granted; not handed out automatically. Required to view the \`/db-health\` operational surface and admin-only Neuron AI actions.

Roles are stored in a dedicated \`user_roles\` table with an \`app_role\` enum and a \`has_role()\` security-definer function so RLS policies never recurse.

Future roles to consider: FD Manager, Selection Committee Member, external Franchisee (read-only).

---

## 3. End-to-End Journey

The product follows a left-to-right funnel reflected in the sidebar order:

\`\`\`
Dashboard → City Search → Teacher Search → Email Outreach → Candidate Pipeline
\`\`\`

Cross-cutting surfaces (Neuron AI, Notifications, DB Health, Reference Docs) sit on top of every funnel screen.

---

## 4. Navigation & Layout

\`AppLayout\` wraps the routed view with:

- **\`AppSidebar\`** — collapsible left sidebar. Top section: the 5 funnel destinations. Below: Methodology & Docs group (Scoring Method, Demographics Methodology, APIs & Data Sources, System Overview, Prompts & AI Workflows, Guardrails, Observability Spec/Guide, Email Outreach Docs, SmartLead Spec, User Guide, Handover, Full Spec). Below that: Team Members and Database Health (admin only).
- **\`PageHeader\`** — sticky top bar on every page. Carries the page title, the **Neuron AI** ⌘K trigger, the **Notifications header bell** (unread badge capped at "9+"), the **?** tour restart button, the user menu (Settings / Sign out), and a **GlobalSearch** field.
- **\`JourneyBar\`** — secondary nav under the header on funnel screens, showing the user's current step.
- **City Search override** — uses its own \`CityTopBar\` instead of the generic header for the screen-specific Ask AI bar, but still mounts the notifications bell.

Mobile (< sm): sidebar collapses to an icon rail; drawers go full-width.

---

## 5. Dashboard

\`src/pages/Index.tsx\`. Snapshot tiles + quick links:

- **City Search tile** — total cities (817), A-tier count, average composite.
- **Teacher Search tile** — total prospects, verified-email count. (The "need enrichment" line was retired on 2026-05-25.)
- **Email Outreach tile** — current SmartLead phase (warm-up / live), 24-h delivered / replies.
- **Candidate Pipeline tile** — open candidates by stage, FDD countdowns nearing the 16-day gate.
- **Quick Actions** — Import CSV, New Campaign, Promote Lead, Open Neuron AI.

---

## 6. Feature 1 — City Search

**Purpose:** rank U.S. cities by their suitability for a new Neuron Garage franchise.

### National seed table

\`us_cities_scored\` is seeded with **817 U.S. cities** (population ≥ 50,000), all carrying a pre-computed \`composite_score_default\` so the national ranking is instant — no live API call at query time. Refreshed by scheduled background jobs (\`seed-cities-database\`, \`recompute-city-derived\`), not per-user clicks.

### Scoring model (12 metrics across 3 categories)

> Live source of truth: \`src/lib/sowMetricRegistry.ts\`. The earlier "46 metrics / 6 categories" language is historical — most of that list was never wired. Final 6→3 category reshape: May 21, 2026.

| Category | Sub-metrics | Master slider |
|---|---|---|
| Demand | 4 (Census ACS) | adjustable, auto-rebalances |
| Operator & Venue Supply | 5 (NCES + BLS/BEA) | adjustable, auto-rebalances |
| Competitive Opportunity (CSI) | 3 (Manus v2, read-only) | adjustable, auto-rebalances |

**Math** (computed client-side in \`src/lib/clientSubWeightScoring.ts\`):

\`\`\`
metric_normalized = sowNormalize(raw_value, metric_definition)    // 0–100
sub_share_i       = sub_weight_i / Σ(enabled sub_weights in category)
category_score    = Σ( sub_share_i × metric_normalized_i ) × 100
master_share_c    = master_weight_c / Σ(master_weights)
composite         = Σ( master_share_c × category_score_c )        // 0–100
\`\`\`

- **Master sliders auto-rebalance to 100.**
- **Sub-weights do NOT auto-rebalance** — typed as relative-importance numbers (no upper bound). Share = \`sub_i / Σ(enabled sub-weights)\`.
- Empty category falls back to the recomputed pillar helper (\`src/lib/recomputedPillars.ts\`).
- Sub-metric weights live in a per-category drawer (\`SubMetricWeightsDrawer.tsx\`); each enabled metric can be re-weighted or disabled.

### One calibrated number everywhere (Brett's rule)

Every surface — row cells, \`RowScorePopover\`, selected-market panel, compare modal, exports — reads pillar + composite scores from the **same** recomputed helper. Stale DB-stored values are never displayed. The helper takes the current user's master weights + sub-weights and replays the math each render, so changing a slider updates every surface in lockstep.

### Show Formula (non-negotiable)

Every widget with a calculated number exposes a **Show Formula** affordance that opens a raw / normalized / share / contribution table, with column tooltips, a legend, and a plain-English master-weight contribution sentence. Score changes also fire a delta toast: \`old → new\` for both the category and composite.

### Filter bar & top-level UI

- State multi-select (dynamic), tier (A/B/C/D), registration status (38 non-registration states are hard-coded), free-text search, min population, min score.
- Stat cards: total cities, A-tier count, average score, registered states.
- Sortable city table with sticky header.
- **Add to Favorites** writes to \`watchlist_items\` (single list today; multi-list deferred).
- **Save Search** persists current master + sub weights to \`saved_searches\` per user.
- **Export CSV** (toolbar) — full ranked table.
- **Ask AI** bar — natural-language query → \`ai-city-query\` edge function (Lovable AI Gateway). See "Ask AI" below.

### City Detail drawer (\`MarketDetailDrawer\`)

Row click opens a right-side sheet with:

- **Hero summary** (\`DrawerHeroSummary\`) — total composite, tier, all three pillar scores, deterministic bottom-line sentence. Numbers come from the same recomputed helper as the row.
- **Coverage panel** — 12 key metrics grouped by category (Demand · Operator & Venue Supply · Competitive Opportunity) with a "N of M seeded" header per category. Each row carries a status (live / proxy / blocked / missing), source URL, last-updated timestamp.
- **City Notes editor** (\`CityNotesEditor\`) — per-city free-text notes persisted in the database.
- **Manus-upload banner** — appears when the row was loaded from Brett's 2026-05-21 Manus CSI upload and joined on the non-canonical Census name. Tells the user the Census/NCES values live on the sibling row in \`us_cities_scored\` and have not been merged yet.
- **Find Teachers in this City** button → navigates to Teacher Search pre-filtered.
- **Generate Report** + **Export Raw Signals** (downloads the open city's evidence rows as \`{city-slug}-source-data-{date}.csv\`).

> **2026-05-21 architecture change:** the legacy \`city_market_signals\` table was severed. Live evidence rows are now **synthesized from \`us_cities_scored\` columns** by \`buildSeededFallbackSignalsFromScored()\`. The drawer is locked to the same 12-metric whitelist that powers Key Market Signals to enforce the "one calibrated number" rule.

### Ask AI (City Search)

Natural-language query → \`ai-city-query\` edge function. Behavior:

- **3-tier TAM intent rule** (locked in the system prompt):
  - **Tier 1** — "which of these markets are good for TAM" / "of these" → NO master-weight change; AI nudges teacher-supply sub-metrics +8 to +12. Never goes above 50% on the named pillar.
  - **Tier 2** — "rank by TAM" / "focus on" → TAM ~55–60%, others reduced but all > 0.
  - **Tier 3** — "only TAM" / "100% TAM" / "ignore the rest" → TAM 100%, others 0%.
  - When in doubt, picks Tier 1.
- **Session context.** Every request sends current applied filters, current pillar weights, visible-vs-total market count, watchlist size.
- **Sub-metric boosts.** Edge function may return \`subMetricBoosts: [{ key, delta, pillar, label }]\`; frontend applies them to per-pillar sub-weights and re-normalizes so each pillar still sums to 100. This is the lever that makes Tier 1 work.
- **"Never invent a state"** — model must leave \`filters.state\` null unless the user names a US state explicitly.
- **Answer card** (\`AiAnswerCard\`): "Searched: <your query>" header in purple, the AI's plain-English summary, a "What changed: Demand 40 → 25 · Operator & Venue Supply 30 → 60 · Competitive Opportunity 30 → 15" diff line, and a reasoning panel that opens by default. Internal scoring keys (\`franchiseeSupply\`, \`competitiveLandscape\`) are never shown to the user.
- **Crash guard.** Factual queries return no \`filters\` block; the page now defaults to \`{ state: null, tier: null, minScore: null }\`.
- **0-results empty state.** When applied filters return 0 markets, the ranked list shows "0 markets match your filters. Tier: A · State: TX." with a one-click "Clear filters" button — never silently looks broken.

### Refresh Data flow (per-city, manual)

\`fetch-school-counts\` — NCES CCD refresh. Live SOW refresh is otherwise scheduled, not per-click. (The legacy \`fetch-city-market-data-sow\` path that wrote \`city_market_signals\` was retired with the table severance; \`recompute-city-derived\` is the replacement.)

### School-level source of truth

\`public_schools\` is the per-row table of every open public K–12 school nationally (38,196 rows across 817 cities, PK = \`nces_id\`). Stores name, district, address, lat/lng, grades, type, enrollment; \`is_elementary_serving\` is a generated column. Populated by \`seed-cities-database\` (same NCES response as the seed pass — no extra API calls) and \`backfill-public-schools\` (for full rebuilds). Counts on \`us_cities_scored\` are cached aggregates.

### Compare mode

Select up to 4 cities and open a side-by-side modal (\`MarketCompareModal\`). Reads scores from the same recomputed helper.

---

## 7. Feature 2 — Teacher Search

**Purpose:** discover, score, and shortlist teachers who could become franchisees.

### Target segments

\`teacher_prospects.teacher_type\` is a locked enum: \`active\` | \`retired\` | \`camp_enrichment\`. \`segment\` maps to:

1. **Active K–6** elementary teachers (primary)
2. **Retired K–6** elementary teachers (primary)
3. **Camp / enrichment** educators — summer camp, after-school STEM/maker (primary)
4. **Middle/high STEM/maker/shop/art** teachers (secondary — campers stay K–6, but staff can come from grades 6–12)

### UI (\`src/pages/TeacherProspects.tsx\`)

- **City Search Rail** — per-city facets and saved searches.
- **TeacherFilterBar** — city, fit-score range, tag, enrichment status, free-text.
- **Market Context Banner** — shows the parent city's composite + tier so the user knows whether they're prospecting a strong market.
- **Next Best Action strip** — surfaces the highest-leverage action ("Push 12 verified to SmartLead", "Enrich 38 missing emails").
- **Funnel Widget** — total → with email → verified → in SmartLead.
- **Find Prospects modal** — calls \`fetch-teacher-prospects\` (Apify Google-Maps actor over schools in the target city).
- **Teacher Import Wizard** — CSV ingest with AI column mapping.
- **Outreach Intelligence panel** — best send-time, recommended channel, draft message template per selection.
- **Prospect table** — name, school, city, masked email, LinkedIn, Fit Score, tag, enrichment status, Promote, Source badge.
- **Bulk Action Bar** — bulk-promote, bulk-tag, bulk-push-to-campaign, export.
- **Saved Lists menu** — per-user named lists (\`teacher_saved_lists\`).
- **Teacher AI Panel** — sidekick assistant scoped to the current filter (\`teacher-search-ai\` edge function).
- **Detail panel** — full profile (bio, contact, school, signals, activity log).

### Fit Score (0–100)

Computed in \`src/utils/fitScore.ts\`. Inputs: grade match (K–6 heavy weighting), teacher type, summer availability heuristic, subject match for Segment 4.

### Promote → Candidate Pipeline

Clicking **Promote** creates a row in \`candidates\` at the **New Lead** stage. (UI exists; end-to-end wiring with FKs back to \`public_schools\` / \`us_cities_scored\` is still in progress under the Phase 2 plan.)

### Today's limitation

Apify is the primary scraping source. Apollo and purchased vendor lists are not yet wired (Phase 2 decision pending). \`teacher_prospects_master\` (a planned multi-source pool) is not yet built.

---

## 8. Feature 3 — Email Outreach

**Purpose:** maintain Neuron Garage's owned teacher recruiting database **and** run AI-personalized outbound campaigns to that database via **SmartLead** (Kaylie's branding: "Integral Leads"). End-to-end live since May 21, 2026.

> ⚠️ **Current phase: mailbox WARM-UP.** SmartLead is sending to internal staff + a warm-up pool to season our domains. **No teachers are being emailed yet.** The Email Outreach UI is phase-aware so warm-up traffic is never confused with live teacher outreach. Live outreach is gated on (a) warm-up completion and (b) the \`{{unsubscribe}}\` merge tag landing in the sequence body (CAN-SPAM).

### Two-pool architecture (v1.2/v1.3)

| Pool | What it is |
|---|---|
| **Master Teacher DB (MTDB)** | The full \`teacher_prospects\` table. CSVs land here first, with no SmartLead API cost. Neuron Garage's owned recruiting asset. |
| **SmartLead** | The subset of MTDB leads currently loaded into a SmartLead campaign for outreach. In warm-up phase, this represents test/plumbing pushes only. |

\`ScopeSwitcher\` gates which sections render. \`StatStripCards\` shows 6 stats (Total Contacts, With Email, Verified, Catch-All, Invalid, No Email Found), each with a Show-Formula popover. The third pill — **Live Outreach** — is rendered disabled with "Not started" until the \`SMARTLEAD_PHASE\` flag flips from \`"warmup"\` to \`"live"\`. While in warm-up, the SmartLead pill is relabeled **Warm-Up** with an amber theme + banner.

### Page layout (\`EmailOutreachV2.tsx\`)

Top-right buttons: **Import to Master Pool** (primary), **Import to SmartLead (Legacy)**, **New Campaign**, **CSV**, **Refresh**.

| Panel | Pool | Purpose |
|---|---|---|
| MasterPoolImportWizard | Master | 4-step CSV ingest with AI column mapping |
| PushToSmartLeadBanner / Modal | Master | One-click "push N verified leads to SmartLead" with live dry-run preview |
| ProspectBatchesPanel | Master | Recent imports, color-coded by \`destination\` |
| EnrichmentJobsPanel | Both | Per-city email/contact enrichment runs (Apollo / SmartLead / future Hunter). Cost + status |
| SmartLeadConnectionPanel | SmartLead | API-key status, last successful call, 24-h webhook activity |
| SmartLeadCampaignsPanel | SmartLead | Campaigns from \`campaign_cache\` |
| AnalyticsPanel | SmartLead | Single \`GET /analytics/overview\` call (10 req / 2 s aware) |
| ReplyTriagePanel | SmartLead | 7-bucket reply queue with category-driven actions |
| OutreachQueuePanel | SmartLead | Per-teacher push lifecycle with retry |
| EmailAccountsPanel | SmartLead | Connected mailboxes from \`GET /email-accounts\` |

### Master Pool Import Wizard

\`MasterPoolImportWizard.tsx\` — 4 steps:

1. **Setup** — pick \`destination\` (\`master_only\` or \`master_and_smartlead\`); optional default city/state.
2. **Map** — upload CSV; \`csv-suggest-mapping\` edge function calls Lovable AI (\`google/gemini-3-flash-preview\`) with the headers + sample rows. User can override any row; unmapped columns are stashed in \`teacher_prospects.raw\`.
3. **QA preview** — live counts: valid emails, in-batch duplicates (via generated \`dedupe_key\`), cross-batch duplicates already in MTDB, skipped rows.
4. **Import** — chunked 500/insert into \`teacher_prospects\`, stamped with a new \`teacher_import_batches.id\`. If \`master_and_smartlead\` was chosen, verified leads are handed to \`smartlead-push-leads\` against the chosen campaign.

### Push to SmartLead

\`PushToSmartLeadBanner\` + \`PushToSmartLeadModal\`: campaign picker, state/city filter, include-catch-all toggle, lead limit, debounced **live dry-run preview** (\`smartlead-push-leads { dry_run: true }\`). On push: chunked 100/batch to \`POST /campaigns/{id}/leads\`; writes \`outreach_queue\` rows and stamps source \`teacher_prospects\` with \`status='in_smartlead'\` + \`last_pushed_at\`.

### New Campaign drawer

\`NewCampaignDrawer.tsx\` calls \`POST /campaigns/create\`. **Important:** SmartLead's \`track_settings\` is a NEGATIVE list — the UI emits \`DONT_TRACK_EMAIL_OPEN\`, \`DONT_TRACK_LINK_CLICK\`, \`DONT_TRACK_REPLY_TO_AN_EMAIL\` when toggles are off. Default name auto-fills as \`Outreach · MMM-DD · HH:mm TZ · vN\`. **Test Mode** swaps the recipient list with the logged-in user's email and prefixes the campaign name \`[TEST]\`. Min gap between emails: 3 minutes (SmartLead schedule rejects < 3).

### Reply classifier — 7 buckets

SmartLead POSTs to \`smartlead-webhook\` (\`EMAIL_SENT\`, \`EMAIL_OPENED\`, \`EMAIL_CLICKED\`, \`EMAIL_REPLIED\`, \`EMAIL_BOUNCED\`). Replies are classified via regex pre-pass → Lovable AI (\`google/gemini-2.5-flash-lite\`) fallback. Each row stores bucket + one-line reason + confidence (0–1).

| Bucket | Color | Default action |
|---|---|---|
| INTERESTED | green | Promote to Pipeline (creates \`candidates\` at "New Lead") if confidence ≥ 0.7 |
| MEETING_REQUEST | green | Promote to Pipeline if confidence ≥ 0.7 |
| INFO_REQUEST | yellow | Reply needed |
| SOFT_NO | orange | Snooze 6mo |
| WRONG_PERSON | orange | Capture referral |
| NOT_INTERESTED | red | Read-only |
| OOO | gray | Read-only |

\`⋯\` menu on every row exposes Manual Promote / Snooze / Suppress. Legacy \`HOT\`/\`NEUTRAL\` were backfilled. Realtime → Reply Triage + Outreach Queue update without refresh.

### Outreach Queue (per-teacher lifecycle)

\`outreach_queue.state\`: \`queued\` → \`assigned\` → \`sending\` → \`sent\` (\`smartlead_lead_id\` + \`pushed_at\`) or \`failed\` (\`last_error\`). Invalid-campaign rows render a red "invalid — reassign" pill and Push is blocked.

### Transactional email infrastructure

A separate transactional rail (independent of SmartLead) handles internal notifications and digests:

- \`send-transactional-email\` — single-send entry point used by app triggers.
- \`preview-transactional-email\` — admin preview of a templated email.
- \`process-email-queue\` — drains \`enqueue_email\` → \`email_send_log\` / \`email_send_state\`.
- \`weekly-data-health-digest\` — scheduled push of DB Health digest to \`db_health_subscriptions\`.
- \`handle-email-suppression\`, \`handle-email-unsubscribe\` — public endpoints driving \`suppressed_emails\` and \`email_unsubscribe_tokens\` (\`/unsubscribe\` route).

Templates live in \`supabase/functions/_shared/transactional-email-templates/\` (React Email JSX).

### Known caveats

- **Open Rate inflation:** Gmail's image proxy and Apple Mail Privacy Protection pre-fetch tracking pixels on delivery. Trust **clicks** and **replies** as real engagement.
- **\`{{unsubscribe}}\` merge tag** is not yet in the sequence body. Real teacher sends should not launch until this lands (CAN-SPAM).

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
- Each card: name, fit score, days in stage, last activity, owner, stage-aware hover.

### Detail panel (\`CandidateDetailPanel\`)

Tabs:

- **Overview** — contact, source, fit score, deal owner, photo.
- **Lead Sheet** — full intake.
- **Qualification** — six 1–5 star ratings (capital, motivation, market knowledge, time commitment, leadership, culture fit) with auto-calc composite stored in \`candidate_qualification\`.
- **Notes & Activity** — chronological log; add a note inline.
- **Stage History** — every transition with notes (\`candidate_stage_history\`).
- **Homework** — trial-close checklist (territory selected, financing in place, family aligned, etc.).
- **Committee Votes** — Selection Committee Approve / Decline. Manual votes for members without app accounts (feature flag \`FF_MANUAL_VOTES\`).
- **Documents** (feature flag \`FF_DOCUMENTS\`) — per-candidate file dropzone backed by \`candidate_files\` + Lovable Cloud Storage.

Header carries an **Export Packet** button (\`exportResearchPacket\`) that builds a per-candidate research PDF.

### Tier-3 hardening (feature-flagged)

Registered on \`src/lib/featureFlags.ts\`. All currently ON:

- \`FF_DOCUMENTS\` — Documents tab + dropzone.
- \`FF_STEP2_UPLOADS\` — background / credit uploads at the Initial Qualification step.
- \`FF_STEP4_UPLOADS\` — immersion uploads.
- \`FF_COMPLIANCE\` — compliance audit log (\`candidate_compliance\` + \`candidate_compliance_audit\`).
- \`FF_FDD_GATE\` — **16-day FDD hard-block**: a candidate cannot leave FDD Review for Immersion until 16 calendar days have elapsed since FDD delivery (\`FddCountdown\` enforces it client-side; DB validates server-side).
- \`FF_SCORE_OVERRIDE\` — manual qualification-score override with audit trail (\`candidate_score_overrides_history\`).
- \`FF_MANUAL_VOTES\` — record committee votes for members without app accounts.

Flags flip a feature off without a code revert.

### Confirmation Gate (locked)

A candidate **cannot** drop into "Signing" without passing "Confirmation". Hardcoded — do not change.

### Signing → Onboarding handoff *(Phase 2)*

The handoff from a "Signing" card into the Onboarding flow is deferred to Phase 2.

---

## 10. Authentication

- **Email + password only.** Google / Microsoft / SSO buttons intentionally removed from \`/auth\` — do not re-add.
- **HIBP leaked-password check is OFF** (\`password_hibp_enabled: false\`).
- **Email auto-confirm is OFF** — new users must verify their email before sign-in.
- **Password reset** — \`/reset-password\` route handles the Supabase recovery link flow.
- New users land with the \`manager\` role via the \`handle_new_user\` trigger, which also creates a row in \`profiles\`.
- The \`admin\` role is grant-only and required to mutate \`user_roles\`.
- Admin user provisioning goes through the \`admin-create-user\` edge function (also exposed in \`/team-members\`).
- Routes are wrapped in \`ProtectedRoute\` which redirects unauthenticated users to \`/auth\`.

---

## 11. Guided Tour

First-time visitors see a Driver.js tour that highlights each main sidebar item. Ends with a "You're all set" panel that deep-links to City Search.

- Auto-runs on first visit; persists completion in \`localStorage\` under \`ng:tour-completed-v1\`.
- Restartable any time via the **?** icon in the top-right header.

---

## 12. Neuron AI — Global Assistant

**Purpose:** a single ⌘K assistant available on every screen. Replaces (over the next ~2 weeks) the per-screen Ask AI bars by acting as a router into them.

### Surface

- \`NeuronAiButton\` in \`PageHeader\` (and ⌘K shortcut) opens \`NeuronAiPanel\`.
- \`NeuronAiProvider\` wraps the app and supplies the session-context hook (current route, applied filters, selected entity, viewport).

### What it does (v1)

- **Answer factual questions** scoped to the current screen and the global knowledge brain.
- **Navigate + apply state** — "show me Tier A cities in Florida with TAM weight 60" routes to City Search, applies filters, sets weights.
- **Propose cheap write actions** behind a Confirm preview — watchlist add/remove, candidate stage change, queue an email, snooze a reply.
- **Ask a clarifying question** when intent is ambiguous instead of guessing.
- **Log every write** to the \`ai_action_log\` table.

### Confirmation flow

Write actions go through \`neuron-ai-confirm\` — the proposed write is rendered as a diff preview ("Will change X from A to B; will create Y") and only commits on explicit Confirm. Cancel rolls back nothing because nothing was committed.

### Knowledge brain

Co-maintained by Haseeb and Brett at \`supabase/functions/_shared/appKnowledge.ts\` (plus \`aiAssistantKB.ts\`, \`observabilityKnowledge.ts\`, \`knowledge.ts\`). Contains app purpose, the 4 funnel screens, people, glossary, data sources. Numbers in the brain are kept in sync with reality (e.g. 817 pre-scored cities, not 960).

### Cost / scope guardrails

Deferred from v1: multi-step agentic plans, deep-reasoning model calls (\`gemini-2.5-pro\`), chart/image generation, full natural-language-to-SQL. These are the "expensive" actions and are kept out until token burn is metered.

### Other AI surfaces

- **City Search Ask AI bar** — still mounted; will collapse into a single "Ask AI about this screen" button that opens Neuron AI pre-seeded.
- **City Analyst** (\`city-analyst\`) — deeper one-off briefs for a single market.
- **Ask / Ask City** (\`ask\`, \`ask-city\`) — back-ends for the legacy bars.
- **Teacher Search AI** (\`teacher-search-ai\`) — Teacher Search sidekick.
- **Users Guide AI** (\`users-guide-ai\`) — answers from the User Guide.
- **Observability AI** (\`observability-ai\`) — answers about DB health.

All routed through the Lovable AI Gateway with \`LOVABLE_API_KEY\`.

---

## 13. Notifications (Header Bell)

In-app notification bell in the top header. v1.0 = a simple popover list of the signed-in user's 20 most recent notifications, polled every 60 s, RLS-locked per user. No realtime, no email, no push. Bell badge shows real unread count, hidden at 0, capped at "9+".

### Shipped

- \`notifications\` table — \`(id, user_id, kind, title, message, link, read_at, created_at)\`. Indexes on \`(user_id, created_at desc)\` and partial unread. RLS: own-row SELECT/UPDATE/DELETE only; clients cannot INSERT (service_role only).
- \`useNotifications\` hook — \`items\`, \`unreadCount\`, \`markRead(id)\`, \`markAllRead()\`, 60 s polling.
- \`NotificationsPopover\` — header with "Mark all read", row list (unread dot, title, message, relative time), empty state.
- Bell wired into \`PageHeader\` and \`CityTopBar\`.

### Pending kinds (UI ready; insert triggers not yet wired)

- \`candidate_assigned\`, \`candidate_stage_changed\`, \`city_scoring_finished\`, \`credential_issue\`, \`system\`.

### Parked (not v1.0)

Realtime push, email/browser push, per-kind preferences, grouping, dedicated \`/notifications\` page, historical backfill.

---

## 14. Database Health & Observability

Admin-only operational surface at \`/db-health\` (\`src/pages/DbHealth.tsx\`).

### Tabs

- **Accuracy** (\`AccuracyTab\`) — per-domain accuracy scoring against benchmarks (\`db_health_history\`, \`db_health_outliers\`).
- **Alerts** (\`AlertsTab\`) — open incidents from \`db_health_incidents\` grouped by rule (\`db_health_rules\`).
- **Domain cards** — per-data-domain status pills with sparkline (\`DomainCard\`, \`Sparkline\`, \`StatusPill\`).
- **Debug footer** (\`DbDebugFooter\`) — query logger (\`queryLogger.ts\`) and friendly-error catalog (\`friendlyError.ts\`).

### Subscriptions

\`db_health_subscriptions\` drives the **Weekly Data Health Digest** delivered via \`weekly-data-health-digest\` → React Email template → \`send-transactional-email\`.

### Observability AI

\`observability-ai\` edge function powers the in-tab "Ask" experience scoped to the health dataset (knowledge: \`observabilityKnowledge.ts\`).

### Reference docs

\`/observability-spec\` and \`/observability-guide\` describe the rules and how to read the dashboards.

---

## 15. In-App Reference Docs

The sidebar's "Methodology & Docs" group exposes the reference surface:

| Route | What it is |
|---|---|
| \`/spec\` | This document. |
| \`/user-guide\` | Plain-English user guide for the team. |
| \`/handover\` | Account/credential handover sheet. |
| \`/system-overview\` | Architecture diagram + boundaries. |
| \`/scoring-method\` | City Search scoring math, end-to-end. |

| \`/demographics-methodology\` | Census / NCES sourcing decisions. |
| \`/apis-and-data-sources\` | Live registry of every API + secret. |
| \`/prompts-and-ai-workflows\` | System prompts for every AI workflow. |
| \`/guardrails\` | Hard rules the system enforces. |
| \`/email-outreach-docs\` | End-to-end outreach playbook. |
| \`/smartlead-spec\` | SmartLead integration spec. |
| \`/observability-spec\` / \`/observability-guide\` | DB Health spec + reader guide. |
| \`/team-members\` | Admin user management. |
| \`/unsubscribe\` | Public unsubscribe landing page. |

---

## 16. Design System

### Brand colors

- **Primary navy** \`#003c7e\` — sidebar, headings, primary text.
- **Accent blue** \`#0757ff\` / \`#174be8\` / \`#1f5bff\` — active nav, primary CTAs, links.
- **Accent orange** \`#fd7e14\` — secondary CTAs, progress bars.
- **Success teal** \`#20c997\` · **Warning amber** \`#ffc107\` · **Danger red** \`#dc3545\` / \`#e11d48\`.
- **City Search palette** — ink \`#07142f\`, secondary text \`#526078\`, muted \`#8893a7\`, panel surface \`#f7faff\`, border \`#eef2f7\`.
- **Reply-bucket chips** — INTERESTED/MEETING_REQUEST green, INFO_REQUEST yellow, SOFT_NO/WRONG_PERSON orange, NOT_INTERESTED red, OOO gray.
- **Neutrals** — backgrounds \`#f2f4f6\` / \`#f8f9fa\`, borders \`#dee2e6\` / \`#eef2f7\`, body text \`#343a40\`, muted \`#6c757d\`.

All colors are tokenized as HSL CSS variables in \`src/index.css\` and \`tailwind.config.ts\`.

### Typography & spacing

- System sans-serif font stack via Tailwind defaults.
- 8-pt spacing grid; \`rounded-lg\` (8 px) on cards; subtle \`shadow-sm\` elevation.

### Components

shadcn/ui on top of Radix primitives — Sheet, Dialog, Tabs, Table, Select, Toast, Tooltip, Progress, Sidebar, Popover, Command, etc.

### Responsiveness

Mobile-first; tested at 320, 375, 414, 768, 1024, 1280+. Tables scroll horizontally on narrow viewports; drawers go full-width below the \`sm\` breakpoint.

---

## 17. Data Model

All tables have RLS enabled. Source of truth = generated \`src/integrations/supabase/types.ts\`.

### Cities & market data

- \`us_cities_scored\` — **national seed table** (817 cities). Pre-computed \`composite_score_default\` + columns backing the 12 live SOW metrics. Cached school counts + climate columns. Live evidence rows for the drawer are synthesized from these columns (the legacy \`city_market_signals\` table was severed 2026-05-21).
- \`public_schools\` — one row per NCES open public K–12 school nationally (PK \`nces_id\`). 38,196 rows across 817 cities. \`is_elementary_serving\` is a generated column. **Source of truth** for school-level data.
- \`public_school_aliases\` — alias map for joining non-canonical city names.
- \`us_cities_geo\` — reference table (lat/lng/pop), read-only.
- \`city_briefs\` — generated City Analyst briefs.
- \`city_narratives\` — generated AI narrative text per city.
- \`city_data_gaps\` — evidence-gap audit per city/metric.
- \`city_seed_runs\` — audit trail of every seed/refresh pass.
- \`custom_criteria\` — user-defined extra scoring criteria.
- \`scoring_config\` — per-user master-weight preset.
- \`saved_searches\` — per-user saved \`master_weights\` + \`sub_weights\` jsonb.
- \`watchlist_items\` — per-user Favorites (cities).
- \`ask_city_conversations\` — persisted Ask AI threads scoped to a city.

### Teachers

- \`teacher_prospects\` — \`city, state, school, fit_score, status, apify_run_id, teacher_type (active|retired|camp_enrichment), subject, segment, linkedin_url, enrichment_source, last_enriched_at\`. v1.2 extensions: \`status\` (\`new\` | \`in_smartlead\` | \`suppressed\` | …), \`last_pushed_at\`, \`needs_email_enrichment\`, \`verification_status\` (\`valid\` | \`catch_all\` | \`invalid\` | null), \`dedupe_key\` (generated), \`raw\` (jsonb of unmapped CSV columns), \`teacher_import_batch_id\` (FK).
- \`teacher_prospects_cities\` — per-city aggregate snapshot.
- \`teacher_prospects_stats\` — cached counters powering the funnel widget.
- \`teacher_saved_lists\` — per-user named teacher lists.
- \`teacher_import_batches\` — one row per CSV import (\`source\`, \`destination\`, \`row_count\`, \`column_mapping\`, \`unmapped_columns\`, \`created_by\`).
- \`imports\` — generic import job audit.
- \`match_teachers_to_schools\` — DB function joining teachers to \`public_schools\`.

### Candidates

- \`candidates\` — \`first_name, last_name, email, phone, city, state, current_stage, fit_score, fit_tag, assigned_to\`.
- \`candidate_profiles\` — motivation, background, liquid capital, net worth, timeline, partner involvement, location preferences.
- \`candidate_qualification\` — 5 sub-scores (financial / leadership / teaching / culture / market) + composite.
- \`candidate_stage_history\` — every transition with notes.
- \`candidate_votes\` — Selection Committee rows.
- \`candidate_checklist_items\` — per-stage checklist (auto-seeded for Confirmation via trigger).
- \`candidate_files\` — Documents tab uploads (FF_DOCUMENTS).
- \`candidate_compliance\` + \`candidate_compliance_audit\` — compliance audit log (FF_COMPLIANCE).
- \`candidate_score_overrides_history\` — manual score-override audit (FF_SCORE_OVERRIDE).

### Onboarding (Phase 2 scaffolding present)

- \`onboarding_records\`, \`onboarding_steps\` — 7-step launch program (UI exists at \`/onboarding\`, not in Phase 1 scope).

### Email Outreach (SmartLead + transactional)

- \`outreach_queue\` — per-teacher SmartLead push lifecycle (\`state\`, \`smartlead_lead_id\`, \`smartlead_campaign_id\`, \`pushed_at\`, \`last_error\`, \`snoozed_until\`, \`reply_intent_overridden_by\`).
- \`enrichment_jobs\` — per-city email/contact enrichment runs.
- \`smartlead_events\` — webhook event log (realtime-enabled).
- \`campaign_cache\` — local mirror of SmartLead campaigns.
- \`prospects_staging\` — legacy import-wizard staging (retiring).
- \`email_send_log\`, \`email_send_state\` — transactional email send history + state machine.
- \`enqueue_email\`, \`read_email_batch\`, \`delete_email\`, \`move_to_dlq\` — queue DB functions.
- \`suppressed_emails\`, \`email_unsubscribe_tokens\` — unsubscribe / suppression list.

### AI / assistant

- \`ai_action_log\` — every Neuron AI write action.
- \`ai_threads\`, \`ai_thread_messages\` — assistant conversation history.
- \`ai_query_history\` — historic Ask AI queries for replay / debugging.

### Notifications

- \`notifications\` — header-bell payloads (§13).

### Observability

- \`db_health_history\`, \`db_health_history_for\` (function), \`db_health_incidents\`, \`db_health_outliers\`, \`db_health_rules\`, \`db_health_subscriptions\` — DB Health surface (§14).

### Auth

- \`profiles\` — mirror of \`auth.users\` (email, full_name).
- \`user_roles\` — \`(user_id, role)\` with \`app_role\` enum.

### DB functions & triggers

\`handle_new_user\`, \`has_role\`, \`update_updated_at_column\`, \`seed_confirmation_checklist\`, \`trg_seed_confirmation_checklist\`, \`match_teachers_to_schools\`, plus the email-queue functions listed above.

---

## 18. Tech Stack

- **React 18** + **TypeScript 5** + **Vite 5**
- **Tailwind CSS v3** + **shadcn/ui** + **Radix UI**
- **React Router v6** for routing
- **TanStack Query** for server-state caching
- **Zustand** for client-side stores (city scoring, teacher prospects, candidate pipeline)
- **Driver.js** for the guided tour
- **react-markdown** + **remark-gfm** for in-app docs rendering
- **Sonner** + shadcn Toaster for notifications
- **Lucide** icon set
- **Vitest** for unit tests; **Playwright** for E2E (\`e2e/\`)
- **Lovable Cloud** (managed Supabase) — Postgres, Auth, Storage, Edge Functions, Realtime

---

## 19. Backend & Edge Functions

All deployed as Deno edge functions under \`supabase/functions/\`. **30 functions** as of this revision.

| Function | Purpose |
|---|---|
| \`admin-create-user\` | Admin-only user provisioning |
| \`ai-city-query\` | City Search Ask AI bar (3-tier intent rule, session-aware) |
| \`ask\` | Generic Ask AI backend (legacy) |
| \`ask-city\` | Per-city Ask AI backend |
| \`city-analyst\` | Long-form one-off market brief generator |
| \`neuron-ai\` | Global ⌘K assistant (read + propose) |
| \`neuron-ai-confirm\` | Commit-with-preview for Neuron AI write actions |
| \`observability-ai\` | DB Health "Ask" |
| \`teacher-search-ai\` | Teacher Search sidekick |
| \`users-guide-ai\` | User Guide answer bot |
| \`seed-cities-database\` | Bulk seed of \`us_cities_scored\` (Census/BLS/BEA/FRED/NCES) + per-school upsert into \`public_schools\` |
| \`seed-cities-weather\` | Open-Meteo Historical Weather seed |
| \`recompute-city-derived\` | Replays derived columns + pillar/composite scores |
| \`backfill-census-gaps\` | Targeted Census re-pulls for evidence gaps |
| \`backfill-public-schools\` | Full-rebuild iterator for \`public_schools\` |
| \`fetch-school-counts\` | NCES CCD public-elementary counts per city |
| \`enrich-school-staff\` | Staff/teacher enrichment for a given school (Firecrawl + Apify) |
| \`fetch-teacher-prospects\` | Apify-driven teacher prospect pull per city |
| \`teacher-prospects-dedupe-count\` | Fast dedupe preview for the import wizard |
| \`csv-suggest-mapping\` | AI CSV header → MTDB column mapper |
| \`smartlead-proxy\` | Server-side proxy to SmartLead REST (rate-limit aware) |
| \`smartlead-push-leads\` | Push verified leads (supports \`dry_run\`) |
| \`smartlead-webhook\` | Public webhook receiver + 7-bucket reply classifier |
| \`send-transactional-email\` | Single-send transactional rail |
| \`preview-transactional-email\` | Admin template preview |
| \`process-email-queue\` | Drains the email queue |
| \`weekly-data-health-digest\` | Scheduled DB Health digest |
| \`handle-email-suppression\` | Webhook for bounce/complaint suppression |
| \`handle-email-unsubscribe\` | Public \`/unsubscribe\` token redeem |
| \`deepgram-tts\` | Text-to-speech (used by reply-listen / accessibility surfaces) |

Shared modules under \`supabase/functions/_shared/\`: \`cityGeo.ts\`, \`metricFetchers.ts\`, \`scoring.ts\`, \`appKnowledge.ts\`, \`aiAssistantKB.ts\`, \`knowledge.ts\`, \`observabilityKnowledge.ts\`, \`transactional-email-templates/\` (React Email).

---

## 20. Third-Party APIs

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
| Lovable AI Gateway | All in-app AI (Ask, Neuron AI, classifier, etc.) | \`LOVABLE_API_KEY\` |
| SmartLead ("Integral Leads") | Outbound email | \`SMARTLEAD_API_KEY\` |
| Deepgram | Text-to-speech | \`DEEPGRAM_API_KEY\` |
| Supabase (Lovable Cloud) | DB / Auth / Edge / Storage / Realtime | \`SUPABASE_*\` |

Pending / blocked: **Apollo** / **Clay** / **Hunter** (awaiting Phase 2 teacher-sourcing decision).

---

## 21. Phase 2 Roadmap

> Source of truth for Phase 2 = \`.lovable/phase-2/phase-2-sow.md\` (locked SOW), \`phase-2-execution-plan.md\` (technical sequencing), \`phase-2-plan-plain-english.md\` (human-readable plan). Do not infer Phase 2 state from chat.

The 9-item SOW, one line each:

1. **Market Validation 1A** — deeper market-readiness check on top of City Search composite.
2. **Site Analysis 1B** — per-site (not per-city) scoring + map overlays.
3. **Notes & Activity** consolidation across cities / teachers / candidates.
4. **Candidate portal** — external read-only candidate-facing view.
5. **Teacher Search 1.5** — multi-source pool, Apollo/Clay/Hunter, \`teacher_prospects_master\`.
6. **SmartLead 1.5** — production hardening (A/B, per-user inbox, automated unsubscribe).
7. **Mailboxes** — fully-warmed mailbox inventory + assignment UI.
8. **Video Training module** — in-app franchisee training.
9. **Manus CSI app** — partner-built competitor scoring app integration.

Items 1, 2, 3 are **Tier A — ready to build**. Items 4–7 are **Tier B — need Brett's spec first**. Items 8–9 are **Tier C — likely slip past the initial 6-week window**.

Explicitly out of scope: Google / Microsoft / SSO login, multi-tenancy, mobile app, public franchisee portal, e-signature via DocuSign.

---

## 22. Recent Changes (v1.3 → v1.4)

Tight summary of what shipped between **May 21 → May 31, 2026** (~1,400 commits). Pulled from \`CHANGELOG_HASEEB.md\`, \`.lovable/plan.md\`, \`.lovable/phase-2/CHANGELOG.md\`, and the codebase.

**Cross-cutting**
- **Neuron AI** ⌘K global assistant (§12) — replaces per-screen Ask AI bars over the next ~2 weeks. Knowledge brain at \`_shared/appKnowledge.ts\`; \`ai_action_log\` audit trail.
- **Notifications header bell** (§13) — RLS-locked per user, 60 s poll, wired in PageHeader + CityTopBar.
- **Database Health & Observability** surface (§14) — \`/db-health\`, weekly digest, Observability AI.
- **Phase 2 cabinet** at \`.lovable/phase-2/\` — locked SOW + execution plan + plain-English plan + frozen sources.
- **"One calibrated number everywhere"** rule (Brett) — every score surface reads the recomputed helper, never stale DB values.

**City Search**
- \`city_market_signals\` table severed 2026-05-21; live evidence rows now synthesized from \`us_cities_scored\` columns.
- 12-metric Key Market Signals whitelist locks the drawer to the same inputs as the row scoring.
- \`MarketDetailDrawer\` rewritten with hero summary, per-pillar coverage panel, City Notes editor, Manus-upload sibling-row banner, Export Raw Signals.
- Ask AI: 3-tier TAM intent rule, session context, sub-metric boosts applied, "Searched" header, "What changed" weight diff, "never invent a state" rule, default-open reasoning, internal-key leak fixed (\`franchiseeSupply\` → "Operator & Venue Supply").
- 0-results empty state with one-click "Clear filters".
- Crash guard on factual-answer responses with no \`filters\` block.
- Corrected canonical city count to **817** (was 948/960 in v1.3).
- Manus CSI v2 upload integrated as a sibling-row data source.

**Teacher Search**
- Market Context Banner, Next Best Action strip, Saved Lists, Bulk Action Bar, Teacher AI panel, Funnel Widget, City Search Rail all shipped.

**Email Outreach**
- Transactional email infrastructure (\`send-transactional-email\`, \`process-email-queue\`, \`weekly-data-health-digest\`, \`preview-transactional-email\`, \`handle-email-suppression\`, \`handle-email-unsubscribe\`, \`/unsubscribe\` route, suppression + unsubscribe tables).

**Candidate Pipeline**
- **Documents** tab (FF_DOCUMENTS) + \`candidate_files\`.
- **16-day FDD hard-block** (FF_FDD_GATE) via \`FddCountdown\`.
- **Compliance audit log** (FF_COMPLIANCE) — \`candidate_compliance\` + \`candidate_compliance_audit\`.
- **Manual qualification-score override** (FF_SCORE_OVERRIDE) + history table.
- **Manual votes** for committee members without accounts (FF_MANUAL_VOTES).
- **Step 2 / Step 4 uploads** (FF_STEP2_UPLOADS / FF_STEP4_UPLOADS).
- Export Packet button on the detail panel header.
- Kanban: stage-aware hover, softened avatars, white drawer body.

**Auth**
- \`/reset-password\` route added.

**Edge functions added since v1.3**
\`neuron-ai\`, \`neuron-ai-confirm\`, \`ask\`, \`ask-city\`, \`city-analyst\`, \`observability-ai\`, \`teacher-search-ai\`, \`users-guide-ai\`, \`recompute-city-derived\`, \`backfill-census-gaps\`, \`seed-cities-weather\`, \`send-transactional-email\`, \`preview-transactional-email\`, \`process-email-queue\`, \`weekly-data-health-digest\`, \`handle-email-suppression\`, \`handle-email-unsubscribe\`, \`teacher-prospects-dedupe-count\`, \`deepgram-tts\`.

**Dashboard**
- Retired "161,199 need enrichment" line.

---

*End of specification.*
`;
