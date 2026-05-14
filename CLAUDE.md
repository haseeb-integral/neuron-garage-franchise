# CLAUDE.md

> Constitution for AI assistants working on Neuron Garage.
> Read automatically by Claude Code on every session.
> If a rule here is wrong, fix the file.

---

## Project

**Neuron Garage** — internal franchise recruiting SaaS for Kaylie Reed's
franchise education company. 3 users max. Not public-facing.

Four features (in build order this sprint):

1. City Search — 46-metric / 6-category scoring engine (live, needs enhancements)
2. Teacher Prospects — find elementary teachers in scored cities (wire via Firecrawl)
3. Email Outreach — personalized AI emails via SmartLead ("Integral Leads")
4. Candidate Pipeline — Kanban: prospect → qualification → confirmation → signing

Live URL: `neuron-garage-franchise.lovable.app`

For full context, read `PROJECT_CONTEXT.md` in the Claude Project, or the
May 8 meeting transcript.

---

## Sprint mode (active)

3-day sprint to ship Module 1 fully API-connected. Build order is fixed:
City Search → Teacher Prospects → Email Outreach → Candidate Pipeline.

Implications:
- Ship daily. Working > polished.
- No refactoring unless it blocks a sprint task.
- No new ideas. Defer everything not on the sprint list to a "Later" file.
- If something is broken, fix forward, don't redesign.

---

## Stack

- React + TypeScript frontend, built and hosted on Lovable
- Backend: **Lovable Cloud** (Supabase under the hood) — 15 tables, edge functions, auth, storage
- Edge functions handle data refresh + scoring engine logic
- Auth: email/password only (Google/MS/SSO intentionally removed)
- GitHub: `haseeb-integral/neuron-garage-franchise`, working on `main`
- Deployment: Cloudflare Pages auto-deploys from `main`
  - Production: `neuron-garage-franchise.pages.dev`
  - Lovable preview: `neuron-garage-franchise.lovable.app`
- AI in-app: Lovable's built-in AI layer
- **Scraping/enrichment: Firecrawl** (already connected — use it)
- **Email outreach: SmartLead** (onboarded, integration to build)
- Live data (Feature 1): Apify, US Census, BLS, Federal Reserve

---

## Non-negotiable rules

1. **Show the math.** Every widget with a calculated number must have a
   "Show Formula" affordance that reveals inputs, weights, and formula.
   Sam will reject anything that hides its logic.

2. **No new features without explicit request.** Build only what's on the
   sprint list. Simplicity wins.

3. **Internal tool, 3 users.** Optimize for accuracy and reliability, not
   pretty UX. Clunky is fine if it's clear.

4. **Source of truth = May 8 meeting transcript + notes.** When older docs
   disagree, May 8 wins.

5. **Master sliders auto-rebalance to 100. Sub-metric weights auto-normalize on Apply.**
   Sub-weights are typed as relative-importance numbers (no upper bound). On Apply,
   each enabled metric's share = `sub_i / Σ(enabled sub-weights) × 100`, then feeds
   the composite client-side: `categoryScore = Σ(sub_share × normalized_metric)` and
   `composite = Σ(master_share × categoryScore)`. Empty category falls back to the
   server-stored category score. Every drawer surfaces "Show Formula" per Rule 1.

6. **One change at a time.** Small reversible steps. Lovable's undo is bad —
   if you break something, fix it forward.

7. **Layout is locked.** Left sidebar (collapsible) with 5 items: Dashboard,
   City Search, Teacher Prospects, Email Outreach, Candidate Pipeline.
   Do not redesign navigation.

8. **Use what's already connected.** Firecrawl for scraping/enrichment.
   SmartLead for email. Apify + Census + BLS + Fed for city data. Don't
   propose new providers mid-sprint.

---

## Working style (Karpathy-influenced)

- **Read before you write.** Look at existing code before suggesting changes.
- **One thing at a time.** A single Lovable prompt / PR does one thing.
- **Be explicit about assumptions.** Don't invent confidently. Flag guesses.
- **Prefer boring tech.** Existing libraries over new ones.
- **Sprint-mode trade-off:** UI tests deferred until after Module 1 ships.
  Scoring engine logic should still be sanity-checked by exporting and
  manually verifying.

---

## When working with Haseeb (non-technical)

- Explain the *why* before the *how*.
- For each change, give: (1) what changes, (2) why, (3) risk (low/med/high),
  (4) how to undo.
- Provide exact prompts when he'll be pasting them into Lovable.
- Don't assume terminal/Git proficiency. Spell out commands.

---

## What NOT to touch without asking

- The scoring engine math (46 metrics, weighting formula). Changes go through Sam.
- The Kanban drag-and-drop confirmation gate (can't drop into "Signing"
  without passing "Confirmation"). Already working.
- Auth. Deliberately email-only.
- The list of 38 non-registration states in the SOW. Hardcoded business logic.
- The 5-item left-sidebar layout.

---

## Sprint task list

See `OPEN_TASKS.md` for the live, prioritized list. Read it at the start of
every session.
