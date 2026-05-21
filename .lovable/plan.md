## Goal
Flip the two sheets in the Ranked Markets XLSX export so the **default sheet is raw backend values** and the **second sheet is the snapshot of the user's current categories + weights**.

Currently:
- Sheet 1 "Snapshot" = computed view (rank/composite/per-category contributions using *applied* weights)
- Sheet 2 "Category Weights" = per-city collapsible weight grid (redundant — weights are global, not per-city)

After change:
- Sheet 1 (default) `Backend Data` = raw values straight from the DB row (`scoredRow`) for each filtered city, with NO user weighting applied. One row per city, one column per known metric, plus identity columns (City, State, County, Metro, Population, Source, Last Refreshed).
- Sheet 2 `Weights Snapshot` = compact snapshot of the user's current applied state at export time. Sections:
  1. Top block — one row per category: `Category | Master Weight % (raw) | Master Weight % (normalized of 100)`.
  2. Per-category block — one row per enabled sub-metric: `Category | Metric | Sub-weight (raw) | Normalized Share % (sub_i / Σ enabled × 100)`. Disabled metrics omitted.
  3. Header line at top of sheet with export timestamp.

The per-city collapsible weight grid goes away — weights are global, so repeating them per city was noise.

## Files to change

### `src/lib/cityScoringExport.ts` (rewrite)
- Replace `BuildXlsxArgs` with:
  - `backendHeader: string[]`
  - `backendRows: (string | number | null)[][]`
  - `categories: CategoryDef[]`
  - `appliedWeights`, `appliedSubWeights` (unchanged)
- Sheet order: append `Backend Data` first (becomes default tab), then `Weights Snapshot`.
- Drop the column outline / collapse logic — not needed since Sheet 2 is now a small table, not a wide grid.

### `src/pages/CityScoring.tsx` (`buildCsvDownload`)
- Build `backendRows` directly from each filtered row's `scoredRow` (the raw DB record already loaded). Header = identity columns + every metric key from `METRICS_BY_CATEGORY` across all categories using each metric's `label`. Values are pulled as-is from `scoredRow` (null if missing) — no recompute, no rounding, no weighting.
- Stop building `snapshotRows` / `weightsCities`. Pass `appliedWeights` + `appliedSubWeights` through so the export module can render the snapshot sheet itself.
- Filename stays `ranked-markets-live-YYYY-MM-DD.xlsx`. Toast becomes `Exported: backend data + weights snapshot`.

### No other files touched
- `CitySpreadsheetView.tsx` button label ("Export XLSX") stays.
- No store, scoring, or UI changes.

## Open question
Sheet 2 currently repeats weights per city. Since weights are global (same for every city in the table), do you want me to:
- **(A)** Single global snapshot (recommended, what I planned above), or
- **(B)** Keep per-city rows even though every row is identical?

I'll default to **(A)** unless you say otherwise.
