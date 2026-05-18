## What to build

### Your question first: CLAUDE.md is Claude-specific

You're right. By filename convention:
- **Claude Code** auto-loads `CLAUDE.md`
- **Codex / Cursor / Aider** auto-load `AGENTS.md`
- **Perplexity / generic agents** read `README.md` first

The fix: keep `CLAUDE.md` (so Claude Code keeps working) but make **`AGENTS.md` the canonical file** that all agents (and humans) should read. `CLAUDE.md` becomes a 3-line stub that says *"→ See AGENTS.md"*. Same content, served under both filenames. README points everyone to `AGENTS.md`.

This is the emerging cross-tool standard — `AGENTS.md` is being adopted by OpenAI, Cursor, and others.

---

### 1. Rename rules file → `AGENTS.md` (canonical)

- Move the full content of current `CLAUDE.md` into a new `AGENTS.md`.
- Replace `CLAUDE.md` body with: *"This project's AI rules live in `AGENTS.md`. Read that file. Do not edit this stub."*
- At the top of `AGENTS.md`, add a new section: **"Mandatory reading before any decision"** listing the 6 golden files in read order, with the instruction: *"You MUST read all six before answering a non-trivial question or writing any code. Do not rely on assumptions or older training data — these files are the source of truth."*

The 6 mandatory files:
1. `README.md` — orientation + file map
2. `AGENTS.md` — rules + what not to touch (this file)
3. `PROJECT_CONTEXT.md` — what exists right now
4. `HOW_IT_WORKS.md` — how the product behaves
5. `APIS.md` — integrations + seed plan
6. `OPEN_TASKS.md` — what to build next

Plus: *"Read `GLOSSARY.md` whenever you encounter an unfamiliar domain term."*

### 2. Update `README.md`

Add a "Read these first" callout at the top, same 6-file list, aimed at any human or AI opening the repo cold on GitHub.

### 3. Create `GLOSSARY.md`

One page, ~30 terms, one-line definitions, grouped:
- **Product** — Composite Score, Tier A/B/C, Sub-weight share, Master weight, Saved Search, Watchlist / Favorites, Non-registration state, Show Formula, City Search, Teacher Search, Fit Score, Fit Tag, Confirmation gate, Selection committee, Homework, Lead sheet, FDD countdown, 7-step onboarding
- **Vendor aliases** — "Integral Leads" = SmartLead, "Lovable Cloud" = managed Supabase (don't say Supabase to client)
- **Data** — `us_cities_scored`, `teacher_prospects_master`, Per-row live fetch, Bulk seed, Edge function, RLS policy, Seeded vendor CSV
- **People / roles** — Kaylie (owner), Sam (scoring engine owner), Haseeb (build), Brett (ops + API keys), `manager` role default, `admin` role grant-only

Each entry one line. If a term has a deeper home, link there.

### 4. Save Mode A (with pre-commit confirmation) as a project memory

Write `mem://workflow/doc-sync`:

> At the end of any session where I changed code, schema, or APIs, I draft updates to `PROJECT_CONTEXT.md`, `OPEN_TASKS.md`, `APIS.md`, and `HOW_IT_WORKS.md` as needed — then show you a one-line summary of each proposed change and wait for your "go" before writing the files. Never silently overwrite docs.

Add this rule to `mem://index.md` Core section so every future session picks it up automatically.

### Note on GitHub commits

Lovable auto-syncs every file change to GitHub in real time — there is no separate "commit" step I can gate. So the confirmation gate is on the **doc edits themselves**: nothing gets written (and therefore nothing reaches GitHub) until you say "go."

---

### Files created / edited

- `AGENTS.md` — new (canonical rules, with mandatory-reading section)
- `CLAUDE.md` — replaced with a 3-line stub pointing to `AGENTS.md`
- `GLOSSARY.md` — new
- `README.md` — add "Read these first" callout
- `mem://workflow/doc-sync` — new memory file
- `mem://index.md` — add doc-sync rule + mandatory-reading rule to Core

### Out of scope

- No code changes, no DB changes
- Not editing `PROJECT_CONTEXT.md`, `HOW_IT_WORKS.md`, `APIS.md`, `OPEN_TASKS.md`, `DESIGN.md`, `WORKFLOW.md`, `QA_CHECKLIST.md`, `LATER.md`, `TEACHER_IDEAL_PROFILE.md`, `DATABASE_LAYER_SPEC.md`, `MAY15_MEETING_NOTES.md` in this pass
- Not changing any Lovable / GitHub sync behavior — there's nothing to change there
