## Plan — Stage-aware hover on candidate cards

### Scope
Two surgical changes in the candidate pipeline. No backend, no data, no score logic touched.

### 1. Stage-aware hover (replaces the global blue)

**Problem:** Every card's hover border + name text snap to `hsl(var(--ring))` (blue), regardless of which column the card lives in. Hovering kills the column identity.

**Fix:** Hover border and name color use the card's **stage accent color** — the same palette already used by the column headers.

Stage palette (already defined in `KanbanColumn.tsx:33-42`):
- `new_lead` → `#6f42c1` (purple)
- `initial_qual` → `#003c7e` (navy)
- `business_overview` → `#0dcaf0` (cyan)
- `fdd_review` → `#6610f2` (violet)
- `immersion` → `#20c997` (teal)
- `confirmation` → `#198754` (green)
- `signing` → `#fd7e14` (orange)
- `disqualified` → `#adb5bd` (gray)

**Implementation:**
- Lift `stageColorMap` into a shared module: `src/components/candidate-pipeline/stageColors.ts` (export `STAGE_ACCENT: Record<StageId, string>` and a `getStageAccent(stageId)` helper). Update `KanbanColumn.tsx` and `KanbanBoard.tsx` to import from it (drop their local copies) so there is one source of truth.
- In `CandidateCard.tsx`:
  - Compute `const accent = getStageAccent(candidate.stage)` once at the top of the component.
  - Remove the hardcoded `hover:border-[hsl(var(--ring))]` from `cardClasses`.
  - Apply hover border via inline style + a small CSS-in-JS approach: add an `onMouseEnter`/`onMouseLeave` that toggles `borderColor` between `hsl(var(--border))` and `accent`. (Cleaner than dynamic Tailwind arbitrary classes for a runtime color.)
  - Same toggle on the candidate name color: default `text-foreground`, hover → `accent`.
  - Keep the existing lift (`-translate-y-px`) and shadow upgrade — those stay.
- Disqualified cards: gray accent reads as "no change on hover," which is the right signal for that column.
- Compact variant: skip the name-color swap (no large name shown); still apply the border-color swap so users see which stage they're hovering.

### 2. Unscored cards — leave blank (no change)

Confirmed: `CompositeScoreBadge.tsx` returns `null` when composite ≤ 0. Keeping that behavior. No edit to this file.

### Files touched
- **new:** `src/components/candidate-pipeline/stageColors.ts`
- **edit:** `src/components/candidate-pipeline/CandidateCard.tsx` — stage-aware hover
- **edit:** `src/components/candidate-pipeline/KanbanColumn.tsx` — import shared map
- **edit:** `src/components/candidate-pipeline/KanbanBoard.tsx` — import shared map

### Smoke test (959px)
- Hover Brittany Cruz (Initial Qual): border + name go navy `#003c7e`, not blue `--ring`.
- Hover Allison Wood (Business Overview): border + name go cyan `#0dcaf0`.
- Hover Sam Test1 (Immersion): border + name go teal `#20c997`.
- Hover any Signing-stage card: border + name go orange `#fd7e14`; "Start Onboarding" button stays its own blue (unchanged).
- Hover Disqualified card: border tints muted gray.
- Unscored cards (Rebecca Foster, Sarah Mitchell, etc.) remain blank where the Qual pill would be.

Approve and I'll ship.
