## Restructure Austin Calibration Preview Header (Pattern A)

### Problem
The `RunPipelineButton` renders a full dashed-border status bar (`mb-5`, border, padding, last-run info). When placed inside the section's right-aligned flex container, it sits next to the "Open Austin MVS preview" link as two mismatched blocks. The button and the link are not visually paired, and the status bar steals horizontal space.

### Solution — Two-row header layout

**Row 1 — Title + action buttons (same line)**
- Left: "Austin calibration preview" title (13px bold) + subtitle (12px muted)
- Right: a tight `gap-2` button group
  - **Primary**: "Run Pipeline" compact trigger button (same blue style, loading spinner)
  - **Secondary**: "Open Austin MVS preview" outline button (same blue border/text style)

**Row 2 — Admin status strip (below, only when relevant)**
- Shows: "Admin only · discover → classify → extract · cap 30 Firecrawl calls"
- Plus last-run status, call count, timestamp
- Styled as a plain muted text strip, no dashed border, no `mb-5`

### File changes

1. **`src/components/phase2-demo/RunPipelineButton.tsx`**
   - Add a `variant?: "full" | "compact"` prop (default `"full"` preserves current behavior everywhere else)
   - In `"compact"` mode: render **only** the `<button>` (with busy state + spinner), no surrounding card, no status text, no last-run info
   - In `"full"` mode: keep current dashed-border bar exactly as-is (used on `/mvs-preview`)
   - The status-polling and toast logic stays identical for both variants

2. **`src/pages/MarketValidation.tsx`** — Austin section (lines ~290-310)
   - Replace the single `justify-between` row with a **vertical stack** (`flex flex-col gap-3`)
   - **Row 1**: `flex flex-wrap items-start justify-between gap-3`
     - Left: title + subtitle (unchanged text)
     - Right: `<div className="flex items-center gap-2">`
       - `<RunPipelineButton city="Austin, TX" variant="compact" onComplete={austinLive.refresh} />`
       - `<Link to="/mvs-preview">Open Austin MVS preview</Link>`
   - **Row 2** (conditional, only when pipeline status exists): render a thin admin status strip. This can be a small sub-component or inline markup showing the last-run info that was previously inside `RunPipelineButton`

### Spacing spec
- Section outer: `mb-5 rounded-lg border bg-white px-4 py-3` (unchanged)
- Inner rows: `gap-3` between row 1 and row 2
- Button group: `gap-2`
- Row 1 vertical alignment: `items-start` (prevents buttons from stretching to subtitle height)
- No dashed border on row 2; if a subtle separator is needed between rows, use a 1px line in `#eef2f7`

### Scope
- Only the Austin calibration preview section on `/market-validation`.
- The `/mvs-preview` page keeps the full `RunPipelineButton` variant unchanged.