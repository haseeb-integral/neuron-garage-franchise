# Purge legacy metrics from Spreadsheet + Excel export

Audit of what's still leaking legacy metrics into the City Search **on-screen spreadsheet** and the **Excel/CSV download** (the two surfaces you named).

## What I found

### 1. Excel/CSV download — `src/pages/CityScoring.tsx` line 1078
`buildCsvDownload()` defines `DASHBOARD_DB_KEYS`, which is the column list for the "Backend Data" sheet of the downloaded workbook. It still includes:
- `"school_district_count"` — retired May 22, dropped from on-screen spreadsheet, but still being exported.

### 2. Backend SELECT — `src/lib/cityScoringLiveData.ts` line 134
`loadLiveRankedMarkets` still requests two retired columns from `us_cities_scored`:
- `school_district_count` — nothing in the live UI reads it anymore.
- `school_hosted_camp_count` — Manus-owned CSI input, we don't surface it ourselves.

Removing them from SELECT (a) shrinks payload (b) prevents accidental re-introduction in a future map step (c) matches the doc-synced contract.

### 3. On-screen spreadsheet — `src/components/city-scoring/CitySpreadsheetView.tsx`
Already clean. Only a comment marker remains (line 178) — no code action needed.

## Out of scope (flagging only, not touching)

These are NOT in the spreadsheet or Excel surfaces, so I'm leaving them alone unless you say otherwise:
- `MarketDetailDrawer.tsx` + `MarketReportModal.tsx` still carry a `pricing_power` category branch (drawer UI).
- `src/lib/signalGeography.ts` still has weather signal-key entries (`summer_weather_index`, `avg_peak_summer_temperature`, `days_above_90f`).
- `src/lib/sowNormalize.ts` still has `avg_hourly_camp_pricing` normalization range.

These are dormant — no live data feeds them — but they're legacy debt. Happy to do a separate sweep if you want, just not part of this "spreadsheet + Excel" purge.

## Changes

| # | File | Edit |
|---|---|---|
| 1 | `src/pages/CityScoring.tsx` | Remove `"school_district_count"` from `DASHBOARD_DB_KEYS` array (line 1078). |
| 2 | `src/lib/cityScoringLiveData.ts` | Drop `school_district_count, ` and `school_hosted_camp_count, ` from the SELECT string (line 134). |

## Risk

LOW. Both changes only narrow the data being pulled/exported. The on-screen spreadsheet already doesn't render either column. No scoring math touches them.

## Verify

- Open City Search → Download spreadsheet → confirm "Backend Data" sheet no longer has a `school_district_count` column.
- Check console — no TS errors from missing properties (mapper doesn't reference these two).

## Doc sync (Mode A — will draft only)

After the edit lands I'll draft a one-line note for `PROJECT_CONTEXT.md` § 5 ("Excel export column list trimmed to match live UI") and wait for your "go docs" before writing.
