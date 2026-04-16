

## Kanban view — what modern SaaS does

I looked at how Trello, Linear, Pipedrive, HubSpot, Attio, and Salesforce handle long pipelines (8+ columns). The dominant pattern in 2024–2025 SaaS CRMs is **NOT** Option B (grouped phases) — that's rare and tends to feel cluttered. The winning pattern is a **refined Option A** with several quality-of-life additions.

### Recommended: Enhanced Option A (industry standard)

**Why not Option B (grouped phases):**
- Adds a second layer of visual hierarchy that fights with the existing column headers
- Reduces horizontal density (you lose space to phase headers)
- Pipedrive tried this; users complained — they reverted to flat columns
- Sales pipelines are inherently linear; grouping breaks the left-to-right flow metaphor

**What modern SaaS actually does (HubSpot / Pipedrive / Attio pattern):**
1. **Narrower columns** — 260–280px (yours are 288px). Drop to 260px → fits ~4.3 columns in your 1132px viewport vs 3.5 today.
2. **Sticky analytics bar + sticky column headers** — header stays put while you scroll vertically inside columns.
3. **Compact card mode toggle** — "Compact / Comfortable" switch. Compact halves card height (name + score only), letting users see 2× more cards per column.
4. **Collapsible columns** — click a column header to collapse it to a 40px vertical strip showing just the stage name rotated + count. Users collapse stages they're not focused on (e.g., Disqualified, Signing) to reclaim horizontal space.
5. **Visible horizontal scroll affordance** — styled scrollbar always visible (not auto-hidden) + subtle gradient fade on the right edge hinting "more content →".
6. **Mini-map / stage navigator** — small row of 8 dots above the board; click a dot to snap-scroll to that column. (Linear uses this.)

### Plan

Apply the enhanced Option A. Concrete changes:

**`src/components/candidate-pipeline/KanbanBoard.tsx`**
- Add horizontal scroll container with custom scrollbar styling and right-edge gradient fade
- Add stage navigator dots row above the board (click → smooth scroll to column)
- Track collapsed-column state (`Set<StageId>`) and pass down

**`src/components/candidate-pipeline/KanbanColumn.tsx`**
- Reduce width: `w-72` (288px) → `w-[260px]`
- Sticky column header (`position: sticky; top: 0`) inside the scrollable card list
- Add chevron toggle in header → collapses column to 44px vertical strip with rotated text + count badge
- When collapsed, hide cards and drop zone (still droppable — auto-expand on dragover)

**`src/components/candidate-pipeline/CandidateCard.tsx`**
- Accept `compact` prop. Compact mode: single row (name + fit score + avatar), no city/tag/day label. ~32px tall vs ~96px.

**`src/pages/CandidatePipeline.tsx`**
- Add toolbar above the board with two controls:
  - Density toggle: `Compact ⇄ Comfortable` (default Comfortable)
  - "Collapse all empty" button (one-click collapses Disqualified + any zero-count columns)
- Pass density + collapsed state down to board

**`src/index.css`**
- Add `.kanban-scroll` utility: visible thin scrollbar (8px), brand-tinted thumb (#003c7e at 30% opacity), always-visible track

### Result
At 1132px viewport with default settings: **4.3 columns visible** (vs 3.5 today). With Compact mode + Disqualified collapsed: **5+ columns visible with 2× cards per column**. No grouping needed, no extra cognitive layer.

### Files touched
- `src/components/candidate-pipeline/KanbanBoard.tsx` (rewrite)
- `src/components/candidate-pipeline/KanbanColumn.tsx` (rewrite)
- `src/components/candidate-pipeline/CandidateCard.tsx` (add compact mode)
- `src/pages/CandidatePipeline.tsx` (add toolbar)
- `src/index.css` (scrollbar utility)

