## Goal

Make presets the primary way to weight cities. Sliders become a "fine-tune after picking a preset" tool instead of the first thing the user reaches for. No 4th slider — keeping the 3 live categories (Demand / TAM Teachers / Competitive Opportunity).

## What changes (user-visible)

**Weighting panel, top section — new:**
- A 2-row × 3-column grid of 6 large preset tiles, visually emphasized (bigger than today's dropdown, each tile shows: preset name, one-line plain-English description, mini bar showing the weight split).
- Clicking a tile applies that preset and the 3 sliders **animate** from their current values to the preset's values (~300ms ease-out). This makes the cause→effect obvious.
- The currently-active preset tile is highlighted (ring + filled background). If the user drags a slider after, the highlight drops and a small "Custom" chip appears.

**Below the tile grid — unchanged behavior:**
- The same 3 sliders (Demand / TAM Teachers / Competitive Opportunity) with the existing auto-rebalance-to-100 logic (per AGENTS.md Rule #5).
- Existing "Show Formula", sub-metric drawers, custom criteria — all untouched.

**Removed / demoted:**
- The current preset dropdown (`<Select>` at line ~1782) — replaced by the tile grid. The "Custom" option becomes the auto-applied chip when weights don't match any preset (no manual "Custom" tile needed).

## The 6 presets

| Tile | Demand | TAM | Competitive | Plain-English |
|---|---|---|---|---|
| Balanced | 34 | 33 | 33 | "Treat all three signals roughly equally." |
| Demand-Heavy | 60 | 20 | 20 | "Find markets with the most kids and parent demand." |
| TAM-Heavy | 25 | 50 | 25 | "Find markets with the deepest pool of teachers to recruit." |
| Blue Ocean | 20 | 20 | 60 | "Find markets where no one else is running camps yet." |
| Quick Launch | 15 | 45 | 40 | "Find markets that are easy to open — lots of teachers, low competition." |
| High Upside | 45 | 15 | 40 | "Find markets with strong demand AND low competition — biggest growth runway." |

All sum to 100 exactly. Numbers chosen to make each tile visibly distinct in the mini bar.

## Technical notes

**Files touched:**
- `src/lib/scoringPresets.ts` — extend `PresetName` union with the 3 new names, add their weight objects to `SCORING_PRESETS`, add descriptions to `PRESET_DESCRIPTIONS`, add to `PRESET_NAMES`. `detectPreset()` already iterates all entries so it picks up the new ones automatically.
- `src/pages/CityScoring.tsx` — replace the preset `<Select>` block (~lines 1770–1820) with a new `<PresetTileGrid>` component. Keep the existing `setWeights` / `setAppliedWeights` / `setScoringModel` calls inside the tile's onClick — same persistence path, no store changes.
- Slider animation: add a `useEffect` on `appliedWeights` that, when it changes via a preset click (not a drag), tweens the displayed slider values. Simplest path: use a short `requestAnimationFrame` loop over ~300ms, or framer-motion's `animate()` on a motion value bound to the slider's `value` prop. No new deps required if we hand-roll the rAF tween.

**What's NOT changing:**
- Sub-metric weights, custom criteria, "Show Formula" drawer, composite math, server-side category scores, persistence schema (`scoring_config.preset_name` is a free-text column).
- Auto-rebalance-to-100 behavior on the 3 sliders (Rule #5).
- All other CityScoring UI (spreadsheet, filters, AI prompt bar, market detail drawer).

## Risk

Low. Pure UI swap on top of an existing, persisted preset system. The 3 new preset names are additive; old saved configs continue to round-trip through `detectPreset()` and will resolve to whichever tile matches (or "Custom" if none).

## Undo

Revert `scoringPresets.ts` and the CityScoring.tsx preset block. No DB migration, no schema change.

## Doc sync (after build)

Per Mode A: I'll draft one-liner updates for `PROJECT_CONTEXT.md` (preset count 3→6, UI swap) and `HOW_IT_WORKS.md` (preset tile flow) and wait for your "go" before writing.
