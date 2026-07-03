# Neuron Garage — System Architecture Overview

- **Audience:** Brett (product/operations) and any future engineer joining the project.
- **Last updated:** 2026-05-27
- **Owner:** Haseeb &nbsp; · &nbsp; **Approver:** Brett
- **Companion pages (left sidebar → Methodology & Docs):** Credentials & Handover · APIs & Data Sources · Prompts & AI Workflows · SmartLead API Spec · Observability Spec


> Read **Part A** first. It's everything a non-engineer needs to understand the system. **Part B** is for developers.

---

## Part A — Overview (read this first)

### 1. What this app is

Neuron Garage is an internal, single-team console for **Kaylie Reed's franchise-recruiting operation**. Three core users today (Kaylie, Sam, Haseeb) plus Brett as approver. It is **not** public-facing.

The job of the app: take the team from *"which US city should we open in next?"* all the way to *"which elementary-school teacher in that city just signed a franchise agreement?"* — without ever leaving one tool.

### 2. The four screens and how they hand off

The job of the app moves left → right. Each screen hands a clean payload to the next.

| 1. City Search — `/city-scoring` | 2. Teacher Search — `/teacher-prospects` | 3. Email Outreach — `/email-outreach` | 4. Candidate Pipeline — `/candidate-pipeline` |
|---|---|---|---|
| Rank markets | Find teachers | Start the conversation | Qualify, vote, sign |
| Scores 817+ US cities on Demand, Competitive Opportunity, TAM Teachers. | Scores teachers in the chosen city on fit. | Multi-step AI-personalized campaigns over SmartLead. | Kanban with 7 stages; Selection Committee votes during Immersion. |
| → *Find Teachers in this City* opens Teacher Search pre-filtered. | → *Promote* creates a New Lead card. → *Add to Campaign* sends to Outreach. | → Reply tagged Interested → *Promote to Pipeline*. | Final stage Signing is hard-gated by Confirmation. |

### 3. AI models we use

All AI is routed through the **Lovable AI Gateway** — no third-party AI keys live in this project. For the screen-by-screen view of which AI surfaces are live, beta, or absent, see **Section 3a**. For the Neuron AI internals, see **Section 11**.

| Model | Where it's called (edge function) | What it does | Why this model |
|---|---|---|---|
| `google/gemini-3-flash-preview` | `ask-city`, `city-analyst` (default), `csv-suggest-mapping` | City inline Ask-AI, "why Tier?" explainability, CSV field-mapping. | Fast, cheap, strong tool use. |
| `google/gemini-2.5-flash` | `ask`, `neuron-ai`, `observability-ai`, `teacher-search-ai`, `users-guide-ai`, `ai-city-query` | Most chat + structured-answer surfaces, NL → filter translation, doc Q&A. | Balanced cost/latency, good tool calling. |
| `google/gemini-2.5-flash-lite` | `smartlead-webhook` (reply classification) | Categorize inbound replies into 4 chips (interested / not / wrong / unsub). | Cheapest tier for high-volume classification. |
| `google/gemini-2.5-pro` | `city-analyst` (opt-in deep-explain only) | Long-context narrative when the user requests the "pro" explanation. | Used sparingly — most paths run the flash default. |

> **Rule:** if a new feature needs AI, it must use Lovable AI Gateway models. No raw OpenAI/Anthropic/Google API keys are added to this project.

> **Not wired up today (avoid claiming otherwise):** there is no `openai/gpt-5-mini` fallback on `neuron-ai`, and `enrich-school-staff` does not call the AI Gateway. The image model `gemini-2.5-flash-image` is available on the gateway but not invoked from any prod path.

### 3a. Where AI shows up in the UI

One row per screen. "Beta-hidden" means the surface exists in code but has no visible launcher and is open only via keyboard (Cmd/Ctrl+K) pending Haseeb's sign-off.

| Screen | Ask-AI surface | Edge function(s) | Status |
|---|---|---|---|
| City Search (`/city-scoring`) | Inline Ask-AI bar + "why Tier?" explainer | `ask-city`, `ai-city-query`, `city-analyst` | 🟢 Production |
| Teacher Search (`/teacher-prospects`) | Right-side AI panel | `teacher-search-ai` | 🟢 Production |
| Observability (`/observability`) | Observability AI panel | `observability-ai` | 🟢 Production |
| User's Guide + docs pages | Docs chatbot | `users-guide-ai` | 🟢 Production |
| Email Outreach (`/email-outreach`) | — (no per-screen Ask-AI) | covered only by global Neuron AI | ⚪ Gap |
| Candidate Pipeline (`/candidate-pipeline`) | — (no per-screen Ask-AI) | covered only by global Neuron AI | ⚪ Gap |
| Global, all screens | Floating Neuron AI panel | `neuron-ai`, `neuron-ai-confirm`, with `ask` as a generic fallback chat | 🟡 Beta-hidden (Cmd/Ctrl+K only — see Section 11) |



### 4. Data sources and integrations

| Source | Status | Feeds |
|---|---|---|
| US Census ACS (5-yr **2024** vintage, place-level; 2022 for tract/county) | 🟢 Live | City demographics, income, age structure. See [APIs & data sources](./apis-and-data-sources.md#us-census-acs) for the exact % Dual-Income formula (`B23007_006E / B23007_002E`). |
| BLS (Bureau of Labor Statistics) | 🟢 Live | Employment data |
| BEA (Bureau of Economic Analysis) | 🟢 Live | Regional economic indicators |
| FRED (St. Louis Fed) | 🟢 Live | Macro indicators |
| NCES CCD (public schools) | 🟢 Live | School + teacher counts per city |
| Apollo | 🟢 Live | Teacher contact enrichment |
| Apify (Google Maps scrapes) | 🟢 Live | Competitive landscape per city |
| Firecrawl | 🟢 Live | On-demand school/site scraping |
| SmartLead | 🟢 Live | Email sending engine, reply ingestion |
| Resend | 🟢 Live | Transactional email (digests, password reset) |
| Deepgram | 🟢 Live | Voice playback for AI assistant |

### 5. Data-flow diagram

```text
                ┌────────────────── External data sources ──────────────────┐
                │                                                            │
   Census · BLS · BEA · FRED · NCES · Apollo · Apify · Firecrawl
                │                                                            │
                └─────────────┬──────────────────────────────────────────────┘
                              ▼
                  Edge functions (seed / backfill / recompute)
                              ▼
                ┌──────────────────────────────────────────┐
                │           Lovable Cloud (DB + Auth)      │
                │  cities · teacher_prospects · candidates │
                │  smartlead_campaigns · email_threads     │
                │  user_roles · watchlists · saved_searches│
                └─────────┬───────────────────┬────────────┘
                          │                   │
            React app (4 screens)    Outbound: SmartLead → teachers
                          ▲                   │
                          │                   ▼
                          └─── webhook ── SmartLead replies
                                       (smartlead-webhook → DB → realtime → Inbox UI)
```

### 6. Guardrails (the rules pinned on the fridge)

These keep both humans and the in-app AI assistant from breaking the system.

1. **Scoring math is locked.** Pillar formulas and sub-metric weights baked into derived columns are owned by Sam. Users may move slider weights in the UI; nobody changes the underlying scoring code via AI.
2. **No silent deletes.** AI is never allowed to delete user-owned rows (candidates, watchlists, threads) without an explicit confirm-and-confirm-again flow.
3. **RLS first.** Every table that holds user data has Row-Level Security; every write is scoped to `auth.uid()`. The client cannot bypass this.
4. **Roles are server-side.** Admin/manager status comes from the `user_roles` table via the `has_role()` security-definer function. Never trust client storage for role checks.
5. **Stage gates are real.** A Candidate cannot drop into **Signing** without passing **Confirmation**. Enforced in `candidatePipelineStore` + DB triggers.
6. **AI cannot touch auth.** No AI flow can change auth settings, roles, or RLS policies.
7. **AI cannot invent data.** If the answer isn't in the database, the assistant must say so as a data gap.
8. **SmartLead gotcha.** `track_settings` uses **negative** booleans (`DONT_TRACK_OPEN`, `DONT_TRACK_CLICK`). Easy to flip backwards — see SmartLead spec.
9. **Secrets stay in edge functions.** No private key is ever shipped to the React bundle. Publishable/anon keys only on the client.
10. **Onboarding is parked.** Code exists at `/onboarding` but is Phase 2 — do not extend until the first signed franchisees are through.

---

## Part B — Developer deep-dive

### 7. Stack & hosting

- **Frontend:** React 18 + TypeScript 5 + Vite 5 + Tailwind 3 + shadcn/ui.
- **State:** React Query + Zustand stores per feature (`src/stores/`).
- **Backend:** Lovable Cloud (managed Postgres + Auth + Storage + Edge Functions).
- **Auth:** Email/password only. No Google/SSO. `AuthContext` + `ProtectedRoute`.
- **AI:** Lovable AI Gateway (`LOVABLE_API_KEY` in edge-function env).
- **Hosting:** `https://neuron-garage-franchise.lovable.app` (preview + published).

### 8. Repo map

| Path | What lives here |
|---|---|
| `src/pages/` | One file per route. `App.tsx` wires routes. |
| `src/components/<feature>/` | Feature-scoped components: city-scoring, teacher-prospects, email-outreach, candidate-pipeline, observability, dbHealth, neuron-ai, ask, onboarding. |
| `src/components/ui/` | shadcn primitives. |
| `src/components/AppSidebar.tsx` | Nav surface. |
| `src/components/DocShell.tsx` | Shared doc-page wrapper (this page uses it). |
| `src/hooks/` | Data + UI hooks, grouped by feature. |
| `src/stores/` | Zustand stores. |
| `src/lib/` | Pure helpers (scoring, normalization, formatting). |
| `src/data/` | Markdown specs imported via Vite `?raw`. |
| `src/integrations/supabase/` | Auto-generated client + types — **do not edit**. |
| `supabase/functions/<name>/` | Edge functions (Deno). |
| `supabase/functions/_shared/` | Cross-function libs + AI knowledge bases. |
| `supabase/migrations/` | SQL migrations. |
| `docs/architecture/` | Source markdown for sidebar doc pages (System Architecture, Prompts & AI Workflows, APIs & Data Sources). |
| `docs/handover/` | Source markdown for the Credentials & Handover sidebar page (no secrets in repo). |
| `docs/pending-approval/` | Internal-only — parked fixes waiting on Brett. Not surfaced in the sidebar. |

### 9. Edge function inventory

| Function | Purpose | Trigger | Key secrets |
|---|---|---|---|
| `ask` | Global Ask-AI chat (Neuron AI fallback) | HTTP from client | `LOVABLE_API_KEY` |
| `ask-city` | City Search inline Ask-AI | HTTP | `LOVABLE_API_KEY` |
| `neuron-ai` / `neuron-ai-confirm` | Floating Neuron AI assistant w/ tool calling | HTTP | `LOVABLE_API_KEY` |
| `ai-city-query` | NL → city filter translation | HTTP | `LOVABLE_API_KEY` |
| `city-analyst` | City explainability ("why Tier A?") | HTTP | `LOVABLE_API_KEY` |
| `teacher-search-ai` | Teacher-Search side panel AI | HTTP | `LOVABLE_API_KEY` |
| `observability-ai` | Data Observability AI | HTTP | `LOVABLE_API_KEY` |
| `users-guide-ai` | User's Guide chatbot | HTTP | `LOVABLE_API_KEY` |
| `csv-suggest-mapping` | Map CSV columns → teacher fields | HTTP | `LOVABLE_API_KEY` |
| `seed-cities-database` / `seed-cities-weather` | One-time seeding | Manual | Census/BLS keys |
| `backfill-census-gaps` / `backfill-public-schools` | Repair missing rows | Manual | Census/NCES keys |
| `recompute-city-derived` | Recompute pillar scores after weight change | Manual / trigger | — |
| `fetch-school-counts` | NCES pull | HTTP | NCES key |
| `fetch-teacher-prospects` | Apollo / Apify pull | HTTP | Apollo + Apify keys |
| `enrich-school-staff` | Firecrawl scrape | HTTP | Firecrawl key |
| `teacher-prospects-dedupe-count` | Pre-import dedupe | HTTP | — |
| `smartlead-proxy` | Server-side SmartLead REST proxy | HTTP | SmartLead key |
| `smartlead-push-leads` | Bulk push to SmartLead | HTTP | SmartLead key |
| `smartlead-webhook` | Inbound replies → DB → realtime | Webhook | SmartLead webhook secret |
| `send-transactional-email` / `process-email-queue` / `preview-transactional-email` | Resend integration | HTTP / cron | Resend key |
| `handle-email-unsubscribe` / `handle-email-suppression` | List-Unsubscribe + bounces | Webhook | Resend |
| `weekly-data-health-digest` | Cron digest to managers | Cron | Resend |
| `admin-create-user` | Manager-only user provisioning | HTTP (role-gated) | Service role |
| `deepgram-tts` | Voice playback for AI replies | HTTP | Deepgram key |

### 10. Database surface (entities, not schema)

Full canonical schema lives in `src/integrations/supabase/types.ts` (auto-generated). High-level entities:

- **`cities`** — 817+ US metros with raw metrics, derived pillar scores, tier label.
- **`teacher_prospects`** — scraped/imported teachers with fit signals + tags + source.
- **`candidates`** — promoted teachers, with stage, qualification scorecard, committee votes, stage history.
- **`smartlead_campaigns`** + **`smartlead_email_accounts`** — sending configuration mirror.
- **`email_threads`** + **`email_messages`** — inbox state, populated by `smartlead-webhook`.
- **`user_roles`** — `(user_id, role)` with enum `('admin','manager','user')`. Read via `has_role()`.
- **`watchlists`** + **`saved_searches`** — per-user City Search state.
- **`db_query_log`** — observability ring buffer.
- **`data_health_*`** — observability snapshots powering the weekly digest.

### 11. Neuron AI assistant architecture

> **Status: internal beta.** The floating launcher button is intentionally **not mounted** in `AppLayout` today. Neuron AI opens via **Cmd/Ctrl+K only**. Do not promote to all users until Haseeb signs off on tool-call safety + rate-limit handling. Per-screen Ask-AIs (Section 3a) are the production AI surfaces in the meantime.

```text
(launcher hidden) ──▶ Cmd/Ctrl+K ──▶ NeuronAiPanel ──▶ useNeuronAi
                                                         │
                                                         ▼
                                            POST /functions/neuron-ai
                                                         │
         ┌───────────────────────────────────────────────┴───────────────┐
         │  Grounding: APP_KNOWLEDGE + SCREEN_KNOWLEDGE[currentRoute]    │
         │  Tools: query_cities · explain_city · apply_screen_state ·    │
         │         query_candidates · query_campaigns · navigate ·       │
         │         add_to_watchlist · change_candidate_stage             │
         └───────────────────────────────────────────────┬───────────────┘
                                                         ▼
                                  Model: google/gemini-2.5-flash
                                                         ▼
                  Tool calls → DB (RLS-scoped) → response + action chips
                                                         ▼
                   Destructive actions (stage change) ──▶ neuron-ai-confirm
```

Knowledge sources live in `supabase/functions/_shared/appKnowledge.ts` (system rules) and `aiAssistantKB.ts` (factual KB). These files are **AI-only** — the human-facing version is this doc.


### 12. Realtime paths

- **Inbox:** `smartlead-webhook` writes to `email_messages` → Supabase Realtime on `email_threads` table → `EmailOutreachV2` re-renders.
- **Candidate stage history:** DB trigger writes to `candidate_stage_history` → realtime subscription updates Kanban.
- **DB Debug pill:** client-side `queryLogger` ring buffer, surfaced only to managers via `useIsManager()`.

### 13. Observability subsystem

Self-contained — do not duplicate here. See:
- **Operator guide:** Observability Guide page (sidebar)
- **Engineering spec:** Observability Spec page (sidebar)
- **Live dashboard:** Data Observability (sidebar → top group)


### 14. Security model

- **RLS everywhere.** Every `public` table has policies; default deny.
- **Grants explicit.** Every `CREATE TABLE` migration ships matching `GRANT` statements.
- **Roles via `user_roles` + `has_role()` security-definer function.** Never on `profiles`. Never client-side.
- **Edge function secrets** are scoped to `supabase/functions/*` env, never bundled.
- **Auth:** email/password only. Email verification on. No anonymous sign-ins.
- **Repo is private to the org.** Even so, never commit secrets — the Credentials & Handover sidebar page references a vault, never the values.

### 15. How to extend safely — checklist for new contributors

1. Read this doc end-to-end.
2. Read the per-feature spec for the area you're touching (SmartLead, Observability, etc.).
3. Re-read the **Guardrails** list above. If your change would violate one, stop and raise it with Brett.
4. New table? Write a migration with `CREATE TABLE` → `GRANT` → `ENABLE RLS` → `CREATE POLICY`, in that order, in one migration.
5. New AI call? Use Lovable AI Gateway (`LOVABLE_API_KEY`) via an edge function. Pick the cheapest model that does the job.
6. New external integration? Add the key as a Lovable Cloud secret (never `.env`), and update the Integrations table in Section 4 of this doc.
7. New screen? Wire it into `src/App.tsx` and `src/components/AppSidebar.tsx`, and add a one-liner to Section 2 of this doc.
8. Touching scoring math? **Don't.** Open a ticket for Sam.

---

*This document is the single source of truth for system architecture. If something here is wrong, fix this file first, then the code.*
