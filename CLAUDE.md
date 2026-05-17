# CLAUDE.md

> Constitution for AI assistants working on Neuron Garage.
> Read automatically by Claude Code on every session.
> If a rule here is wrong, fix the file — do not work around it.

---

## Source of Truth Hierarchy

When files conflict, the newer decision wins:

1. **May 15 meeting** (`MAY15_MEETING_NOTES.md`) — most recent client decisions, overrides everything older
2. **This file** (`CLAUDE.md`) + active task files (`OPEN_TASKS.md`, `DATABASE_LAYER_SPEC.md`, `TEACHER_IDEAL_PROFILE.md`)
3. **May 8 meeting transcript** — background only; superseded by May 15 where they conflict
4. **Older spec files** — background only

---

## Project

**Neuron Garage** — internal franchise recruiting SaaS for Kaylie Reed's franchise education company. 3 users max (Kaylie, Sam, Haseeb). Not public-facing.

Four features in build order:

1. **City Search** — 46-metric / 6-category scoring engine. UI is live. Blocked on database layer (Task #0).
2. **Teacher Search** — find and score teachers in target cities. Blocked on database layer (Task #0).
3. **Email Outreach** — AI-personalized emails via SmartLead ("Integral Leads")
4. **Candidate Pipeline** — Kanban: prospect → qualification → confirmation → signing

> ⚠️ Task #0 (database layer) blocks City Search and Teacher Search. See `OPEN_TASKS.md` and `DATABASE_LAYER_SPEC.md`.

**Live URL:** `neuron-garage-franchise.lovable.app`

---

## Files to Read at Session Start

| File | Read when |
|---|---|
| `OPEN_TASKS.md` | Every session — this is the build queue |
| `DATABASE_LAYER_SPEC.md` | Any work touching City Search, Teacher Search, or Supabase tables |
| `TEACHER_IDEAL_PROFILE.md` | Any work touching Teacher Search or fit scoring |
| `MAY15_MEETING_NOTES.md` | When you need context on why a decision was made |
| `PROJECT_CONTEXT.md` | When you need the live app state (screens, tables, edge functions) |
| `DESIGN.md` | Any UI work |
| `QA_CHECKLIST.md` | Before any PR merge |

---

## Stack

- **Frontend:** React + TypeScript, built and hosted on Lovable
- **Backend:** Lovable Cloud (Supabase) — tables, edge functions, auth, storage
- **Auth:** Email/password only. Google/MS/SSO intentionally removed — do not re-add.
- **GitHub:** `haseeb-integral/neuron-garage-franchise`, working on `main`
- **Deployment:** Cloudflare Pages auto-deploys from `main`
  - Production: `neuron-garage-franchise.pages.dev`
  - Lovable preview: `neuron-garage-franchise.lovable.app`
- **City data:** US Census ACS, BLS, FRED, NCES CCD — all wired
- **Teacher data:** Apollo (have access), Apify (connected), DonorsChoose (not yet wired)
- **Enrichment/scraping:** Firecrawl (connected)
- **Email outreach:** SmartLead / "Integral Leads" (onboarded, integration to build)
- **GreatSchools API:** Waiting on Brett's key (`GREATSCHOOLS_API_KEY`)

---

## Non-Negotiable Rules

1. **Show the math.** Every widget with a calculated number must have a "Show Formula" affordance revealing inputs, weights, and formula. Sam will reject anything that hides its logic.

2. **No new features without explicit request.** Build only what is on the sprint list. Defer everything else to `LATER.md`.

3. **Internal tool, 3 users.** Optimize for accuracy and reliability, not polished UX. Clunky is fine if it is clear.

4. **Source of truth = May 15 meeting notes.** When older docs disagree, May 15 wins. See hierarchy above.

5. **Master sliders auto-rebalance to 100%. Sub-metric weights do NOT auto-rebalance.** Sub-weights are typed as relative-importance numbers (no upper bound). On Apply, each enabled metric's share = `sub_i / Σ(enabled sub-weights) × 100`, then feeds composite client-side: `categoryScore = Σ(sub_share × normalized_metric)` and `composite = Σ(master_share × categoryScore)`. Empty category falls back to server-stored category score. Every drawer surfaces "Show Formula" per Rule 1.

6. **One change at a time.** Small reversible steps. Lovable's undo is unreliable — fix forward, don't redesign.

7. **Layout is locked.** Left sidebar (collapsible) with 5 items: Dashboard, City Search, Teacher Search, Email Outreach, Candidate Pipeline. Do not redesign navigation.

8. **Use what is already connected.** Firecrawl for scraping. SmartLead for email. Census + BLS + FRED + NCES for city data. Apollo for teacher data. Do not propose new providers mid-sprint.

---

## Working Style

- **Read before you write.** Look at existing code before suggesting changes.
- **One thing at a time.** A single Lovable prompt or PR does one thing.
- **Be explicit about assumptions.** Flag guesses. Do not invent confidently.
- **Prefer boring tech.** Existing libraries over new ones.
- **Sprint trade-off:** UI tests deferred until after Module 1 ships. Scoring engine logic should be sanity-checked by exporting and manually verifying.

---

## When Working with Haseeb (Non-Technical)

- Explain the *why* before the *how*.
- For each change give: (1) what changes, (2) why, (3) risk low/med/high, (4) how to undo, (5) exact Lovable prompt OR branch workflow steps.
- Provide exact prompts when he will be pasting into Lovable.
- Do not assume terminal/Git proficiency. Spell out commands.

---

## What NOT to Touch Without Asking

- **Scoring engine math** (46 metrics, weighting formula) — changes go through Sam only
- **Kanban confirmation gate** — cannot drop into "Signing" without passing "Confirmation". Already working.
- **Auth** — deliberately email-only
- **38 non-registration states** — hardcoded business logic, do not change
- **5-item left sidebar layout** — locked
- **`teacher_type` values** — `"active" | "retired" | "camp_enrichment"` — defined in `DATABASE_LAYER_SPEC.md`

---

## Sprint Task List

See `OPEN_TASKS.md` for the live prioritized list. Read it at the start of every session.

Current status as of May 18:
- **Task #0 (database layer)** — in progress, due Tuesday May 20. Blocks everything.
- **Tasks 1–10** — completed (see `OPEN_TASKS.md` completed section)
- **Tasks 11+** — pending, unblocked after Task #0
