# Neuron Garage — Franchise Recruiting SaaS

Internal tool for Kaylie Reed's franchise education company. Helps identify the best U.S. cities for franchise expansion and recruit the right educators to run each location. 3 users. Not public-facing.

**Live app:** https://neuron-garage-franchise.lovable.app

---

## How to Orient (for AI agents and new team members)

Read files in this order:

1. `CLAUDE.md` — rules, stack, what not to touch
2. `OPEN_TASKS.md` — what to build right now
3. `PROJECT_CONTEXT.md` — live app state (screens, tables, APIs)
4. `DATABASE_LAYER_SPEC.md` — current build spec (Task #0 blocker)
5. `TEACHER_IDEAL_PROFILE.md` — who we are recruiting
6. `MAY15_MEETING_NOTES.md` — most recent client decisions

---

## File Map

| File | What it is |
|---|---|
| `CLAUDE.md` | AI constitution — rules, stack, working style |
| `OPEN_TASKS.md` | Prioritized task list — the single build queue |
| `PROJECT_CONTEXT.md` | Live snapshot of app state from Lovable — update regularly |
| `HOW_IT_WORKS.md` | Narrative of how the product works end-to-end (low-churn) |
| `APIS.md` | Per-API reference: secrets, usage, cost, owner, seed vs live |
| `DATABASE_LAYER_SPEC.md` | Schema + seeding plan for city and teacher tables |
| `TEACHER_IDEAL_PROFILE.md` | Franchisee profile, fit scoring criteria, Apollo query templates |
| `MAY15_MEETING_NOTES.md` | May 15 client review — source of truth for recent decisions |
| `DESIGN.md` | UI/UX rules and component standards |
| `WORKFLOW.md` | Branch, PR, deploy workflow |
| `QA_CHECKLIST.md` | Pre-merge QA checklist |
| `LATER.md` | Deferred ideas — do not build without explicit instruction |

---

## Tech Stack (quick ref)

- **Frontend:** React + TypeScript on Lovable
- **Backend:** Supabase (Lovable Cloud) — tables, edge functions, auth
- **Deployment:** Cloudflare Pages auto-deploy from `main`
- **City data:** US Census, BLS, FRED, NCES
- **Teacher data:** Apollo, Apify, DonorsChoose (pending)
- **Enrichment:** Firecrawl, Clay (pending decision)
- **Email:** SmartLead ("Integral Leads")

---

## ⚠️ Important Notes

- `main` = production. Every push goes live.
- One branch per change. PR + review before merging.
- `PROJECT_CONTEXT.md` is the live app state file — paste Lovable's current inventory into it regularly so all AI agents stay accurate.
