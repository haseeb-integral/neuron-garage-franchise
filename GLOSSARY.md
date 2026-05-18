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
- **Show Formula** — the affordance (button / drawer / tooltip) that exposes inputs, weights, and the formula behind any calculated number. Non-negotiable per Rule 1.
- **Saved Search** — user-saved slider configuration in `saved_searches` table.
- **Watchlist / Favorites** — same thing. UI says "Favorites", table is `watchlist_items`. Only one list works today.
- **Non-registration state** — one of 38 U.S. states/territories where Kaylie's franchise cannot legally register. Hardcoded business logic. Do not change.
- **Fit Score** (teacher) — 0–100 score in `teacher_prospects.fit_score`. See `TEACHER_IDEAL_PROFILE.md`.
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
