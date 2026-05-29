# Candidate Pipeline — UI Polish Pass

Goal: align the Candidate Pipeline visual language with City Search and the Dashboard. **No functional changes** — no drag/drop, scoring, filtering, routing, or data logic is touched. Pure CSS/className/markup-structure work using existing design tokens (`bg-card`, `border`, `text-muted-foreground`, `bg-primary`, etc.) in `index.css` / `tailwind.config.ts`.

## What's off today vs. City Search

Looking at the current Candidate Pipeline next to City Search:

- **Metric cards** (Total in Pipeline / Hot Leads / Conversion / New This Week) are flat white boxes with hairline borders, no icon, no accent, no hover. City Search uses richer cards with rounded corners, soft shadow, and clear section framing.
- **Filter strip** is a single long line of pill-buttons (Owner / Tag / Fit / Days in stage) crammed with the legend row underneath. City Search groups controls inside a contained card with clear labels and consistent pill styling.
- **Density toggle + Card legend + Collapse empty + Jump to** sit in three separate rows of chrome, each with different styling. Feels noisy compared to the disciplined card-in-card layout on City Search.
- **Kanban column headers** are plain text with a count chip on the right and chevron arrows — no stage color, no progress signal. The pipeline funnel is the headline feature of this screen; it should read like one.
- **Candidate cards** use a left color bar + flat white body. Typography weights, badge styles (`Qual 60`, `High Potential`, `Day 9`), and the owner avatar circle don't match the badge/chip system used elsewhere (rounded-full, `bg-secondary`, `text-secondary-foreground`).
- **Page header** lacks the subtle separator / breathing room the Dashboard and City Search have above their first content card.

## Phase 1 — Low risk (cosmetic only, no layout shift)

Pure token + className swaps. Zero structural change, zero behavior change.

1. Metric cards (Total in Pipeline etc.): apply the same card treatment as City Search KPI tiles — `rounded-xl border bg-card shadow-sm`, add a small leading icon in a tinted square (`bg-primary/10 text-primary`), label in `text-xs uppercase tracking-wide text-muted-foreground`, number in `text-3xl font-semibold`.
2. Candidate card chips: normalize `Qual 60`, `High Potential`, `Follow-Up`, `Untagged`, `Day N` to the shared `Badge` variants (`secondary`, `outline`, `destructive`) so they match City Search's tier/fit chips. Owner avatar → standard `Avatar` size, no colored circle background.
3. Page header: add the same bottom border + spacing rhythm used on Dashboard/City Search headers; tighten title/subtitle line-height.
4. Replace ad-hoc grays with semantic tokens (`text-muted-foreground`, `border-border`, `bg-muted/40`) anywhere literal grays slipped in.

**Risk:** trivial. Only `className` edits inside `CandidateCard.tsx`, `KanbanColumn.tsx`, and the metric-cards block in `CandidatePipeline.tsx`.

## Phase 2 — Medium risk (regroup chrome, still no logic change)

Reorganize the control strip so it reads like City Search's "controls card" instead of three stacked toolbars.

1. Wrap Filter row + Days-in-stage legend + Density toggle + Card legend + Collapse empty into a single `Card` (same `rounded-xl border bg-card` as City Search's weighting card), with clear sub-sections separated by hairline dividers. Same controls, same handlers — just one container.
2. Move "Jump to: New Lead / Initial Qual / …" into the column-header strip itself (each chip becomes the Jump anchor), eliminating a whole redundant row.
3. Standardize all pill buttons to the existing `Button size="sm" variant="outline"` with `data-state=active` styling already used on the City Search Dashboard/Spreadsheet toggle, so Owner/Tag/Fit/Days pills look identical across the app.

**Risk:** medium. Same components and handlers, but JSX is regrouped. Worth a quick visual diff before/after.

## Phase 3 — Higher risk (kanban shell refresh)

The kanban column + board shell get the most visible refresh. Still no drag/scoring/data changes.

1. Column headers: add a stage-color dot (using existing pipeline-stage colors from the legend) + stage name + count badge, on a subtle `bg-muted/40` header strip with rounded top corners — matches the section-header feel from City Search's preset cards.
2. Column body: light card surface (`bg-card`), subtle inner shadow at top to indicate scroll, consistent gutter spacing between cards (`space-y-3`), and an empty-state illustration/text styled like City Search empty states instead of just blank space.
3. Candidate card refresh: replace the full-height left color bar with a small top-left stage indicator + softer card surface (`hover:shadow-md transition-shadow`), tighter internal padding, and a clear two-row hierarchy (name+score / location / footer chips).
4. Horizontal scroller: add the same fade-edge mask used elsewhere so the cut-off "Confirmation/Signing/Disqualified" columns hint at more content.

**Risk:** higher because card and column markup changes. Drag-and-drop handlers, click-to-open-detail, score popovers, and all callbacks stay wired to the same elements — only wrapping markup and classes change. I will sanity-check drag + open-detail manually before calling it done.

## Preview-before-touching

Per your ask, I will not edit anything yet. Once you approve this plan, I will:

1. Generate **three rendered design directions** for the polished Candidate Pipeline (kanban column header + one candidate card + the controls card) using the existing palette/typography so you can pick the exact look.
2. Show them to you side-by-side; you pick one.
3. Then implement Phase 1 → 2 → 3 in that order, stopping after each phase so you can review in the live preview before I move on.

## Technical notes

- Files touched: `src/pages/CandidatePipeline.tsx`, `src/components/candidate-pipeline/CandidateCard.tsx`, `src/components/candidate-pipeline/KanbanColumn.tsx`, `src/components/candidate-pipeline/KanbanBoard.tsx`, `src/components/candidate-pipeline/PipelineAnalyticsBar.tsx`. All edits are JSX/className-level.
- No changes to: drag-and-drop logic, stage-transition gates (FDD 16-day, etc.), score computation, filtering/sorting state, Supabase queries, routing, modals' behavior.
- All colors via semantic tokens in `index.css` — no hard-coded hex/`text-white`/`bg-black`.
- JourneyBar stays hidden on this page (already done).
