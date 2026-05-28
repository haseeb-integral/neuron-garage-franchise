## Plan

Two surgical changes to `src/components/city-scoring/market-detail/DrawerHeroSummary.tsx`. No backend, no business logic — pure presentation.

### 1. Keep the "Bottom line" verdict (rewritten for clarity)

You said: keep it if it lines up with the city's executive summary. It already does — it's a deterministic one-liner derived from Total Score + strongest/weakest pillar (no LLM, drift-safe). I'll keep it but tighten the wording so the 70–79 case stops sounding hedged-and-confusing:

- 90+: "Tier A: strongest in {top} ({n}). Recruit aggressively."
- 80–89: "Solid Tier B — {top} ({n}) carries it; watch {bottom} ({n})."
- 70–79: "Average overall — best fit if the candidate's strength is {top} ({n})."
- <70 with gap ≥25: "Below average overall, but {top} is {n}/100 — could work for a matched candidate."
- <70 otherwise: "Below average across the board (top pillar only {n})."

### 2. Add "Show curve" expandable under the pillar bars (drawer only)

Placement: directly under the 3 pillar bars in the drawer hero (`DrawerHeroSummary.tsx`). **Not** in the center panel — center panel stays clean; the drawer is where users go to audit a market, so calibration details belong there.

A small text link "Show curve" toggles a collapsible panel containing:

**a) Anchor table** (the 7 fixed anchor points from `CALIBRATION_ANCHORS` in `marketView.ts`):

```
math →  display
   0  →    0
  20  →   40
  35  →   60
  41  →   70   ← Tier C cutoff
  50  →   80   ← Tier B cutoff
  59  →   90   ← Tier A cutoff
  74  →  100
```

**b) Per-city interpolation lines** (4 rows, one per pillar + total) showing the exact arithmetic for this city, e.g. for Nashville:

```
Demand:    80 + (53 − 50) / (59 − 50) × 10 = 83
TAM:       70 + (44 − 41) / (50 − 41) × 10 = 73
Comp Opp:  60 + (40 − 35) / (41 − 35) × 10 = 68
Total:     70 + (49 − 41) / (50 − 41) × 10 = 79
```

A one-line footer: *"The display score bends the math onto a friendlier 0–100 scale. Rankings are identical either way."*

### Why expandable text, not a mini-chart

The anchor table is 7 numbers and the per-city math is 4 lines — readable at a glance. A line chart adds a chart library dependency and rendering surface for the same information, with less precision. If you later decide the chart is clearer, swapping in a tiny SVG line graph is a 30-line follow-up in the same component.

### Technical detail

- Use existing `Collapsible` from `@/components/ui/collapsible` (already in the project).
- Compute the interpolation rows inline using `CALIBRATION_ANCHORS` from `marketView.ts`. Export the anchors constant so the drawer can read them (currently module-private).
- All numbers come from `buildPillarView()` and `rawComposite` already passed into the component — no new props.

### Files touched

- `src/lib/marketView.ts` — export `CALIBRATION_ANCHORS`.
- `src/components/city-scoring/market-detail/DrawerHeroSummary.tsx` — tighten verdict wording, add Collapsible "Show curve" block under pillar bars.
