# Candidate Pipeline — City Search Reskin Plan

**Goal:** bring `/candidate-pipeline` visually in line with the redesigned City Search page (white surfaces, deep ink text, primary blue `#174be8`, light-blue borders `#cfe0ff`, soft surface tint `#f7faff`) without touching any business logic.

**Status as of 2026-05-29:** Phase 1 shipped and visually verified live by Haseeb + agent. Phases 2 and 3 are not started. Brett may take over this chat.

---

## City Search palette (source of truth)

| Token             | Hex        | Use                                              |
|-------------------|------------|--------------------------------------------------|
| Primary blue      | `#174be8`  | Active states, primary CTAs, links, icon accents |
| Deep ink          | `#07142f`  | Headings, big numbers                            |
| Muted ink         | `#526078`  | Labels, secondary text, icon strokes             |
| Light-blue border | `#cfe0ff`  | Card / tile borders, dividers                    |
| Surface tint      | `#f7faff`  | Hover backgrounds, faint fills                   |
| Page background   | `#ffffff`  | Page bg (kept white, like City Search)           |

Keep existing semantic tints for non-blue accents: orange `#fd7e14` (Hot Leads icon, New Candidate / Start Onboarding CTA), green `#20c997` (Conversion, Fresh), purple `#6f42c1` (New This Week), red `#dc3545` (Stalled, destructive).

---

## Phase 1 — DONE (shipped + QA'd live on 2026-05-29)

Files touched:
- `src/components/candidate-pipeline/PipelineAnalyticsBar.tsx`
- `src/pages/CandidatePipeline.tsx`

Changes:
- Page bg kept white (was `#f2f4f6`).
- KPI tile borders → `#cfe0ff`; big number `#003c7e` → `#07142f`; label `#6c757d` → `#526078`; "Total in Pipeline" icon tint `#003c7e` → `#174be8`.
- Filter strip + density toolbar borders → `#cfe0ff`, labels → `#526078`, active chip / active density button bg `#003c7e` → `#174be8`, hover bg `#f1f3f5` → `#f3f6fb`.
- Days-in-stage legend divider → `#cfe0ff`; label → `#526078`.
- "Expand all" link color → `#174be8`.

Out-of-band bug fixed during QA: `ChecklistSection.tsx` now uses `toDbStage()` like `HomeworkTab`, removing the red "invalid input value for enum candidate_stage: initial_qual" toast on Notes & Activity.

---

## Phase 2 — Medium risk: board chrome (NOT STARTED)

Scope: anything outside the candidate card itself — column headers, "Jump to:" navigator, count badges, scrollbar.

Files to edit:
- `src/components/candidate-pipeline/KanbanBoard.tsx`
  - "Jump to:" pill row: label `#6c757d` → `#526078`. Colored stage dot stays each stage's color (do NOT blue-wash stage identity). Count badge bg → white with `#cfe0ff` border, text `#07142f`. Hover pill bg → `#f3f6fb`.
  - The per-stage color map at line ~55 is the stage identity palette — LEAVE IT. It drives the column header dot and Jump-to dot; those are the one place stage color reads on the board.
- `src/components/candidate-pipeline/KanbanColumn.tsx`
  - Column header: title `#07142f`; count badge bg `#ffffff` + `1px solid #cfe0ff` + text `#07142f`. Keep the stage color dot at left.
  - "Drop candidates here" placeholder: text `#526078`, dashed border `#cfe0ff`.
  - The hardcoded stage color map at line ~35 is the stage dot color — LEAVE IT.
  - Disqualified column: wrap body in `opacity-65` so it reads as archived (Brett's earlier rule).
- `src/index.css`
  - Scoped custom scrollbar for the kanban scroll container: thumb `#cfe0ff`, thumb-hover `#174be8`, track transparent. Do NOT restyle scrollbars globally.

Verification:
1. Each column header: colored stage dot · stage name (ink) · white count badge w/ blue border.
2. Jump-to row matches; no orange/navy holdovers.
3. Horizontal scrollbar under the board is thin + blue-tinted.
4. Disqualified column reads visibly faded vs others.
5. No logic regressions — drag/drop, collapse, jump-to-column scroll still work.

---

## Phase 3 — Higher risk: cards + score badges (NOT STARTED)

Scope: candidate cards and the composite score badge.

Files to edit:
- `src/components/candidate-pipeline/CandidateCard.tsx`
  - Remove the colored left border bar entirely (Brett's rule: stage color lives ONLY in column header dot). Replace with `border border-[#cfe0ff]` + `shadow-sm`.
  - Hover: `hover:-translate-y-px hover:border-[#174be8] hover:shadow-md`. No color bars on hover.
  - "Start Onboarding" CTA: confirm with user before touching. Default = KEEP orange (`#fd7e14`) — it's the consistent "commit / go live" CTA across the app (same as "New Candidate"). Any secondary button still using `#003c7e` swaps to `#174be8`.
  - Owner avatar: standardize `w-7 h-7`, bg `#174be8`, white initials. No per-stage variant.
  - All chips inside the card: use palette above — no stray `#003c7e`, `#dee2e6`, `#6c757d`. Day badge stays color-coded by Fresh/Watch/Stalled (that's data, not chrome).
- `src/components/candidate-pipeline/CompositeScoreBadge.tsx`
  - Re-tone tier colors (keep thresholds + label text):
    - ≥90: bg `#e7efff`, text `#0a2f8a`, border `#174be8`
    - 75–89: bg `#eaf7f1`, text `#155d3a`, border `#20c997`
    - 60–74: bg `#fff4e5`, text `#7a3a00`, border `#fd7e14`
    - <60: bg `#fdecee`, text `#7a1620`, border `#dc3545`

Open question (ASK USER BEFORE STARTING PHASE 3):
> Local override or global token swap? Current `--primary` token is orange (drives "New Candidate" / Start Onboarding). City Search uses blue `#174be8` as its primary. Agent recommendation = **local override** for the pipeline so we don't recolor every primary button across the app to blue. Confirm with Haseeb/Brett before flipping global tokens.

Verification:
1. Cards: no colored left bar; thin blue-tinted border + soft shadow. Hover lifts + blue border.
2. Start Onboarding still orange (unless explicitly changed).
3. Score badges use new tier palette; same numeric thresholds.
4. Disqualified column cards visibly faded.
5. Card interactions unchanged (open detail, drag, homework count click).

---

## Out of scope (do NOT sneak in)

- Changes to `CandidateDetailPanel.tsx` tabs beyond the already-shipped enum fix.
- Any scoring math, drag-drop guards, FDD gate, or homework carry-forward edits — this is purely visual.
- Global `--primary` token changes unless explicitly approved.

## How to resume next session

1. Read this file first.
2. Switch to build mode.
3. Start Phase 2 (board chrome). Re-read the file list before editing.
4. After Phase 2 ships + QAs, ASK USER the Phase 3 "local override vs global swap" question, then ship Phase 3.
5. After Phase 3, take a final full-page screenshot at 1070px and compare against `/city-search` for tonal consistency.
