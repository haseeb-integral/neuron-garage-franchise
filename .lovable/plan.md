# Plan — Sub-Metric Weights UX Rework

## Goal
Fix the broken back-panel UX. Sam needs to (a) understand what each metric means before weighting it, (b) see the full SOW vision including not-yet-live metrics, (c) edit weights with enough room to breathe.

## What changes

### 1. Drop the flip animation, use a side drawer
- Click a category card → opens a right-side `Sheet` (shadcn) titled e.g. "Demand — Sub-Metric Weights".
- Card front stays exactly as-is today (icon, label, master weight slider, score). Click anywhere on card → opens drawer.
- Remove all `.flip-card` / `.flip-inner` / `.flip-face` CSS and the `flippedCard` state from `CityScoring.tsx`.

### 2. Drawer content
Header:
- Category name + short purpose line (e.g. "Demand — Are there enough affluent families with the right-aged kids?").
- Helper text: "Set the importance weight (0–100) for each signal. Total should equal 100 when you Apply."

Metric rows (one per metric in `METRICS_BY_CATEGORY[catKey]`, ALL metrics, no filtering):
```
[ Metric label                    (i) ]   [  0–100 input  ]   [ status pill ]
```
- **Label**: full text, no truncation (drawer width ~480px gives room).
- **(i) tooltip**: hover/focus → 1-line plain-English description of what the metric measures and why it matters for Sam's franchise model.
- **Weight input**: number 0–100. Disabled (greyed) when `enabled === false`.
- **Status pill**: "Live" (green), "Proxy" (blue), "No data yet" (grey) for `missing`/`blocked`.
- Disabled rows: muted text color, weight input disabled at 0.

Footer (sticky):
- Running total: `Total: 85 / 100` — orange when ≠ 100, green when = 100. Informational only, does not block Apply.
- Two buttons: **Apply Weights** (commits this category's sub-weights to `appliedSubWeights[catKey]` + closes drawer) and **Reset Category** (restores defaults for this category only).

No column headers row — labels in the rows are self-explanatory once descriptions exist via tooltip.

### 3. Add metric descriptions
New field on registry entries: `description: string`. Add to every entry in `src/lib/sowMetricRegistry.ts`. Examples:
- `children_5_12_count` → "Raw count of kids in the camp's target age range. Bigger pool = more potential customers."
- `public_elementary_teacher_count` → "Pool of K-5 teachers — your primary franchisee recruiting source."
- `summer_income_need_ratio` → "How much teachers need summer income vs. their school-year salary. Higher = stronger pull toward franchising."
- `childcare_nanny_hourly_rate_proxy` → "What local families already pay for childcare. Anchors what they'll pay for camp."

(I'll write all 45 descriptions in plain language Sam can act on.)

### 4. State / store
No store schema change. `subWeights` and `appliedSubWeights` already exist. Apply button writes only the open category's slice; other categories untouched.

### 5. Master weight controls integration
Apply Weights and Reset to Default buttons on the main page already commit/reset `appliedWeights`. The drawer's per-category Apply does the same for that category's sub-weights. The page-level Reset to Default also resets all sub-weights (already implemented).

## Files touched
- `src/lib/sowMetricRegistry.ts` — add `description` field to all 45 entries.
- `src/pages/CityScoring.tsx` — remove flip CSS + `flippedCard` state; add `Sheet`-based drawer; wire click-to-open.
- (New small component) `src/components/city-scoring/SubMetricWeightsDrawer.tsx` — the drawer body (keeps `CityScoring.tsx` from ballooning).

## Out of scope
- Sub-weights affecting composite score / sort.
- Live signal values shown next to each metric.
- Drag-to-reorder.
- Per-metric Apply across all categories at once (each drawer commits its own).

## Risk: Low
Pure UI refactor of an additive feature shipped in the prior turn. Store unchanged. Easy revert: restore the 3 files.

## Effort: ~90 min.
