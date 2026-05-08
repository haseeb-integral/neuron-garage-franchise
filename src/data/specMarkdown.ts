// Markdown source of the Product Specification, used by the Spec page download button.

export const SPEC_MARKDOWN = `# Neuron Garage Franchise Acquisition System — Product Specification

> Detailed specification of the Neuron Garage Franchise Acquisition System.
> Document version 1.1 · For internal review.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Users & Roles](#2-users--roles)
3. [End-to-End Journey](#3-end-to-end-journey)
4. [Navigation & Layout](#4-navigation--layout)
5. [Dashboard](#5-dashboard)
6. [City Scoring](#6-city-scoring)
7. [Teacher Prospects](#7-teacher-prospects)
8. [Email Outreach](#8-email-outreach)
9. [Candidate Pipeline](#9-candidate-pipeline)
10. [Onboarding](#10-onboarding)
11. [Guided Tour](#11-guided-tour)
12. [Design System](#12-design-system)
13. [Data Model](#13-data-model)
14. [Tech Stack](#14-tech-stack)
15. [Backend & Edge Functions](#15-backend--edge-functions)
16. [Future Work](#16-future-work)

---

## 1. Overview

**Neuron Garage Franchise Acquisition System** is an internal tool that helps the Neuron Garage franchise development team:

- Identify the best U.S. markets for new franchises.
- Source elementary-school teachers as candidate franchisees.
- Qualify candidates through a structured 7-step pipeline.
- Onboard signed franchisees through a standardized 7-step launch program.

The product is a single-page React web application optimized for desktop, tablet, and mobile. It is backed by Lovable Cloud (Postgres + edge functions) for live market data, scoring, and persistence.

### Goals

- Replace ad-hoc spreadsheets and email threads with a single source of truth.
- Use scoring + AI assists to focus the team on the highest-value cities and prospects.
- Make every stage of the pipeline observable, accountable, and time-bound.
- Give new franchise development reps a guided "what do I do next?" experience.

### Non-Goals

- No payment processing or contract execution; e-sign is represented as a status only.
- No public-facing franchisee portal in this build.

---

## 2. Users & Roles

The current build assumes a single role: **Franchise Development Rep**. Future roles to consider:

- **FD Manager** — sees all reps' pipelines, assigns leads, approves Selection Committee votes.
- **Selection Committee Member** — votes on candidates in the Immersion stage.
- **Onboarding Specialist** — owns the 7-step franchisee onboarding program.
- **Franchisee** (external) — read-only view of their own onboarding progress.

Roles are stored in a dedicated \`user_roles\` table with an \`app_role\` enum and a \`has_role()\` security-definer function so RLS policies never recurse.

---

## 3. End-to-End Journey

The product follows a left-to-right funnel reflected in the sidebar order:

1. **Score a city** — pick a U.S. metro with the right demographics, school density, and competitive landscape.
2. **Find prospects** — surface elementary teachers in that city, ranked by Fit Score.
3. **Run outreach** — send personalized email sequences and track replies.
4. **Qualify candidates** — move a prospect through the 7-stage Kanban pipeline.
5. **Onboard the franchisee** — execute the standardized 7-step launch program.

---

## 4. Navigation & Layout

### App Shell

- Persistent left sidebar on desktop (≥ 768 px), drawer on mobile. Collapsible to an icon rail.
- Help icon (?) top-right — restarts the guided tour.
- Mobile top bar with hamburger, brand mark, and help icon. Touch targets ≥ 44 px.

### Routes

- \`/\` — Dashboard
- \`/city-scoring\` — City Search
- \`/teacher-prospects\` — Teacher Prospects
- \`/email-outreach\` — Email Outreach
- \`/candidate-pipeline\` — Candidate Pipeline
- \`/onboarding\` — Onboarding
- \`/settings/team\` — Team Members / Settings
- \`/spec\` — This document

---

## 5. Dashboard

**Purpose:** give the rep a one-screen answer to "what should I do next?"

- **Next Action card** — orange-accented banner with a personalized recommendation and a CTA that deep-links to the right city.
- **Stat cards** — Total Cities Scored, Total Prospects Found, Candidates in Pipeline, Active Onboardings.
- **Pipeline Snapshot** — horizontal bar chart of candidate count by stage.
- **Recent Activity** — last 6 system events with relative timestamps.

---

## 6. City Scoring

**Purpose:** rank U.S. cities by their suitability for a new Neuron Garage franchise.

### Starter Markets

The Ranked Markets table is seeded with 30+ starter markets across multiple states (Texas, Florida, Arizona, Colorado, North Carolina, Georgia, Virginia) so the screen feels like a real national market search even before any city is refreshed. When live data exists in Lovable Cloud for a market, it overrides the starter row via a deterministic dedupe (live source wins; otherwise newest \`last_scraped_at\` wins).

### Filters

- State (dynamic — built from whatever markets are loaded), tier (A/B/C/D), registration status, free-text search, min population, min score.
- Adjustable scoring weights for: population, % children 5–12, median income, school density, competitor count, growth rate.

### Refresh Data flow

Clicking **Refresh Data** for the selected city always runs both edge functions in sequence and is non-blocking — if the live API attempt fails, SOW scoring still runs:

1. \`fetch-city-market-data\` (live API attempt — Census, BLS, Firecrawl, Apify).
2. \`fetch-city-market-data-sow\` (official 46-metric SOW framework).
3. Poll \`city_market_signals\` until exactly 46 SOW signals are present, then reload the UI.

The official **SOW composite score and category scores** become the displayed score. Categories with fewer than 3 usable metrics fall back to blended values; missing metrics are tracked as evidence gaps, not counted as zero.

### Outputs

- Stat cards showing total cities, A-tier count, average score, and registered states.
- Sortable city table; row click opens a detail drawer with full demographics, competitor list, schools, and notes.
- **Source Evidence drawer** — groups all 46 SOW signals by category with source URLs and confidence values.
- **Compare mode** — select up to 4 cities and open a side-by-side modal.

### Key actions

- From the detail drawer: *"Find Teachers in this City"* button → navigates to Teacher Prospects pre-filtered to that city.

---

## 7. Teacher Prospects

**Purpose:** discover and shortlist elementary-school teachers who could become franchisees.

- **Filter bar** — city, fit-score range, tag, enrichment status, search.
- **Find Prospects modal** — simulated AI search by city + grade band + keywords; returns a ranked list of new teachers.
- **Outreach Intelligence panel** — shows best send-time, recommended channel, and a draft message template per selection.
- **Prospect table** — name, school, city, masked email, LinkedIn, Fit Score, tag, enrichment status, Promote action.
- **Bulk action bar** — appears when one or more rows are selected: bulk-promote, bulk-tag, export.
- **Detail panel** — full profile with bio, contact, school info, signals (years of experience, leadership roles, side hustles), activity log.

### Promote flow

Clicking *Promote* on a teacher creates a corresponding entry in the Candidate Pipeline at the **New Lead** stage.

---

## 8. Email Outreach

**Purpose:** run multi-step outreach sequences to selected prospects.

- Templates with merge tags (\`{{first_name}}\`, \`{{city}}\`, \`{{school}}\`).
- Sequence builder — step delay, channel, conditional branches.
- Inbox-style reply view with thread grouping.
- Per-prospect status: queued → sent → opened → replied → bounced.

---

## 9. Candidate Pipeline

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
- Each card shows name, fit score, days in stage, last activity, owner.

### Detail panel (sheet)

- **Overview** — contact, source, fit score, deal owner.
- **Qualification** — six 1–5 star ratings (capital, motivation, market knowledge, time commitment, leadership, culture fit) with auto-calc total.
- **Notes & Activity** — chronological log; add a note inline.
- **Homework** — trial-close checklist (territory selected, financing in place, family aligned, etc.).
- **Selection Committee** (Immersion only) — three named members, each casts an Approve / Decline vote.
- **Confirmation checklist** — auto-seeded by a database trigger when a candidate enters the Confirmation stage.

### Signing → Onboarding handoff

Cards in the **Signing** column display a **Start Onboarding →** button. On confirm, a new Onboarding record is created at Step 1/7, status **On Track**, days elapsed = 0, and the user is navigated to \`/onboarding\`.

---

## 10. Onboarding

**Purpose:** run a signed franchisee through the standardized 7-step launch program.

### The 7 steps

1. **Welcome & Kickoff** — welcome email, intro call, account setup.
2. **Roadmap Review** — walk through the 90-day launch roadmap.
3. **Market Plan** — finalize territory, schools targeted, year-1 revenue model.
4. **FDD Countdown** — 14-day mandatory FDD waiting period (visualized via countdown).
5. **Document Upload** — signed FDD, COI, LLC docs, void check.
6. **Awarded** — final signature; ceremonial "Welcome to Neuron Garage" moment.
7. **Active Franchisee Onboarding** — handoff to the operations team; "Send the donut" trigger.

### Components

- **Onboarding table** — current step, % progress bar, days elapsed, status (On Track / At Risk / Overdue).
- **Onboarding Wizard** (sheet) — step progress bar, per-step form, Activity Log, Communication Triggers.
- **Communication Triggers** — pre-canned emails auto-marked sent when the corresponding step is completed.

---

## 11. Guided Tour

First-time visitors see a Driver.js tour that highlights each main sidebar item. The tour ends with a "You're all set" panel that deep-links to City Search.

- Auto-runs on first visit; persists completion in \`localStorage\` under \`ng:tour-completed-v1\`.
- Restartable any time via the **?** icon in the top-right header.

---

## 12. Design System

### Brand colors

- **Primary navy** \`#003c7e\` — sidebar, headings, primary text.
- **Accent blue** \`#0757ff\` / \`#1f5bff\` — active nav, primary CTAs.
- **Accent orange** \`#fd7e14\` — secondary CTAs, progress bars.
- **Success teal** \`#20c997\` · **Warning amber** \`#ffc107\` · **Danger red** \`#dc3545\`.
- **Neutrals** — backgrounds \`#f2f4f6\` / \`#f8f9fa\`, borders \`#dee2e6\` / \`#eef2f7\`, body text \`#343a40\`, muted \`#6c757d\`.

### Typography & spacing

- System sans-serif font stack via Tailwind defaults.
- 8-pt spacing grid; \`rounded-lg\` (8 px) on cards; subtle \`shadow-sm\` elevation.

### Components

shadcn/ui on top of Radix primitives — Sheet, Dialog, Tabs, Table, Select, Toast, Tooltip, Progress, Sidebar, etc.

### Responsiveness

Mobile-first; tested at 320, 375, 414, 768, 1024, 1280+. Tables scroll horizontally on narrow viewports; drawers go full-width below the \`sm\` breakpoint.

---

## 13. Data Model

### Cities & market data

- \`cities\` — \`city, state, county, metro_area, market_type, tier, composite_score, population, children_pct, median_income, elementary_schools, competitor_count, is_non_registration, last_scraped_at, notes\`.
- \`city_category_scores\` — per-category SOW scores (one row per category per city).
- \`city_market_signals\` — every SOW evidence row (\`signal_key, label, value, delta, source, source_url, confidence, raw_data\`).
- \`city_competitors\` — local competitor records (\`name, type, pricing, capacity, source_url\`).
- \`city_fetch_jobs\` — audit trail of every edge-function refresh (status, request payload, response summary, error message).

### Candidates

- \`candidates\` — \`first_name, last_name, email, phone, city, state, current_stage, fit_score, fit_tag, assigned_to\`.
- \`candidate_profiles\` — motivation, background, liquid_capital, net_worth, timeline, partner_involved, location_preferences.
- \`candidate_qualification\` — six 0–100 sub-scores plus composite.
- \`candidate_stage_history\` — every stage transition with notes.
- \`candidate_votes\` — Selection Committee vote rows.
- \`candidate_checklist_items\` — per-stage checklist (auto-seeded for Confirmation via trigger).

### Onboarding

- \`onboarding_records\` — franchisee_name, city, state, status, current_step_index, total_steps.
- \`onboarding_steps\` — per-step title, description, completion state.

### Auth

- \`profiles\` — mirror of \`auth.users\` (email, full_name).
- \`user_roles\` — \`(user_id, role)\` with \`app_role\` enum.

All tables have RLS enabled. Authenticated users can read/write app data; role mutation requires \`has_role(auth.uid(), 'admin')\`.

---

## 14. Tech Stack

- **React 18** + **TypeScript 5** + **Vite 5**
- **Tailwind CSS v3** + **shadcn/ui** + **Radix UI**
- **React Router v6** for routing
- **TanStack Query** for server-state caching
- **Driver.js** for the guided tour
- **Sonner** + shadcn Toaster for notifications
- **Lucide** icon set
- **Vitest** for unit tests
- **Lovable Cloud** (managed Supabase) — Postgres, Auth, Storage, Edge Functions

---

## 15. Backend & Edge Functions

Backend logic runs as Lovable Cloud edge functions (Deno):

- \`fetch-city-market-data\` — live-API path. Calls Census, BLS, Firecrawl, and Apify connectors and writes \`city_market_signals\` rows tagged \`source = 'live_api'\`.
- \`fetch-city-market-data-sow\` — official 46-metric SOW framework. Always writes exactly 46 rows tagged \`source = 'sow_metric_coverage'\` and recomputes \`city_category_scores\` + \`cities.composite_score\` / \`tier\`.
- Shared scoring code lives under \`supabase/functions/_shared/scoring.ts\` and uses category-blend fallback when a category has fewer than 3 usable metrics.

Secrets used: \`CENSUS_API_KEY\`, \`BLS_API_KEY\`, \`FIRECRAWL_API_KEY\`, \`APIFY_API_TOKEN\`, \`APIFY_GOOGLE_MAPS_ACTOR_ID\`, \`LOVABLE_API_KEY\`.

---

## 16. Future Work

- Manager dashboards, role-based access controls, and assignment rules.
- Real-time collaboration on candidate cards (Supabase Realtime).
- AI assists: auto-draft outreach emails, summarize candidate notes, recommend next-best stage moves.
- Email & calendar integration (Gmail / Google Calendar) for the activity log and outreach send.
- E-signature via DocuSign or Dropbox Sign for FDD and franchise agreement.
- Public franchisee portal — read-only view of their own onboarding journey.
- Expand SOW framework to additional verticals beyond elementary STEM.

---

*End of specification.*
`;
