# Candidate Pipeline — Phase 1: Card & Badge Polish

Pure `className` work on the candidate card layer. Nothing else moves. KPI tiles, controls strip, column headers, Jump-to row, drag/drop, filters, scoring, detail panel — all untouched.

## Changes

### 1. `CandidateCard.tsx` — strip the color bar, lean on the shadcn Badge system

- Remove the `borderLeft` color bar entirely. Delete the `daysBorderColor` helper. The days-in-stage signal moves into the `Day N` chip (see below).
- Card wrapper uses semantic tokens: `border border-border bg-card text-card-foreground rounded-lg shadow-sm`.
- Hover: `hover:-translate-y-px hover:shadow-md hover:border-[hsl(var(--ring))] transition-all duration-150`. `--ring` is the existing blue accent in `index.css` — same accent the app already uses for focus states, so it stays on-brand. (Say the word if you want a literal teal and I'll add a single `--card-hover` token.)
- All chips swap to `<Badge>` from `src/components/ui/badge.tsx`:
  - **Tag** (`High Potential`, `Follow-Up`, `Interested`, `Untagged`): `variant="secondary"` for normal tags; `variant="outline"` for `Untagged`; `variant="destructive"` for `Not a Fit`.
  - **Day N**: `variant="outline"` when ≤3 (fresh); `variant="secondary"` with `bg-orange-100 text-orange-700` when 4–7 (watch); `variant="destructive"` when 8+ (stalled). This is where the days-in-stage urgency now lives, replacing the lost left bar.
  - **Score** (`Qual 60`): keep `CompositeScoreBadge` — it's a calibrated component, not a tag.
- Owner avatar: standardize on `<Avatar className="h-6 w-6">` (`src/components/ui/avatar.tsx`) with `bg-muted text-muted-foreground` fallback. Drop the `avatarColor` hex palette — uniform avatars across all cards, the *who* is the initial, not the color.
- Compact variant gets the same treatment: no left border, semantic tokens, same Badge primitives.
- Migrate all remaining literal hex (`#212529`, `#6c757d`, `#dee2e6`, `#e7f1ff`) → `text-foreground`, `text-muted-foreground`, `border-border`, `bg-card`.

### 2. `KanbanColumn.tsx` — dim the Disqualified column

- When `stage.id === "disqualified"`: wrap the cards container in `opacity-65` and set its background to `bg-muted/30`.
- **Header stays at full opacity** so the column dot, name, and count remain readable. (Dimming the header would read as "broken/loading" not "archived.")

### 3. `CandidatePipeline.tsx` — relabel the inline legend

The "CARD EDGE: Fresh / Watch / Stalled" legend I added last pass becomes meaningless once the bar is gone. Relabel to **"DAYS IN STAGE:"** and keep the three colored dots — they now describe the `Day N` Badge color instead of the card edge.

## Files touched

- `src/components/candidate-pipeline/CandidateCard.tsx` (JSX + className rewrite; no prop/handler changes)
- `src/components/candidate-pipeline/KanbanColumn.tsx` (one wrapper className + body opacity/bg for Disqualified)
- `src/pages/CandidatePipeline.tsx` (rename one legend label)

## Out of scope (NOT touched in this phase)

- KPI tiles, controls strip layout, column header strip, Jump-to row
- Drag/drop, stage gates, scoring, filtering, click-to-open detail panel
- No new dependencies, no schema changes, no route changes

## Verification before I call it done

1. Reload `/candidate-pipeline` — every column still has the same candidates it did before.
2. Drag a card to another column — confirmation prompt still appears.
3. Click a card — detail panel still opens.
4. Toggle Compact density — cards still shrink correctly.
5. Confirm Disqualified column body is visibly dimmer, but its header dot/name/count are still clear.
