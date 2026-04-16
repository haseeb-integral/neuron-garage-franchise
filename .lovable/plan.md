

## Candidate Pipeline Kanban Plan

Build a full Kanban-board page at `/candidate-pipeline` matching Neuron Garage's 7-stage qualification process plus a Disqualified column.

### Files to Create

**Data**
- `src/data/pipelineData.ts` — `PipelineStage` enum (8 stages), `Candidate` interface (id, name, city, state, fitScore, stage, daysInStage, assignedTo, tag, source, email, phone, createdDate, fddSentDate?, qualificationScores, notes[], activity[], trialClose, votes), `STAGES` array with labels, 10 sample candidates spread across stages, stage-specific homework definitions.

**Components (`src/components/candidate-pipeline/`)**
- `KanbanBoard.tsx` — Horizontal scroll container, 8 columns rendered side-by-side, native HTML5 drag-and-drop (`draggable`, `onDragStart`, `onDragOver`, `onDrop`).
- `KanbanColumn.tsx` — Column header with stage name (#003c7e) + count badge, scrollable card list, drop target highlight on dragover. Disqualified column uses muted grey header.
- `CandidateCard.tsx` — White card with #dee2e6 border, name (bold), city/state, FitScoreBadge (reuse from teacher-prospects), "Day N" muted grey label, avatar circle with initial, tag pill. Draggable.
- `PipelineAnalyticsBar.tsx` — Horizontal stat strip: Total in Pipeline, Avg Days/Stage, Conversion Rate, This Week's Activity.
- `CandidateDetailPanel.tsx` — Full-screen `Sheet` (side="right", `w-full sm:max-w-3xl`) with `Tabs`: Overview / Qualification Score / Notes & Activity / Homework & Checklist.
- `tabs/OverviewTab.tsx` — Contact info grid, source, current stage, days in stage, created date, registration-state warning banner if state requires registration.
- `tabs/QualificationTab.tsx` — 5 criteria rows with `StarRating` (1–5 clickable stars), composite progress bar, AI reasoning placeholder card. Financial Readiness row shows the $1K + $15K confirmation.
- `tabs/NotesActivityTab.tsx` — Add-note input + submit, chronological timeline (notes, calls, emails, stage changes) with author + timestamp.
- `tabs/HomeworkTab.tsx` — Stage-specific homework block, 5-item Trial Close checklist (checkboxes blocking advance), Stage 4 FDD Lock countdown card (16 days from `fddSentDate`).
- `SelectionCommittee.tsx` — Rendered inside Stage 5 cards' detail panel: Kaylie / Sam / Skylar rows, each with Approve/Decline toggle, live tally display.
- `StarRating.tsx` — Reusable 1–5 star input.

**Page**
- `src/pages/CandidatePipeline.tsx` — Replace placeholder. Manages candidates state, drag/drop handler (updates stage + fires sonner toast `Stage updated to [Stage Name]`), open-card state, detail-panel mutations. Wraps in full-bleed grey container matching City Scoring/Teacher Prospects pattern (negative margin -32 + padding 32).

### Layout

```text
┌─ Header: "Candidate Pipeline" + [Promote from Prospect] (orange) ─┐
├─ Analytics Bar (4 stat tiles)                                      ┤
├─ Kanban Board (horizontal scroll)                                  ┤
│  [New Lead][Init Qual][Business Ov][FDD][Immersion][Conf][Sign][Disq]│
└────────────────────────────────────────────────────────────────────┘
```

### Design Tokens
- Page bg `#f2f4f6`, cards white + `#dee2e6` border, column header text `#003c7e`, primary button `#fd7e14`
- Disqualified column: muted grey header (`#6c757d`)
- Day label: `#6c757d` text-xs
- Avatar: 28px circle, initial centered, deterministic color from name hash
- FitScoreBadge: reuse `src/components/teacher-prospects/FitScoreBadge.tsx`

### Sample Data Distribution
10 candidates across stages: New Lead (2), Initial Qual Call (2), Business Overview (1), FDD Review (1), Immersion (2), Confirmation (1), Signing (1). Names: Sarah Mitchell, Marcus Johnson, Amanda Rodriguez, James Carter, Patricia Williams, Brian Thompson, Lisa Nguyen, Rebecca Foster, David Chen, Kevin Patel. Cities: Frisco/Plano/Austin TX, Coral Springs/Tampa/Orlando FL.

### Interactions
- Drag card to new column → updates state → sonner toast "Stage updated to [Stage Name]"
- Click card → opens slide-over with 4 tabs
- Add note → prepends to activity timeline
- Star rating click → updates qualification score
- Trial Close checkboxes → required before advancing
- Stage 5 cards → Selection Committee voting visible in detail panel
- Promote from Prospect button → placeholder toast for now

