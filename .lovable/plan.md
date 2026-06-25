## What we are changing
Shrink the big amber "Score may be stale" warning box into a small chip with a tooltip, matching your reference screenshot.

## Which page and part
Only the `CityRow` component in `src/pages/MarketValidationRollout.tsx` — the composite score cell.

## Exact change
1. Replace the multi-line amber block with a small inline chip that shows just "⚠ Stale score".
2. On hover, a tooltip shows the full message: "Last crawl failed on [date]. Click Run to refresh."
3. The chip sits right next to the composite number on the same line, so the row height stays even with normal rows.

## Why
Your current version uses a compact chip. My version uses a wide box that adds extra row height and looks crowded.

## What is NOT touched
- No other columns, buttons, or text.
- No scoring math, backend, or other pages.

## Files changed
- `src/pages/MarketValidationRollout.tsx` (only the composite `<td>` block, ~15 lines)

## Test after
Hover over "⚠ Stale score" on any failed row — tooltip should appear. Row heights should look even across done and failed rows.