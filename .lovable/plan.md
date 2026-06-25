## Goal
Make the "skipped fresh crawl" reason visible after the toast disappears, so the user can see why a city was not re-crawled.

## What we'll add (UI only, MVS rollout table)

**1. Inline row badge — "Skipped (saved data, N days old)"**
- When the backend returns `skipped: true`, store that state per city in the table.
- Show a small amber/blue badge next to the city's status cell:
  - Text: `Skipped — used saved data from Jun 25 (0 days old)`
  - Tooltip on hover: `Fresh crawl was skipped because saved data is ≤ 30 days old. Click "Force fresh" to override.`
- Badge stays visible until the user runs the city again or refreshes.

**2. Longer-lived toast**
- Bump toast duration from default (~4s) to ~10s.
- Add a "Force fresh" action button inside the toast so the user can act directly.

**3. Last-skip note in the helper line below the table** (optional, small)
- A one-line note: `Last action: Denver skipped at 4:52 PM — saved data 0 days old.`
- Updates each time a skip happens. Cleared on page reload.

## What we will NOT touch
- Backend `mvs-run-pipeline` logic
- Freshness thresholds (still 30 / 60 days)
- Scoring math, saved data, exports
- Deep-dive `RunPipelineButton` (can mirror the same pattern in a later phase if you want)

## Files to edit
- `src/pages/MarketValidationRollout.tsx` — add per-row skip state, badge render, longer toast with action, optional helper line.

## Phases & turns
- **Phase 1 (1 turn):** Inline badge + longer toast with "Force fresh" action.
- **Phase 2 (optional, 1 turn):** Helper line under table + mirror to deep-dive `RunPipelineButton`.

## Risks
- Very low. UI-only change in one file for Phase 1.
- No effect on crawls, scores, or data.

## Test after Phase 1
- Click **Run** on Denver → toast stays ~10s with "Force fresh" button → amber badge appears on Denver row and remains visible.
- Click **Force fresh** on Denver → badge clears, crawl starts normally.
- Refresh page → badge clears (expected, since it's session-only).

Approve Phase 1 and I'll implement.
