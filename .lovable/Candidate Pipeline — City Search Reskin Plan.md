# Candidate Pipeline — City Search Reskin Plan

_Status as of: 2026-05-29_

Goal: bring the Candidate Pipeline page into visual parity with the City Search / Dashboard reskin. Purely presentational — no scoring math, no DnD logic, no schema.

---

## Phase 1 — KPI tiles, filter strip, density toolbar, legend
**Status: ✅ SHIPPED & live-verified**

Already in production. Header KPI tiles, top filter strip, density toolbar, and stage legend match City Search tonally.

---

## Phase 2 — Board chrome
**Status: ✅ SHIPPED 2026-05-29**

- `KanbanBoard.tsx`: Jump-to row tracks the currently-visible stage via IntersectionObserver; active pill renders blue `#174be8` with white text and translucent count badge.
- `KanbanColumn.tsx`: header restyled to City Search tones (bg `#f7faff`, border `#eef2f7`, title `#07142f`, count `#174be8` on `#eef2f7`); disqualified header stays muted `#526078`. Stage dots keep their distinct hues (hard rule honored).
- `KanbanColumn.tsx`: "Drop candidates here" empty state and Disqualified `opacity-65` already in place from Phase 1.
- `index.css`: scoped `.kanban-scroll` scrollbar already in place from Phase 1.

**Hard rule honored:** stage color identity lives **only** in the column-header dots — not blue-washed.

---

## Phase 3 — Cards + score badges
**Status: 🟡 NOT STARTED** (higher risk, has one open question)

Files:
- `src/components/candidate-pipeline/CandidateCard.tsx`
  - Remove the colored left border bar
  - Hover state: border `#174be8`
  - Owner avatar: `w-7 h-7 bg:#174be8`
  - "Start Onboarding" CTA stays orange `#fd7e14` _unless_ the open question below resolves to a global swap
- `src/components/candidate-pipeline/CompositeScoreBadge.tsx` — re-tone tier colors:
  - ≥90 → bg `#e7efff` / text `#0a2f8a` / border `#174be8`
  - 75–89 → bg `#eaf7f1` / text `#155d3a` / border `#20c997`
  - 60–74 → bg `#fff4e5` / text `#7a3a00` / border `#fd7e14`
  - <60 → bg `#fdecee` / text `#7a1620` / border `#dc3545`

### Open question — ASK BEFORE STARTING PHASE 3

CandidateCard's "Start Onboarding" CTA and the global `--primary` token are currently **orange**. City Search uses **blue `#174be8`** as primary.

- **Option A (recommended):** local override inside the pipeline only — keep `--primary` orange globally, add a scoped blue accent for pipeline-specific surfaces.
- **Option B:** global token swap (`--primary` orange → blue everywhere). Recolors every primary button across the entire app.

Get Brett's confirmation before touching any token.

---

## Out of scope (do not touch)
- `CandidateDetailPanel.tsx` tabs
- Scoring math / pillar weights
- Drag-and-drop guards
- FDD gate logic
- Homework carry-forward
- Global `--primary` token changes (unless Option B is explicitly approved)

---

## How to resume

1. Read this file end-to-end.
2. Switch to build mode.
3. Ship Phase 2 first (lowest risk).
4. After Phase 2 ships, ask Brett the Phase 3 open question.
5. Ship Phase 3 once answered.
6. Take a final full-page screenshot at 1070px and compare against `/city-scoring` for tonal consistency.
