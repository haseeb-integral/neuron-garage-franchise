
# Phase 2 demo — visual polish

Targeted UI-only cleanup of `MarketValidation.tsx`, `SiteAnalysis.tsx`, and the two demo chip components. No data, routing, or logic changes.

## 1. Pills (chips) — unify the system

Today pills are inconsistent: oversized "Do not recommend" wraps to two lines, grade-alignment chip wraps and reads as a paragraph, "SAMPLE" is a different size than "Demo city", weight pill (25%) vs confidence pill have different padding.

Introduce one consistent pill scale across both pages:
- **Tier pill** (Recommend / Worth a look / Do not recommend): single-line, `whitespace-nowrap`, 11px, 2px×8px padding, semibold. Sit beside the big score, not under it.
- **Meta chips** (school type, enrollment, grade alignment, Demo city, Sample, weight %, confidence): all share one base style — 10px, 2px×6px padding, `whitespace-nowrap`, rounded-full, semibold. Color family stays per-purpose but geometry is identical.
- Grade alignment moves to a short form: `PK–K ✗` / `5–12 ✓` instead of the long sentence-style chip; full text in `title` tooltip.
- `SampleDataBadge` keeps current orange palette but adopts the shared geometry.

## 2. Site cards — fixed-height layout grid

Cards currently shrink-wrap each section, so the formula drawer pushes the entire card taller than its siblings and breaks the row.

Restructure each `SiteCard` as a vertical flex with fixed-height bands:
```
header band      (auto, but capped via line-clamp on title/address)
verdict band     (line-clamp-3, fixed min-height)
isochrone band   (fixed h-40, already there — keep)
callout grid     (fixed 3×2 grid, fixed row height)
sub-score list   (flex-1, formula drawer inside the list only)
```
- Title gets `truncate` (single line) instead of allowing two-line wrap — full name in `title=`.
- Verdict paragraph gets `line-clamp-3` + fixed `min-h` so all cards' verdicts share the same vertical footprint.
- Address gets `line-clamp-1`.
- Map placeholder keeps `h-40 w-full`; ensure parent has no extra padding shift so the maps line up across cards.

## 3. Formula drawer — don't reflow the whole card

Right now toggling `ƒ` on one row expands the card and breaks the 2-up / 4-up row alignment.

Two fixes, pick the cleaner one (will implement option A):
- **A. Inline-but-contained:** the formula pre-block renders inside the sub-score list, but the sub-score list area is scrollable (`overflow-y-auto`) with a fixed max-height. Card height stays constant; only the inner list scrolls when formulas expand.
- B. (rejected) popover — heavier, less scannable.

Add a small "Show all formulas / Hide all" toggle at the card footer so a reviewer can expand them all without clicking 5 chevrons.

## 4. Market Validation — header alignment

The verdict paragraph "Validated premium enrichment market…" currently sits under the city row, indented inconsistently with the meta line above it. Fix:
- Left column becomes a single vertical stack with consistent left-edge: city row → scrape-date line → verdict paragraph, all flush-left, same max-width (`max-w-2xl` already there but the parent flex creates the misalignment — switch the parent to `items-start` and tighten gaps).
- Right column (score + Export PDF) becomes a fixed-width sidebar so the verdict text never wraps under the score.

## 5. Typography rhythm

- Standardize 3 sizes on both pages: 18px section H2, 13px card H3, 12px body, 11px meta, 10px chips. Replace ad-hoc 14/13/12/11/10 mixes.
- Numbers (score 28px on cards, 42px on composite) keep `font-black` and `tabular-nums` for column alignment.
- Monospace formula blocks: bump to 11px on cards (currently 10px) for legibility, keep `leading-snug`.

## 6. Threshold legend + compare strip

- Legend row wraps awkwardly at narrow widths. Make it a `flex-wrap gap-x-4 gap-y-1` block with each item `whitespace-nowrap`.
- The "Compare strip · 2 of 4" badge and Export PDF button sit on different baselines — wrap them in one right-aligned flex with `items-center`.

## Files touched

- `src/pages/SiteAnalysis.tsx` — card flex restructuring, scrollable sub-score list, pill class unification, legend wrap fix.
- `src/pages/MarketValidation.tsx` — header alignment, pill geometry, sub-score card formula drawer contained inside card.
- `src/components/phase2-demo/SampleDataBadge.tsx` — adopt shared chip geometry (10px / 2px×6px).
- `src/components/phase2-demo/LowConfidenceBadge.tsx` — same geometry pass.

## Out of scope

- No data shape changes in `src/data/phase2DemoData.ts`.
- No new routes, no sidebar changes, no backend work.
- No design-token (`index.css`) refactor — these are still demo pages; we keep the local color constants and only normalize geometry/typography.

## Verification

- Type-check passes.
- Visual check at 1920, 1366, 971 (current preview), 768 widths: site cards stay equal-height in their row when any number of formula drawers are open; map placeholders share a top/bottom edge across the row; Market Validation verdict left-edge aligns with city name and scrape-date line.
