## Goal
Clean up the City Search Overall Score panel and let any single category drive 100% of the weighted composite. Frontend-only.

## Scope confirmation
- No DB change
- No Edge Function change
- No Census/BLS change
- No API logic change

## Changes (all in `src/pages/CityScoring.tsx`)

### 1. Slider max 50 → 100
Line 519: change `max={50}` to `max={100}` on the per-category Scoring Weights `Slider`. This permits Demand=100, others=0 (or any single category at 100). Total-must-equal-100 rule is unchanged: Apply button stays disabled when `totalWeight !== 100` (line 493) and the orange "Weights must total 100% to apply scoring." warning stays (lines 485–487).

### 2. Add short explainer near Scoring Weights title
Insert one line of muted helper text inside the title row (around lines 482–483), right after the `<h3>Scoring Weights</h3>`:
```tsx
<span className="text-[11px] text-[#8794ab] whitespace-nowrap">
  Set what matters most. 100% means score this market only by that category.
</span>
```
Placed as a sibling of the `<h3>` inside the existing `flex items-center gap-3 flex-wrap` wrapper so it sits beside the title on wide screens and wraps gracefully on narrow ones. Total Weight indicator and warning continue to follow.

### 3. Clean up the gauge area
Remove line 719 entirely:
```tsx
<p className="text-[10px] text-[#8794ab]">Score recalculated from current category weights.</p>
```
Do not replace it with anything. The gauge column then contains only:
- "Overall Score" label
- gauge with number and `/100`
- opportunity label (e.g. "Excellent Opportunity")

Skip the optional "Weighted view" sub-label — the panel reads cleaner without it.

## Out of scope
- Reset-to-default behavior (unchanged; defaults still 25/20/20/15/10/10)
- `appliedWeights` / `weightedComposite` math (unchanged — already supports 100/0 splits)
- Tier thresholds (unchanged: A 85+, B 75–84, C 65–74, D <65)
- Ranked Markets list scores

## Test
1. Demand=100, all others=0 → Apply enabled (total=100) → gauge equals Demand category score.
2. Competitive Landscape=100, all others=0 → Apply → gauge equals Competitive Landscape score.
3. Any combination where total ≠ 100 → Apply disabled, orange warning shown, gauge unchanged.
4. Reset to Default → returns to 25/20/20/15/10/10 composite.
5. Visual: gauge column shows only Overall Score / number / /100 / opportunity label — no extra helper line.
