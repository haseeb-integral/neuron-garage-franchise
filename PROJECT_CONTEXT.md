# PROJECT_CONTEXT.md — Neuron Garage

> Snapshot date: May 19, 2026 (Ask AI absolute-weights mode shipped same day; Email Outreach / SmartLead Phases 1–5 complete; legacy `cities` / `city_category_scores` / `city_fetch_jobs` / `city_competitors` tables dropped; Add City rewired to `us_cities_scored`; `county_name` backfilled 960/960 from `us_cities_geo`; `metro_area` backfilled 326/960 — remainder pending; in-app `/spec` page rewritten to v1.2 same day and is in sync with this file)
> Live URL: https://neuron-garage-franchise.lovable.app
> Preview: https://id-preview--c74b81ad-10d7-4a10-b6c8-de17f48a663e.lovable.app
> Stack: React + TS + Vite + Tailwind + shadcn, Lovable Cloud (Supabase) backend
> Companion files: `HOW_IT_WORKS.md` (product behavior), `APIS.md` (integration reference)

---

## 0. Maintenance — which file to update when something changes

| Change | Update file(s) |
|---|---|
| Added / removed a page or route | `PROJECT_CONTEXT.md` § 1 + `HOW_IT_WORKS.md` |
| Added / removed / renamed a Supabase table or column | `PROJECT_CONTEXT.md` § 2 |
| Added / removed an edge function | `PROJECT_CONTEXT.md` § 3 (+ `APIS.md` if it calls a new API) |
| Wired a new third-party API | `APIS.md` (new block) + `PROJECT_CONTEXT.md` § 4 |
| Removed an API or rotated key owner | `APIS.md` only |
| Product behavior changed (flow, math, rule) | `HOW_IT_WORKS.md` (+ successor meeting-notes file if it was a client decision) |
| Known bug fixed or new bug found | `PROJECT_CONTEXT.md` § 5 |
| Sprint task done | `OPEN_TASKS.md` |
| Visual rule changed | `DESIGN.md` (rule changes only — not for one-off tweaks) |

Rule of thumb: `PROJECT_CONTEXT.md` is **high-churn inventory**, `HOW_IT_WORKS.md` is **low-churn behavior**, `APIS.md` is **medium-churn reference**. Regenerate this file before each weekly client review.

---

## 1. Screens / Pages (React Router routes)

Public:
- `/auth` — Auth.tsx — email/password sign-in & sign-up (Google/Microsoft/SSO buttons removed; HIBP leaked-password check disabled)
- `/reset-password` — ResetPassword.tsx — password reset flow

Protected (wrapped in `AppLayout` + `ProtectedRoute`):
- `/` — Index.tsx — Dashboard / home
- `/city-scoring` — CityScoring.tsx — **City Search** (46-metric, 6-category scoring engine)
- `/teacher-prospects` — TeacherProspects.tsx — **Teacher Search** (label renamed in UI; route still `/teacher-prospects`)
- `/email-outreach` — EmailOutreachV2.tsx — Email outreach (V2 is the active page; legacy `EmailOutreach.tsx` exists but is not routed)
- `/candidate-pipeline` — CandidatePipeline.tsx — Kanban candidate pipeline
- `/onboarding` — Onboarding.tsx — Franchisee onboarding tracker
- `/settings/team` & `/users` — TeamMembers.tsx — Team/user management
- `/spec` — Spec.tsx — Internal spec viewer
- `*` — NotFound.tsx — 404

---

## 2. Supabase tables (public schema)

All tables have RLS enabled. `authenticated` role can read/write unless noted.

| Table | Purpose |
|---|---|
| `profiles` | User profile (auto-created on signup via `handle_new_user` trigger). Self-update only. |
| `user_roles` | Role assignments (`app_role` enum: admin / manager / etc.). Admin-only writes. |
| `cities` | **DROPPED May 19** — legacy table, superseded by `us_cities_scored`. |
| `us_cities_scored` | **Canonical city table.** Pre-scored (Task #0). Includes `public_school_count` / `public_school_enrollment` (all open K–12 public schools) and `public_elementary_count` / `public_elementary_enrollment` (derived subset, `lowest_grade_offered ≤ 5`) as cached counts. *Renamed May 18.* Authenticated users can now INSERT (Add City flow via `AddCityModal`). |
| `public_schools` | One row per NCES open public school nationally (PK = `nces_id`). Stores name, district, address, lat/lng, grades, level, type, enrollment. `is_elementary_serving` is a generated column (`lowest_grade_offered ≤ 5`). FK `us_cities_scored_id` links each school to its seeded city. **Source of truth for school-level data**; `us_cities_scored.public_*_count` columns remain as cached counts. Backfilled May 18 — 38,196 schools across 948 cities. *Added May 18 to unblock Teacher Search seeding, `enrich-school-staff`, and City Detail "Show Formula" school list.* |
| `city_category_scores` | **DROPPED May 19** — legacy per-category scores now stored on `us_cities_scored`. |
| `city_market_signals` | Raw signal rows per city (label/value/source/delta) — drives "Show Formula" |
| `city_competitors` | **DROPPED May 19** — legacy Apify competitor cache; competitor data will be re-seeded into a new table when B7 runs. |
| `city_fetch_jobs` | **DROPPED May 19** — legacy refresh audit log; new seed flow logs centrally. |
| `us_cities_geo` | Reference table of US cities (lat/lng/pop) — read-only. Used by `AddCityModal` for case-insensitive city+state lookup before inserting into `us_cities_scored`. |
| `custom_criteria` | User-defined extra scoring criteria |
| `scoring_config` | Per-user master-weight preset |
| `saved_searches` | Per-user saved slider configs (master + sub weights) |
| `watchlist_items` | Per-user favorites (cities) |
| `teacher_prospects` | Teacher records (city/state, school, fit_score, status, apify_run_id). FK columns `school_nces_id` (→ `public_schools.nces_id`) and `us_cities_scored_id` (→ `us_cities_scored.id`) added May 18 plus `teacher_type` (`active` / `retired` / `camp_enrichment`), `subject`, `segment`, `linkedin_url`, `donorschoose_id`, `enrichment_source`, `last_enriched_at` to support fit scoring + dedupe. |
| `candidates` | Pipeline candidates (stage, fit_score, fit_tag, assignment) |
| `candidate_profiles` | Long-form candidate profile (background, capital, motivation) |
| `candidate_qualification` | Scored qualification rubric (financial / leadership / teaching / culture / market) |
| `candidate_votes` | Selection committee votes per candidate |
| `candidate_stage_history` | Stage transition log |
| `candidate_checklist_items` | Stage-specific checklists (auto-seeded on entering `confirmation`) |
| `onboarding_records` | Franchisee onboarding header rows |
| `onboarding_steps` | Per-record step list |
| `smartlead_events` | Webhook event log from SmartLead (event_type, campaign_id, lead_email, payload jsonb, `reply_intent` enum). Realtime-enabled — Inbox panel subscribes for live updates. *Added Phase 5, May 19.* |
| `campaign_cache` | Cached snapshot of SmartLead campaigns (id, name, status, stats) refreshed by `smartlead-proxy`. Lets Batches/Inbox panels resolve campaign names without re-hitting the API. *Added Phase 3.* |
| `prospects_staging` | Import-wizard staging table for leads en route to SmartLead. Columns include `batch_id`, `source` (Apollo / Clay / LinkedIn Navigator / CSV / Manual), `qa_status` (pending / approved / rejected), `smartlead_lead_id`, `pushed_at`. *Added Phase 2.* |

DB functions: `handle_new_user`, `has_role`, `update_updated_at_column`, `fill_city_coords`, `seed_confirmation_checklist`, `trg_seed_confirmation_checklist`.

No storage buckets configured.

---

## 3. Edge Functions (deployed)

- `admin-create-user` — admin-only user provisioning
- `ai-city-query` — Lovable AI Gateway proxy for "Ask AI" answers on the City Search screen. Returns `{ summary, filters, weightMode: "absolute" | "delta", absoluteWeights, weightAdjustments, reasoning_steps, dataGaps }`. **Absolute mode** (May 19) honors literal user requests like "100% demand" exactly — sliders snap to the named numbers, unmentioned categories go to 0. **Delta mode** keeps the old ±20 nudge for vague intents.
- ~~`fetch-city-market-data`~~ — **DELETED May 19** (legacy)
- ~~`fetch-city-market-data-sow`~~ — **DELETED May 19** (legacy SOW refresh; superseded by bulk `seed-cities-database`)
- `fetch-school-counts` — NCES CCD public-elementary counts per city
- `seed-cities-database` — bulk seed of `us_cities_scored` (Census/BLS/BEA/FRED/NCES) **and** per-school upsert into `public_schools` using the same NCES response (no extra API calls). 948 cities seeded, all with `composite_score_default` populated.
- `seed-cities-weather` — Open-Meteo Historical Weather seed into `us_cities_scored` (snowfall, avg temp, sunny days, severe-weather days)
- `backfill-public-schools` — iterates seeded cities, refetches NCES K-12 list, upserts into `public_schools` (one row per school, on `nces_id`). Now redundant for newly-seeded cities since seed function writes both — keep for full rebuilds.
- `enrich-school-staff` — staff/teacher enrichment for a given school
- `fetch-teacher-prospects` — Apify-driven teacher prospect pull per city
- `smartlead-proxy` — server-side proxy to the SmartLead REST API (lists/creates campaigns, pushes leads, pulls analytics overview, manages email accounts, runs connection-health check). Uses `SMARTLEAD_API_KEY`. Rate-limit aware (10 req / 2s).
- `smartlead-webhook` — public webhook receiver for SmartLead events (`EMAIL_SENT`, `EMAIL_REPLIED`, `EMAIL_BOUNCED`, `EMAIL_OPENED`, `EMAIL_CLICKED`). Writes to `smartlead_events`; classifies replies into `reply_intent` (`HOT` / `NOT_INTERESTED` / `OOO` / `NEUTRAL`) via keyword classifier.
- Shared modules: `_shared/cityGeo.ts`, `_shared/metricFetchers.ts`, `_shared/scoring.ts`

---

## 4. Third-party APIs wired in

| Provider | Purpose | Secret name | Status |
|---|---|---|---|
| US Census ACS | Population, children, income, density | `CENSUS_API_KEY` | Live |
| BLS | STEM jobs, labor force participation | `BLS_API_KEY` | Live |
| BEA | Regional income metrics | `BEA_API_KEY` | Live |
| FRED (Federal Reserve) | Regional median income, COLI | _(no key — public)_ | Live |
| NCES CCD (Urban Institute) | Public elementary school counts | _(no key — public)_ | Live |
| NCES PSS (embedded Excel) | Private elementary counts + enrollment | _(no key — static lookup)_ | Live (636/960 cities; full re-pull = B10a) |
| Open-Meteo Historical Weather | Climate signals per city (snowfall, temp, sunny days) | _(no key — public)_ | Live (506/960 seeded; remaining batched — B8) |
| Apify (Google Maps actor) | Competitor + teacher scraping | `APIFY_API_TOKEN`, `APIFY_GOOGLE_MAPS_ACTOR_ID` | Live |
| Firecrawl | Web scraping / enrichment | `FIRECRAWL_API_KEY` | Live |
| Lovable AI Gateway | In-app AI (fit scoring, summaries) | `LOVABLE_API_KEY` | Live |
| Supabase (Lovable Cloud) | DB / Auth / Edge / Storage | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY(S)`, `SUPABASE_SECRET_KEYS`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWKS`, `SUPABASE_DB_URL` | Live |
| SmartLead ("Integral Leads") | Email outreach: campaigns, lead push, analytics, webhooks | `SMARTLEAD_API_KEY` | **Live ✅ (Phases 1–5 complete, May 19)** |
| GreatSchools | Private + charter school counts | _not yet set_ (`GREATSCHOOLS_API_KEY` pending) | **Blocked — waiting on Brett's key** |
| Apollo | Teacher sourcing | _not yet set_ | **Not wired — sourcing decision open** |
| DonorsChoose | Teacher fit signal | _none (public API)_ | **Not wired** |
| Clay | Email enrichment waterfall | _not yet set_ | **Not wired** |

---

## 5. Known bugs / broken or incomplete features

Active limitations:
- **City Search** — `us_cities_scored` seeded with 948 cities and composite scores; national ranked list now possible. UI wiring to read from seed table is the next step.
- **Teacher Search reads placeholder/Apify-only data** — `teacher_prospects_master` table not yet built; no Apollo / vendor list / DonorsChoose integration. `teacher_prospects` now has the FK and enrichment columns waiting on the master table + sourcing.
- **`candidates` table** — no FKs to `public_schools` / `us_cities_scored`, no `source_segment` column. Promotion from teacher → candidate cannot carry context until added (see OPEN_TASKS B3).
- ~~**`cities` vs `us_cities_scored`** — consolidated.~~ ✅ May 19 — legacy `cities` (+ `city_category_scores`, `city_fetch_jobs`, `city_competitors`) dropped; `us_cities_scored` is the canonical city table. Add City flow now writes there via `us_cities_geo` lookup.
- **Email Outreach** — SmartLead wired end-to-end (connection, campaigns, lead import wizard, analytics, inbox, webhooks, reply-intent classification). Still needs Teacher Search → Import Wizard handoff before daily use.
- **Candidate Pipeline** — populated with placeholder candidates, not yet wired to Teacher → Lead conversion (SmartLead reply → candidate promotion is the next link).
- **GreatSchools** — private/charter elementary counts missing on every city (waiting on API key purchase).
- **Multiple named favorites lists** — only a single favorites list works; multi-list UI not built.
- **PDF export of candidate lead sheet** — not implemented.

Auth / config notes (intentional, not bugs):
- Google / Microsoft / SSO sign-in removed from `/auth` by request.
- HIBP leaked-password check disabled (`password_hibp_enabled: false`) so users can pick any password meeting length rules.
- Email auto-confirm is OFF — users must verify email before sign-in.

No open console errors reported in current session.

---

*Generated from a live read of `src/App.tsx`, `supabase/functions/`, Supabase schema, secrets list, and `OPEN_TASKS.md` on May 17, 2026. Re-generate before each weekly client review.*
