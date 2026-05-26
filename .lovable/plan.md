## Tier 1 — Task 1: City Search number formatting

### Goal
Every number shown in City Search displays with proper units: `$` + commas for money, commas for large counts, `%` for percentages. Score/formula numbers stay raw. Exports stay raw.

### Approach
Centralize one formatter, then route all City Search display sites through it. No DB changes, no scoring changes, no export changes — purely presentational. Each edit is independently revertable.

### Step 1 — Create shared helper
New file `src/lib/numberFormat.ts` exporting:
- `formatMetric(value, key?, opts?)` — auto-detects unit from a key or explicit override (`"currency" | "percent" | "integer" | "decimal"`).
- Internal explicit overrides map for known metric keys whose name doesn't self-describe (e.g. `disposable_household_income → currency`, `under_18_population → integer`, `unemployment → percent`).
- Heuristic fallback (same regex family already in `MetricRow.tsx`) for unknown keys.
- Returns `"—"` for null/blank/non-finite.

### Step 2 — Replace local copy in `MetricRow.tsx`
Delete its inline `formatByKey` / `displayValue` and import from the new util.

### Step 3 — Apply to City Search display surfaces
Audit + update only these files (display strings only):
- `CityTable.tsx` + `cityColumns.tsx` — main table cells
- `CitySpreadsheetView.tsx` — spreadsheet cells
- `MarketDetailDrawer.tsx` + `market-detail/DrawerHeroSummary.tsx` — drawer KPIs
- `StatCards.tsx` — top stat tiles
- `MarketCompareModal.tsx` — compare columns
- `MarketReportModal.tsx` — on-screen preview only (PDF/CSV unchanged)
- `RankedMarketsList.tsx`, `NearbyMarketsPanel.tsx`, `SelectedMarketPanel.tsx`, `SourceDataPanel.tsx`, `ExecutiveSummaryPanel.tsx` — list values

For each: where a raw number is rendered next to a metric label, wrap it in `formatMetric(value, metricKey)`.

### Step 4 — Explicitly skip
These render scoring math, not user-facing metrics. **Do not touch:**
- `sub-weights/FormulaPanel.tsx`
- `sub-weights/CsiLockedPanel.tsx`
- `RowScorePopover.tsx`
- Tier badges, composite scores, normalized 0–100 scores anywhere
- CSV download in `MarketReportModal.tsx` and PDF generator in `market-report/marketReportPdf.ts` (keep raw for re-import)

### Step 5 — Verify
- Visit City Search → confirm `$`, commas, `%` show on table, drawer, stat cards, compare modal.
- Confirm scores (e.g. `73.4`) still render as plain numbers — no `$73.4` regressions.
- Confirm CSV/PDF export still emit raw numbers.

### Out of scope
- Adding a `unit` column to `sowMetricRegistry` (schema change — Tier 2/3).
- Changing any computed value, scoring, or stored data.
- Reformatting numbers outside City Search (Candidates, Pipeline, etc.).

### Technical notes
- `formatMetric` signature:
  ```ts
  type Unit = "currency" | "percent" | "integer" | "decimal";
  formatMetric(value: unknown, key?: string, opts?: { unit?: Unit; maxFractionDigits?: number }): string
  ```
- Percent rule: if `|value| ≤ 1` treat as fraction and ×100; else treat as already-percent. Append `%`.
- Currency rule: round to integer dollars, prefix `$`, thousands separators.
- Integer/decimal: `toLocaleString` with thousands separators.

### Your prompt vs. this plan
Your prompt captures the three formatting rules correctly. This plan adds: (a) one shared helper instead of per-file fixes so we don't drift again, (b) an explicit do-not-touch list for score/formula displays, (c) keeps exports raw. With those additions, your prompt is sufficient — no further clarification needed from you to execute.
