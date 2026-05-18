# Neuron Garage — Franchise Recruiting SaaS

Internal tool for Kaylie Reed's franchise education company. Helps identify the best U.S. cities for franchise expansion and recruit the right educators to run each location. 3 users. Not public-facing.

**Live app:** https://neuron-garage-franchise.lovable.app

---

## 🚨 Read These First (humans AND AI agents)

If you are an AI agent (Claude, Codex, Cursor, Aider, Perplexity, etc.) or a new contributor: **you MUST read all six files below before answering any non-trivial question or writing any code.** Do not rely on assumptions or older training data — these files are the source of truth.

Read in this order:

1. **`README.md`** — this file (orientation + file map)
2. **`AGENTS.md`** — rules + what not to touch (Claude Code users: `CLAUDE.md` is a stub that points here)
3. **`PROJECT_CONTEXT.md`** — what exists right now (screens, tables, edge functions, APIs, bugs)
4. **`HOW_IT_WORKS.md`** — how the product behaves end-to-end
5. **`APIS.md`** — third-party integrations + database seeding plan
6. **`OPEN_TASKS.md`** — what to build next

Then: **read `GLOSSARY.md`** whenever you hit an unfamiliar term (Fit Score, Tier A, Non-registration state, Integral Leads, etc.).

---

## File Map

| File | What it is |
|---|---|
| `AGENTS.md` | **Canonical AI rules** — read first. Codex/Cursor/Aider auto-load this. |
| `CLAUDE.md` | Stub pointing to `AGENTS.md` (Claude Code auto-loads this name) |
| `OPEN_TASKS.md` | Prioritized task list — the single build queue |
| `PROJECT_CONTEXT.md` | Live snapshot of app state from Lovable — update regularly |
| `HOW_IT_WORKS.md` | Narrative of how the product works end-to-end (low-churn) |
| `APIS.md` | Per-API reference: secrets, usage, cost, owner, seed vs live |
| `GLOSSARY.md` | One-line definitions for every domain term |
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
