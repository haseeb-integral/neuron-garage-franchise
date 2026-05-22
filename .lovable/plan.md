## Goal

Restore the Ranked Markets table footer in `src/pages/CityScoring.tsx` to match the earlier state shown in screenshot 2:

- "Showing 1 to 8 of 817 results"
- Right-aligned simple pager: `‹  1  2  …  102  103  ›`
- No `«` / `»` first/last buttons
- No "Rows" selector dropdown
- Default page size back to **8**

The Spreadsheet view is out of scope for this revert.

## Changes (single file: `src/pages/CityScoring.tsx`)

1. **Line 566** — default page size 5 → 8:
   ```
   const [rankedPageSize, setRankedPageSize] = useState<number>(8);
   ```
   (state kept so nothing else breaks; just no UI to change it.)

2. **Lines 2223–2300** — replace the current 3-zone footer with the earlier 2-zone layout:
   - Left: `Showing {from} to {to} of {filtered.length} results` (use "results", not "markets"; drop the `totalPages <= 1` "Showing all N markets" branch — when there's only one page just show e.g. "Showing 1 to 8 of 8 results").
   - Right: pager with only `ChevronLeft` + numbered chips (with `…` ellipses) + `ChevronRight`. Remove `ChevronsLeft` / `ChevronsRight` buttons and the entire `Rows` Select block.
   - Keep existing `pageNumbers` logic (already produces `1 2 … 102 103` style).
   - Keep current chip styling (blue active, white inactive) — it already matches screenshot 2.

3. Leave row markup, row padding (`py-3`), and all other table internals untouched — they already match screenshot 2.

## Out of scope

- `CitySpreadsheetView.tsx` pagination
- Filter pipeline, scoring, data
- Doc updates (will follow on explicit "go docs")
