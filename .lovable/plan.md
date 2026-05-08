## Goal

Make Refresh Data resilient: a `fetch-city-market-data` failure must NOT block `fetch-city-market-data-sow`, so every selected city (e.g. Plano) gets the full 46-row SOW evidence framework and an official SOW score. Also remove the legacy "SOW Shadow Score" card.

## Changes (single file: `src/pages/CityScoring.tsx`)

### 1. Rewrite `handleRefreshData` (around lines 262–303)

New flow:

```text
setRefreshingMarket(true)

let liveData=null, liveError=null, sowData=null, sowError=null

try { liveData = invoke("fetch-city-market-data", {city,state}) }
catch/error → liveError = err   (do NOT return)

try { sowData = invoke("fetch-city-market-data-sow", {city,state}) }
catch/error → sowError = err

console.log("refresh result", { liveData, liveError, sowData, sowError })

await loadLiveData(selected.city, selected.state)
try { setLiveRankedMarkets(await loadLiveRankedMarkets()) } catch (e) { console.error(e) }

Toast matrix:
  live ok  + sow ok   → toast.success "Market data and SOW score refreshed"
  live err + sow ok   → toast.warning "SOW score refreshed. Live market refresh had warnings"
  live ok  + sow err  → toast.warning "Market data refreshed, but SOW scoring failed"
  live err + sow err  → toast.error   "Refresh failed. Live market and SOW scoring both failed"

finally → setRefreshingMarket(false)
```

Notes:
- Treat both `error` returned by `supabase.functions.invoke` AND a thrown exception as failure (capture into `liveError` / `sowError`).
- Description text on each toast includes `${selected.city}, ${selected.state}` and the underlying error message when present.

### 2. Remove the SOW Shadow Score card (lines 787–805)

Delete the entire `{shadowScoring && typeof shadowScoring.composite_score === "number" && ( … )}` block. Also remove the now-unused `shadowScoring` and `shadowReady` derivations at lines 423–424 (and any imports/usages that become dead).

## Out of scope (do not touch)

- Drawer layout (`MarketDetailDrawer.tsx`)
- Report modal layout
- Edge function code, names, or scoring formula
- DB schema
- Helper copy under the score
- Tier hysteresis / blend threshold

## Verification after implement

1. Select Plano → click Refresh Data.
2. Confirm console shows `liveData / liveError / sowData / sowError`.
3. Confirm even if `liveError` is set, the SOW call still ran and Source Evidence drawer shows 46 rows grouped across 6 categories.
4. Confirm `cities.composite_score` and `cities.tier` for Plano reflect the official SOW result.
5. Confirm the SOW Shadow Score card is gone from the middle panel.
