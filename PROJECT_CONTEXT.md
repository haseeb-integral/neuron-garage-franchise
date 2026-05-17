# PROJECT_CONTEXT.md — Neuron Garage

> Snapshot date: May 17, 2026
> Live URL: https://neuron-garage-franchise.lovable.app
> Preview: https://id-preview--c74b81ad-10d7-4a10-b6c8-de17f48a663e.lovable.app
> Stack: React + TS + Vite + Tailwind + shadcn, Lovable Cloud (Supabase) backend

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
| `cities` | Core city records (name, state, lat/lng, tier, composite score, population, etc.) |
| `city_category_scores` | Per-city, per-category (6 categories) scores |
| `city_market_signals` | Raw signal rows per city (label/value/source/delta) — drives "Show Formula" |
| `city_competitors` | Apify-scraped competitor records per city |
| `city_fetch_jobs` | Audit log for per-city data refresh jobs |
| `us_cities_geo` | Reference table of US cities (lat/lng/pop) — read-only |
| `custom_criteria` | User-defined extra scoring criteria |
| `scoring_config` | Per-user master-weight preset |
| `saved_searches` | Per-user saved slider configs (master + sub weights) |
| `watchlist_items` | Per-user favorites (cities) |
| `teacher_prospects` | Teacher records (city/state, school, fit_score, status, apify_run_id) |
| `candidates` | Pipeline candidates (stage, fit_score, fit_tag, assignment) |
| `candidate_profiles` | Long-form candidate profile (background, capital, motivation) |
| `candidate_qualification` | Scored qualification rubric (financial / leadership / teaching / culture / market) |
| `candidate_votes` | Selection committee votes per candidate |
| `candidate_stage_history` | Stage transition log |
| `candidate_checklist_items` | Stage-specific checklists (auto-seeded on entering `confirmation`) |
| `onboarding_records` | Franchisee onboarding header rows |
| `onboarding_steps` | Per-record step list |

DB functions: `handle_new_user`, `has_role`, `update_updated_at_column`, `fill_city_coords`, `seed_confirmation_checklist`, `trg_seed_confirmation_checklist`.

No storage buckets configured.

---

## 3. Edge Functions (deployed)

- `admin-create-user` — admin-only user provisioning
- `fetch-city-market-data` — legacy city data refresh
- `fetch-city-market-data-sow` — SOW-aligned city refresh (46-metric pull → scoring)
- `fetch-school-counts` — NCES CCD public-elementary counts per city
- `enrich-school-staff` — staff/teacher enrichment for a given school
- `fetch-teacher-prospects` — Apify-driven teacher prospect pull per city
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
| Apify (Google Maps actor) | Competitor + teacher scraping | `APIFY_API_TOKEN`, `APIFY_GOOGLE_MAPS_ACTOR_ID` | Live |
| Firecrawl | Web scraping / enrichment | `FIRECRAWL_API_KEY` | Live |
| Lovable AI Gateway | In-app AI (fit scoring, summaries) | `LOVABLE_API_KEY` | Live |
| Supabase (Lovable Cloud) | DB / Auth / Edge / Storage | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY(S)`, `SUPABASE_SECRET_KEYS`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWKS`, `SUPABASE_DB_URL` | Live |
| GreatSchools | Private + charter school counts | _not yet set_ (`GREATSCHOOLS_API_KEY` pending) | **Blocked — waiting on Brett's key** |
| SmartLead ("Integral Leads") | Email outreach send | _not yet set_ | **Not wired — sprint task #17** |
| Apollo | Teacher sourcing | _not yet set_ | **Not wired — sourcing decision open** |
| DonorsChoose | Teacher fit signal | _none (public API)_ | **Not wired** |
| Clay | Email enrichment waterfall | _not yet set_ | **Not wired** |

---

## 5. Known bugs / broken or incomplete features

Active limitations:
- **City Search uses live per-city fetches** — 5+ min per city. National ranked list not yet possible. Fix in progress = Task #0 database layer (`us_cities_scored` table, due May 20).
- **Teacher Search reads placeholder/Apify-only data** — `teacher_prospects_master` table not yet built; no Apollo / vendor list / DonorsChoose integration.
- **Email Outreach** — SmartLead not connected; no real sends.
- **Candidate Pipeline** — populated with placeholder candidates, not yet wired to Teacher → Lead conversion.
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
