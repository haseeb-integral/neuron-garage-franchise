# Plan: Retired-Category Purge + Two-Sheet Workbook Export

Two independent changes shipped in one PR.

---

## Part A — Full Retired-Category Purge

Remove `pricingPower`, `easeOfOperations`, `parentMindset` everywhere they still appear in the frontend. Backend already has zero retired columns, so no DB migrations.

### Guarantees (will NOT change)
- Composite score formula, tier assignment, ranked table, key market signals, dashboard cards, Compare modal, Spreadsheet view.
- Database schema, edge functions, `scoring_config` rows already saved per-user.

### Files touched
| File | Change |
|---|---|
| `src/stores/cityScoringStore.ts` | Drop 3 retired members from `CategoryKey`. Remove from initial `masterWeights` + `subWeightsByCategory`. **Bump persist `version` from N → N+1 and add `migrate(state, v)`** that strips the 3 retired keys from any saved `masterWeights` / `subWeightsByCategory` / enabled-sets. One-time, idempotent, zero data loss for active categories. |
| `src/pages/CityScoring.tsx` | Remove 3 entries from `CATEGORIES`; remove 3 lines from any mock `categoryScores`. Collapse `VISIBLE_CATEGORIES` alias. |
| `src/lib/scoringPresets.ts` | Delete **Pricing-Heavy** preset. Rewrite **Balanced** as `demand: 40, franchiseeSupply: 30, competitiveLandscape: 30`. |
| `src/hooks/useCustomCriteria.ts` | Remove 3 mappings + empty-array initializers. |
| `src/lib/sowMetricRegistry.ts` | Remove 3 keys from category→metrics maps. |
| `src/components/city-scoring/AiAnswerCard.tsx` | Remove 3 label/lookup entries. |
| `src/components/city-scoring/AddCriteriaDrawer.tsx` | Remove 3 category strings. |
| `src/components/city-scoring/MarketDetailDrawer.tsx` | Remove 3 entries from category map. |
| `src/components/city-scoring/MarketReportModal.tsx` | Remove 3 entries from `CATEGORY_DEFS`. |
| `src/components/city-scoring/MarketCompareModal.tsx` | Verify no stragglers (done last turn). |

### Verification
- `rg -n "pricingPower\|easeOfOperations\|parentMindset" src` → only the `migrate` function should match.
- App smoke: composite, tiers, ranked table, Compare modal, Dashboard cards, XLSX all show 3 categories with identical numbers as before.

---

## Part B — Two-Sheet Workbook Export (XLSX)

Replace single-sheet CSV with an `.xlsx` workbook containing two sheets. CSV format cannot hold multiple tabs — XLSX is the standard fix and opens natively in Excel / Numbers / Google Sheets. The "Possible Data Loss" banner you saw goes away.

### Sheet 1 — `Snapshot`
True snapshot of the spreadsheet view at the moment of export. Columns exactly match `CitySpreadsheetView` (3 active categories + their sub-metric inputs + Composite/Tier/State/City/County/Metro/Type). Reuses the already-fixed `buildCsvDownload` logic from `src/pages/CityScoring.tsx`, just written into Sheet 1 of the workbook.

### Sheet 2 — `Category Weights` (per-city, collapsible)
**One row per city.** Even though master/sub-weights are user-global today, writing per-city rows means: (a) you can sort/filter by city and see its weights inline, (b) if we ever add per-city overrides in the future, the schema already supports it without breaking existing exports.

**Collapsible category groups** via Excel's native row/column grouping (`xlsx` library supports this via `!cols` outlineLevel). User sees collapsed view by default:

```
City | State | Demand % | [+] | TAM % | [+] | Competitive % | [+]
Austin    TX    40%      …    30%     …    30%             …
Dallas    TX    40%      …    30%     …    30%             …
```

Click the `[+]` above a category to expand its sub-metric weight columns:

```
City | State | Demand % | Children 5-12 % | Median Income % | Dual-Income % | College % | Pop % | TAM % | Districts % | …
Austin    TX    40%        30%               25%                20%             15%         10%    30%     20%            …
```

Where:
- **Category %** = current `masterWeights[category]` from the Zustand store.
- **Metric %** = normalized share = `subWeight[metric] / Σ(enabled sub-weights in that category) × 100`, per AGENTS.md Rule #5.
- Disabled sub-metrics get no column.
- Header row uses readable labels (e.g. "Children 5–12 Weight %"), matching your screenshot.

This sheet answers: *"For these cities, what weighting scheme produced these scores?"* — collapsed for quick scanning, expandable for audit.

### Implementation notes
- `bun add xlsx` (SheetJS, ~400KB, no native deps).
- New helper: `src/lib/cityScoringExport.ts` exporting `buildWorkbook(markets, store): Blob`.
- Uses `XLSX.utils.book_new()`, `XLSX.utils.aoa_to_sheet()`, sets `!cols[i].level` for outline grouping, then `XLSX.write(...)` → Blob.
- `CitySpreadsheetView` Export button → renamed **Export XLSX**, downloads `city-search-snapshot-YYYY-MM-DD.xlsx`.
- `onExportCsv` prop renamed to `onExportWorkbook` (one call site in `CityScoring.tsx`).

---

## Order of operations
1. Part A purge (store + migrate first, then everything that consumes the enum).
2. Part B workbook export.
3. Manual smoke: rankings unchanged → click Export → open .xlsx → verify Sheet 1 matches on-screen table, Sheet 2 opens collapsed, expanding each category reveals normalized weights summing to ~100%.
