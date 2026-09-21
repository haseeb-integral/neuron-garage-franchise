// Markdown source of the Product Specification.
// Rendered inline on /spec AND downloaded verbatim by the "Download Markdown"
// button on that page. Editing this constant updates both surfaces.

export const SPEC_MARKDOWN = `# Neuron Garage Franchise Acquisition System — Product Specification

> Detailed specification of the Neuron Garage Franchise Acquisition System.
> **Document version 1.6 · Updated September 21, 2026** · For internal review.
> Live URL: neuron-garage-franchise.lovable.app
> **What's new since v1.5:** see §22 Recent Changes for the v1.5 → v1.6 delta. Highlights: teacher **entrepreneurial signals** are now first-class (evidence rebuilt from raw import data, Tier 1 / Tier 2 prospect tiers, per-signal evidence cards, signal filters, "Best prospects first" sort), the Manus 27-column enrichment CSV is supported end-to-end, Teacher Search name search moved to a server-side RPC with a true result count, the methodology page was rewritten to v2.0 (Houston + Austin two-city proof), and the master pool reached **311,924** records. Email Outreach remains in mailbox **warm-up** with hard blockers open (§8 Known caveats) — no teacher sends yet.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Users & Roles](#2-users--roles)
3. [End-to-End Journey](#3-end-to-end-journey)
4. [Navigation & Layout](#4-navigation--layout)
5. [Dashboard](#5-dashboard)
6. [Feature 1 — City Search](#6-feature-1--city-search)
6A. [Market Validation (MVS 1A)](#6a-market-validation-mvs-1a)
6B. [Site Analysis (SAS 1B)](#6b-site-analysis-sas-1b)
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
22. [Recent Changes (v1.5 → v1.6)](#22-recent-changes-v15--v16)

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

### Key numbers (September 21, 2026)

- **817 U.S. cities** pre-scored in \`us_cities_scored\` (population ≥ 50,000).
- **61,199 public K–12 schools** in \`public_schools\` (NCES CCD).
- **311,924 teacher records** in the master pool (\`teacher_prospects\`).
- **26,936 teachers with an email address**; **3,922** verified \`valid\` — the only records the SmartLead push currently accepts.
- **2,582 evidence rows** in \`teacher_evidence\`: 2,482 verified facts (2,303 distinct teachers) + 100 secondary entrepreneurial signals (86 teachers, 69 MEDIUM / 31 LOW).
- **6,213 discovered camp/enrichment providers** in \`mvs_providers\`; **24 brands** on the shared operator watchlist.
- **12 live SOW metrics** across 3 categories (Demand · Operator & Venue Supply · Competitive Opportunity).
- **47 deployed edge functions** (§19).

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

- **3-tier Operator & Venue Supply intent rule** (locked in the system prompt). Legacy "TAM" phrasing still recognized:
  - **Tier 1** — "which of these markets are good for Operator & Venue Supply" (or "for TAM") / "of these" → NO master-weight change; AI nudges teacher-supply sub-metrics +8 to +12. Never goes above 50% on the named pillar.
  - **Tier 2** — "rank by Operator & Venue Supply" (or "rank by TAM") / "focus on" → named pillar ~55–60%, others reduced but all > 0.
  - **Tier 3** — "only Operator & Venue Supply" / "only TAM" / "100% teachers" / "ignore the rest" → named pillar 100%, others 0%.
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

## 6A. Market Validation (MVS 1A)

**Purpose:** after City Search ranks a market on demographics, Market Validation checks what is actually on the ground — who already runs kids' camps and enrichment there, what they charge, and how many weeks they run.

Routes: \`/market-validation\` (city list + scores), \`/market-validation/rollout\` (run status per city), \`/market-validation/competitors\` (per-city provider list), \`/market-validation/evidence\` (raw provider evidence), \`/mvs-qa-queue\` (review queue). Docs: \`/mvs-spec\`, \`/mvs-methodology\`.

### Pipeline (edge functions)

| Step | Function | What it does |
|---|---|---|
| A | \`mvs-acs-pull\` | Census pull for the market's demand inputs |
| B1 | \`mvs-discover-providers\` | Crawls Google Maps, Yelp and a single Sawyer URL (\`hisawyer.com/s/summer-camps-for-kids\`) for up to 100 places per city |
| B2 | \`mvs-enrich-websites\` | Finds and crawls each provider's website |
| B3 | \`mvs-price-b3\` | Price extraction **v2** — Gemini reads the page and returns the price **with its unit** (per week / per session / per two weeks), so a \`$840 / 2 weeks\` listing is stored as \`$420\`/week |
| B3b | \`mvs-b3-shortlist-refresh\` | Re-runs pricing on the shortlist only |
| C | \`mvs-extract-weeks\` | Weeks-of-operation extraction |
| D | \`mvs-classify-tier\` | Tier classification (Direct / Adjacent / Distant) |
| — | \`mvs-run-pipeline\`, \`mvs-refresh-all\` | Orchestrators; every pass writes a row to \`mvs_pipeline_runs\` |

\`mvs_pipeline_runs\` is the audit trail: one row per city per pass, with per-stage counters (e.g. \`b3_price_pass\`) so acceptance rates can be inspected after the fact. Reads on \`mvs_providers\`, \`mvs_pipeline_runs\` and \`campaign_cache\` are restricted to staff via \`public.is_staff(auth.uid())\`.

### Operator watchlist — single source of truth

\`mvs_operator_watchlist\` is the **only** list that decides whether a provider is a national brand or a local operator. It is a **shared team table** (not per-user), holds brand names plus aliases, a tier (Direct / Adjacent / Distant) and an \`is_premium_brand\` flag. Edge functions read it through \`_shared/metricFetchers.ts\` with in-memory caching — no hard-coded brand arrays anywhere in the pipeline.

### Price bucket rules (locked)

- **Premium** = minimum weekly price **≥ \$300** *and* maximum weekly price **≥ \$400**.
- Accepted price range for extraction: **\$100 – \$2,500** per week. The word "tuition" is excluded from every search query and from price parsing.
- Provider bucket precedence: **Community / Childcare → Price-Gate → Brand → AI**. A provider with no price that is not a known premium brand defaults to **Mid**.

### Market flags

- **Market Balance Index (MBI)** is a **review flag**, not a score — it points the analyst at markets that look unbalanced.
- **Market Depth** thresholds were tightened; thin-market warnings are consolidated into two badges: **Saturated** and **Unproven**.
- Pricing evidence drill-down (\`LiveCityDeepDive\`) reads the complete provider pool, so the evidence list always matches the score shown.

---

## 6B. Site Analysis (SAS 1B)

**Purpose:** score an individual **site** (a specific address / trade area), not a whole city. Route: \`/site-analysis\`; brief at \`/sas-brief\`; methodology at \`/sas-methodology\`.

- Math lives in \`src/lib/sas-math.ts\`; scoring runs in the \`compute-sas\` edge function, with \`sas-calibrate\` for calibration passes.
- Every sub-score carries a **tooltip with its formula** plus a **Show formula details** panel — same "show the math" rule as City Search.
- The \`school_type\` factor uses refined school-grade weights (elementary-serving schools count most).
- Maps use a server-issued token from \`get-mapbox-token\` (the key is never shipped to the browser).

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
- **Detail panel** — full profile (bio, contact, school, enrichment evidence, activity log).

### Enrichment signals & prospect tiers (v1.6)

Manus enriches each city's teacher file in three layers. The app surfaces them as one plain-English story per record (\`src/lib/teacherSignals.ts\`, \`TeacherEvidenceSection.tsx\`).

| Tier | Meaning | Source |
|---|---|---|
| **Tier 1 — entrepreneurial signal** | Teacher already runs something on the side (real-estate / insurance / occupational license, registered side business, creator income) | \`secondary_signal_count\` or \`verified_creator_signal_count\` > 0 |
| **Tier 2 — outreach hook** | A verified fact worth opening with (coaching, club sponsor, grant, award, published curriculum) | \`verified_enrichment_signal_types\` contains a hook fact |
| **Tier 3 — verified contact** | Contact details confirmed, no signal yet | everything else |

- Each signal renders as its own **evidence card**: plain-English label, the detail text, the match basis, a confidence pill (HIGH / MEDIUM / LOW), and a "view source" link.
- **Verified facts** and **secondary signals** stay visibly separate and are never combined into a single score.
- **Signals filter** in the filter bar: All · Tier 1 · Tier 2 · MEDIUM confidence only · Has creator signal · Has side-business signal · Has phone number.
- **Sort:** *Newest first* (default) or **Best prospects first** — Tier 1, then Tier 2 by hook count, then verified facts.
- Row chips in the table: "Side business" (with confidence), "Hook", or "Verified contact".
- \`teacher_evidence\` was rebuilt from each record's stored raw import jsonb after an importer bug dropped every row; the dedupe index now includes \`md5(summary)\` so two signals sharing one source URL no longer collide.

### Manus 27-column import contract (locked)

One teachers table, no per-city tables. Upsert on \`dedupe_key\` (never on \`full_name\`). City / state / district / school preserved exactly. Blank cells never overwrite an existing value, and blank counts never write 0 over a real number. Pipe-delimited signal strings are stored whole — no splitting, no extra rows. Every \`verified_enrichment_signal_types\` entry gets its own \`verified_fact\` evidence row; secondary signals are mapped to a signal-type code with the original source label kept. The one-row-per-signal sprint file must never be imported here — the wizard warns on it.

### Search performance (v1.6)

Free-text search runs through a security-definer RPC (\`teacher_prospects_search\`) instead of a client-side \`ilike\` chain. The old path hit the 8-second statement timeout on two-word names because the RLS staff check is not leakproof and forced a sequential scan over 311k rows. The RPC also returns the **true** filtered count, so the footer no longer shows an estimate.

### Fit Score (0–100)

Computed in \`src/utils/fitScore.ts\`. Inputs: grade match (K–6 heavy weighting), teacher type, summer availability heuristic, subject match for Segment 4.

### Promote → Candidate Pipeline

Clicking **Promote** creates a row in \`candidates\` at the **New Lead** stage. (UI exists; end-to-end wiring with FKs back to \`public_schools\` / \`us_cities_scored\` is still in progress under the Phase 2 plan.)

### Today's limitation

Apify plus Manus city files are the sourcing path. **Apollo, Clay and Hunter are not wired**, so only 26,936 of 311,924 records have any email and only 3,922 are verified \`valid\`. \`teacher_prospects_master\` (a planned multi-source pool) is not yet built. Houston's records carry no entrepreneurial signals — that CSV shipped without signal columns; a re-import of the 27-column file is required.

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
- **\`{{unsubscribe}}\` merge tag** is not yet in the sequence body, and nothing blocks activation without it. Real teacher sends must not launch until this lands (CAN-SPAM).

### Cold-outreach readiness audit (September 21, 2026)

Audited against the GTPA handoff v1.0, the SmartLead technical spec and the live code/DB. **Verdict: not ready for live teacher sends.** Open items, in order:

| # | Blocker | Evidence |
|---|---|---|
| 1 | No \`{{unsubscribe}}\` tag and no postal address in the default sequence bodies; no validation on activation | \`NewCampaignDrawer.tsx\` default steps |
| 2 | Our own suppression list is ignored on push, and SmartLead bounce/unsubscribe events are never written back to it | \`smartlead-push-leads\` has no \`suppressed_emails\` check; \`smartlead-webhook\` only inserts events; \`suppressed_emails\` = 0 rows |
| 3 | Mailable universe is ~3,922 verified addresses, not 311,924 | \`verification_status = 'valid'\`; Apollo/Hunter not wired |
| 4 | \`smartlead-webhook\` is public with no shared-secret check — forged replies could promote fake candidates into the pipeline | \`verify_jwt = false\`, no signature validation |
| 5 | Push chunks 100 leads back-to-back with no pacing and no retry against a 10-req/2-s limit | \`smartlead-push-leads\` loop |
| 6 | \`SMARTLEAD_PHASE\` still \`"warmup"\`; mailboxes at 15 sends/day | \`ScopeSwitcher.tsx\` |
| 7 | \`campaign_cache\` stale (last full sync June 11) and full of \`[TEST]\` campaigns; analytics overview returns all zeros | \`campaign_cache\` rows |

### Documentation accuracy note

The **GTPA Handoff v1.0** and this spec match the code. The older **SmartLead technical spec** and **"How It Works" guide** (May 2026) are stale in four ways: they describe the 4-badge reply classifier (now 7 buckets), list a \`prospect_batches\` table that does not exist, give \`smartlead_events\` columns that no longer match (\`reply_message\`, \`reply_message_id\`, \`reply_intent_confidence\`, \`reply_intent_reason\`, \`payload\` are the real ones), and state 400-lead chunks with a 500 ms gap where the code pushes 100 with no gap.

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

### Three views

- **Board** — Kanban with horizontal scroll, "Jump to" pill nav, Pipeline Analytics bar (count per stage, conversion rates). Cards show name, qualification score, days in stage, last activity, owner.
- **Calendar** — every scheduled call for the **whole team** (not just the signed-in user), by day / week / month. Call type is chosen from the seven qualification process steps (\`EventDialog\`).
- **Table** — spreadsheet view with **Download CSV** and **Import CSV** (\`CandidateImportWizard\`): AI-free header matching, duplicate checking, and undo. CSV covers candidate fields **and** the Step-1 profile answers (Experience With Children, Interest In Neuron Garage, Educational Philosophy).

### Inbound leads

The \`submit-application\` edge function is the public intake endpoint for the franchise-applicant landing page (first name, last name, email, phone). It validates input, blocks bots with a honeypot, rate-limits to 5 submissions per email per hour, deduplicates by email, tags the record \`new_lead\` with source **Inbound → Landing Page**, logs an activity note and notifies staff. The board subscribes to realtime inserts/updates, so a new lead appears **without a refresh** (1-second debounce + toast).

### Detail panel (\`CandidateDetailPanel\`) — 5 tabs

Tab order is fixed: **Overview · Qualification Process · Uploaded Documents · Committee Votes · Activity**.

- **Overview** — read-only contact block, source (three levels: Type → Name → Campaign, with automatic SmartLead campaign mapping), deal owner, the manual blue **fit tag** (\`TagSelect\`), the full qualification scoring, and a **Signals & Red Flags** summary rolled up from the process steps.
- **Qualification Process** — the whole 7-step process on one tab (\`ProcessTab\`), each step with its script questions, contact intake (auto-saves on blur — no Save button), post-call actions, homework tracking and document uploads scoped to that step:
  1. Initial Qualification — lead sheet incl. experience with children, interest in Neuron Garage, educational philosophy, role, spouse/partner, desired market city/state (with registration-state alerts), mailing address, then trial close.
  2. Business Overview Call — Track Homework.
  3. Internal: Background & Credit Check.
  4. FDD & Franchise Agreement Review — **FDD sent date** and **FDD proof upload** live in Post-Call Actions.
  5. Business Immersion & Evaluation — Post-Call Actions, then the three reference checks (\`ReferencesBlock\`) and a "Completed candidate reference checks" item.
  6. Confirmation Call — includes "Overnighted a personalized Neuron Garage pen with their franchise number on it."
  7. Signing Call.
- **Uploaded Documents** — per-candidate file dropzone backed by \`candidate_files\` + Lovable Cloud Storage.
- **Committee Votes** — Selection Committee Approve / Decline, including manual votes for members without app accounts.
- **Activity** — Stage History above the Activity Timeline. It is an audit trail only; free-text note creation was removed.

Header carries **Export Packet** (\`exportResearchPacket\`) and a compliance packet PDF builder.

### Qualification scoring

Five pillars, rated by the recruiter: **Responsiveness · Elementary Experience · Process Alignment · Philosophical Alignment · Market Fit**, each with its own notes, auto-rolled into a composite stored in \`candidate_qualification\`. The legacy "fit score" was removed; the board filter is now **Qualification** and reads the composite. Manual overrides are audited in \`candidate_score_overrides_history\`.

### FDD 16-day compliance gate (locked)

A prospect cannot sign a franchise agreement fewer than **16 calendar days** after receiving the FDD. \`candidate_compliance.fdd_sent_at\` is the **single source of truth** — the Step-4 date field (\`FddSentDateField\`) and the countdown both read and write it. Database triggers block the stage transition server-side; \`candidate_compliance_audit\` keeps the auditable trail.

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
- **Navigate + apply state** — "show me Tier A cities in Florida with Operator & Venue Supply weight 60" routes to City Search, applies filters, sets weights.
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
| \`/teacher-search-methodology\` | How teachers are sourced and scored. |
| \`/expanding-teacher-search-methodology\` | **v2.0** — Houston + Austin enrichment proof, the three signal layers, confidence system, per-city retooling checklist, cost model. |
| \`/candidate-pipeline-methodology\` | Qualification process and scoring rules. |
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
- \`watchlist_items\` — shared team Favorites (cities).
- \`ask_city_conversations\` — persisted Ask AI threads scoped to a city.

### Teachers

- \`teacher_prospects\` — \`city, state, school, fit_score, status, apify_run_id, teacher_type (active|retired|camp_enrichment), subject, segment, linkedin_url, enrichment_source, last_enriched_at\`. v1.2 extensions: \`status\` (\`new\` | \`in_smartlead\` | \`suppressed\` | …), \`last_pushed_at\`, \`needs_email_enrichment\`, \`verification_status\` (\`valid\` | \`catch_all\` | \`invalid\` | null), \`dedupe_key\` (generated), \`raw\` (jsonb of unmapped CSV columns), \`teacher_import_batch_id\` (FK). v1.6 enrichment columns: \`verified_enrichment_fact_count\`, \`verified_enrichment_signal_types\` (array), \`verified_creator_signal_count\`, \`secondary_signal_count\`, \`secondary_signal_confidence\`.
- \`teacher_evidence\` — one row per signal or verified fact: \`teacher_prospect_id\`, \`evidence_class\` (\`verified_creator\` | \`secondary\` | \`verified_fact\`), \`signal_type\`, \`source_label\`, \`summary\`, \`source_url\`, \`match_basis\`, \`confidence\` (\`HIGH\` | \`MEDIUM\` | \`LOW\`, null for verified facts). Dedupe index includes \`md5(summary)\`.
- \`teacher_prospects_cities\` — per-city aggregate snapshot.
- \`teacher_prospects_stats\` — cached counters powering the funnel widget.
- \`teacher_prospects_search\` — security-definer RPC backing free-text search (server-side \`ilike\` + true count).
- \`teacher_saved_lists\` — per-user named teacher lists.
- \`teacher_import_batches\` — one row per CSV import (\`source\`, \`destination\`, \`row_count\`, \`column_mapping\`, \`unmapped_columns\`, \`created_by\`).
- \`imports\` — generic import job audit.
- \`match_teachers_to_schools\` — DB function joining teachers to \`public_schools\`.

### Candidates

- \`candidates\` — \`first_name, last_name, email, phone, city, state, current_stage, fit_tag, assigned_to\`, plus three-level source (\`source_type\`, \`source_name\`, \`source_campaign\`). The legacy \`fit_score\` was retired.
- \`candidate_profiles\` — lead-sheet intake: motivation, background, liquid capital, net worth, timeline, spouse/partner, desired market city/state, mailing address, and the Step-1 answers \`experience_with_children\`, \`interest_in_neuron_garage\`, \`educational_philosophy\`.
- \`candidate_qualification\` — the 5 pillar scores (responsiveness / elementary experience / process alignment / philosophical alignment / market fit) + composite + per-pillar notes.
- \`candidate_process_steps\` — per-step state, script answers, signals and red flags.
- \`candidate_events\` — scheduled calls behind the Calendar view (call type = process step).
- \`candidate_activities\` — activity timeline entries (system-generated).
- \`candidate_stage_history\` — every transition with notes.
- \`candidate_votes\` — Selection Committee rows.
- \`candidate_checklist_items\` — per-stage checklist (auto-seeded for Confirmation via trigger).
- \`candidate_files\` — Uploaded Documents + per-step uploads (incl. \`fdd_proof\` and homework).
- \`candidate_compliance\` + \`candidate_compliance_audit\` — FDD dates and the 16-day gate audit trail.
- \`candidate_score_overrides_history\` — manual score-override audit.

### Market Validation & Site Analysis

- \`mvs_providers\` — discovered camp/enrichment providers with price, weeks, tier and evidence (staff-read only).
- \`mvs_operator_watchlist\` — **shared** brand list (names, aliases, tier, \`is_premium_brand\`); single source of truth for brand classification.
- \`mvs_pipeline_runs\` — one row per city per pipeline pass, with per-stage counters (staff-read only).

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

All deployed as Deno edge functions under \`supabase/functions/\`. **47 functions** as of this revision. All of them import dependencies with \`npm:\` specifiers (the old \`https://esm.sh\` imports were removed in September 2026 after they caused runtime crashes).

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

Added since v1.4:

| Function | Purpose |
|---|---|
| \`mvs-acs-pull\` | Market Validation demand pull (Census) |
| \`mvs-discover-providers\` | Provider discovery (Google Maps / Yelp / single Sawyer URL) |
| \`mvs-enrich-websites\` | Provider website crawl |
| \`mvs-price-b3\` | Price extraction v2 (unit-aware, Gemini) |
| \`mvs-b3-shortlist-refresh\` | Re-price the shortlist only |
| \`mvs-extract-weeks\` | Weeks-of-operation extraction |
| \`mvs-classify-tier\` | Direct / Adjacent / Distant classification |
| \`mvs-run-pipeline\`, \`mvs-refresh-all\` | Pipeline orchestrators + run audit |
| \`compute-sas\`, \`sas-calibrate\` | Site Analysis scoring + calibration |
| \`get-mapbox-token\` | Server-issued map token |
| \`submit-application\` | Public franchise-applicant intake → new lead |
| \`backfill-affluent-families\` | Targeted Census backfill |
| \`seed-private-elementary-counts\` | Private elementary seed |
| \`seed-urban-cache\`, \`seed-urban-cache-all\` | Urban-area cache seeding |

Shared modules under \`supabase/functions/_shared/\`: \`cityGeo.ts\`, \`metricFetchers.ts\` (reads the shared operator watchlist with in-memory caching), \`scoring.ts\`, \`appKnowledge.ts\`, \`aiAssistantKB.ts\`, \`knowledge.ts\`, \`observabilityKnowledge.ts\`, \`transactional-email-templates/\` (React Email).

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

## 22. Recent Changes (v1.5 → v1.6)

What shipped between **September 14 → September 21, 2026**.

**Teacher Search — enrichment signals made first-class**
- \`teacher_evidence\` was found empty despite imports reporting saved evidence; 100 side-business records and 2,482 verified facts were rebuilt from each teacher's stored raw jsonb. The \`evidence_class\` check now allows \`verified_fact\`, \`confidence\` allows \`HIGH\` (null for facts), and the dedupe index includes \`md5(summary)\`.
- New \`src/lib/teacherSignals.ts\`: prospect tiers, hook facts, plain-English signal labels, confidence blurbs.
- Detail panel rewritten: tier banner, per-signal evidence cards with confidence pill, detail text, match basis and source link; entrepreneurial signals and verified facts shown as separate blocks.
- Table chips ("Side business" / "Hook" / "Verified contact"), a **Signals** filter (Tier 1, Tier 2, MEDIUM-only, creator, side-business, has phone) and a **Best prospects first** sort.
- Importer hardened for the next city: correct \`HIGH\` confidence on creator evidence, keyword-mapped secondary signal types with the source label kept, a \`verified_fact\` row per verified signal type, and a dedupe key that includes \`signal_type\` so re-imports never duplicate.

**Teacher Search — data & performance**
- Master pool at **311,924** after the Austin import (1,840 new, 2,896 enriched, no duplicates).
- Full 27-column Manus contract supported: blank counts no longer overwrite real numbers, full pipe-delimited signal text preserved, sprint-file upload warned against.
- Two-word name search used to time out and report "No prospects match"; it now runs through the \`teacher_prospects_search\` RPC in about a second and the footer shows a true count instead of an estimate.

**Documentation**
- \`/expanding-teacher-search-methodology\` rewritten to **v2.0**: Houston + Austin two-city proof, the three enrichment layers, confidence system, 7-step per-city retooling checklist, cost model, how signals appear in the app, lessons learned.

**Email Outreach**
- Cold-outreach readiness audit completed (§8). Seven open items; still in warm-up, no teacher sends. Two older SmartLead documents identified as stale.

**Candidate Pipeline**
- Step-1 questions (experience with children, interest in Neuron Garage, educational philosophy) now round-trip through the CSV download and import.

---

### Earlier: v1.4 → v1.5

What shipped between **May 31 → September 14, 2026**.

**Market Validation (MVS 1A) — new**
- Full discovery → enrich → price → weeks → tier pipeline live, with \`mvs_pipeline_runs\` as the per-stage audit trail.
- \`mvs_operator_watchlist\` made the single source of truth for national-brand vs local-operator; hard-coded brand arrays removed from the scrapers; aliases + missing brands added (Snapology, Bricks 4 Kidz, Code Ninjas, Mad Science, Engineering For Kids, KidStrong, Camp Invention, Camp Bow Wow, School of Rock, Young Rembrandts, Abrakadoodle, Drama Kids International). The watchlist is now a **shared team list**.
- Price extraction **v2** (unit-aware) fixed "\$840 for two weeks" being read as \$840/week.
- Discovery: up to 100 places per city, \$100–\$2,500 accepted, the word "tuition" excluded everywhere, Google Maps timeouts fixed, Yelp categories tightened, Sawyer limited to one URL.
- Premium rule locked at min ≥ \$300 **and** max ≥ \$400; bucket precedence Community/Childcare → Price-Gate → Brand → AI; unpriced non-premium brands default to Mid.
- MBI rebuilt as a review flag; Market Depth tightened; thin-market flags consolidated into **Saturated** and **Unproven**.
- Pricing evidence drill-down now reads the full provider pool so it matches the score.

**Site Analysis (SAS 1B) — new**
- \`/site-analysis\` with per-sub-score formula tooltips and Show-formula details; refined \`school_type\` grade weights; \`compute-sas\` crash fixed by moving all edge functions to \`npm:\` imports.

**City Search**
- "TAM" renamed to **Operator & Venue Supply** across the whole app (internal keys unchanged); the term is banned from AI prompts.
- AI market report: "Recommended Next Move" renamed **Data Confidence**.
- \`us_cities_scored\` reconfirmed as the sole source of truth for city metrics; pipeline ordering bug fixed (cities showing providers but zero pricing acceptance).

**Teacher Search**
- Master pool grew to **310,084** records (24,657 added in the last Houston-area import).
- Import wizard gained **Enrichment Mode**: add new, enrich only, or both — with fill-blanks vs overwrite, so re-running an import is safe and new detail is no longer blocked as a duplicate.

**Candidate Pipeline — largely rebuilt**
- Tabs reduced to Overview · Qualification Process · Uploaded Documents · Committee Votes · Activity.
- The whole 7-step process moved onto one **Qualification Process** tab with script questions, auto-saving intake, per-step signals & red flags, homework tracking, and step-scoped uploads.
- Qualification pillars renamed to Responsiveness, Elementary Experience, Process Alignment, Philosophical Alignment, Market Fit, each with notes; scoring moved into Overview; legacy fit score removed and the board filter renamed **Qualification**.
- Blue fit tag is now a manual recruiter choice.
- FDD: proof upload added, sent date moved to Step 4 Post-Call Actions, and both the field and the 16-day lock now read \`candidate_compliance.fdd_sent_at\`.
- Step 5 references block with "Completed candidate reference checks"; Step 6 pen overnight action.
- Three-level source capture (Type → Name → Campaign) with automatic SmartLead campaign mapping.
- **Calendar** view of all team calls (call type = process step) and a **Table** view with CSV download/import, duplicate checks and undo — including the Step-1 profile answers.
- New Step-1 questions: experience with children, interest in Neuron Garage, educational philosophy.
- Inbound applications via \`submit-application\` (validation, honeypot, rate limit, dedupe, staff notification) land as **New Lead** and appear live on the board via realtime.
- All Canada test prospects deleted; pipeline reset clean.

**Security & maintenance**
- \`campaign_cache\`, \`mvs_pipeline_runs\`, \`mvs_providers\` reads restricted to staff (\`public.is_staff\`); realtime policies made topic-scoped.
- \`react-router-dom\` updated to 7.18.2.
- All 47 edge functions migrated from \`esm.sh\` to \`npm:\` imports.

---

*End of specification.*
`;
