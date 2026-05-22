## Diagnosis

The current Ranked Markets list has exactly 10 markets. After my last change, default `rankedPageSize = 10`, so:
- `totalPages = 1` → only "1" chip shown, both `‹` and `›` are correctly `disabled` (look dead, not broken).
- Changing Rows to 20 / 50 also yields `totalPages = 1` → list looks identical → user concludes "nothing happens".
- The selected value "50" in the screenshot was the user's own click; my default is 10. But the perception of brokenness stands.

This is a UX failure, not a logic bug. The pagination IS clickable when there are 2+ pages.

## Fix

In `src/pages/CityScoring.tsx` (Ranked Markets pagination bar, ~L2221–2295):

1. **Lower default page size from 10 → 5.** With 10 markets this yields 2 pages, so chevrons + chips are immediately interactive. Matches the old `PAGE_SIZE = 8` feel that worked.

2. **Collapse the bar when `totalPages === 1`:**
   - Hide `‹ 1 ›` (and `« »`) entirely.
   - Replace count copy with `Showing all N markets`.
   - Keep the Rows selector visible **only when** `filtered.length > 5` (smallest option); otherwise hide it too — picking a size when everything already fits is meaningless and confusing.

3. **When `totalPages === 1` AND total ≤ 5**, render the strip as just `Showing all N markets` (single line, no controls). Clean, honest.

4. **Visual feedback on the Rows change:** also call `setPage(1)` (already done) — no further change needed, but make sure the Select trigger reads the live value (it does via `value={String(rankedPageSize)}`).

Same logic was already correctly applied in `CitySpreadsheetView.tsx` for the `showAll` case (the page nav is conditionally hidden); add the equivalent `totalPages === 1` collapse there too for consistency when filters narrow the spreadsheet to ≤ pageSize rows.

## Files

- `src/pages/CityScoring.tsx` — default size 5, conditional render of nav + Rows when `totalPages === 1`.
- `src/components/city-scoring/CitySpreadsheetView.tsx` — mirror the `totalPages === 1` collapse (the `!showAll && totalPages > 1` guard already exists for nav; extend to count copy phrasing for clarity).

## Out of scope

- No change to the math, the filter pipeline, or the spreadsheet's "All (817)" option (that's already working).
- No change to default for the spreadsheet (50 / page is fine — dataset is 817).

## Doc-sync

After this fix, on your "go docs": add a one-liner to `OPEN_TASKS.md` that ranked-markets pagination now defaults to 5/page and auto-collapses controls when only one page exists.
