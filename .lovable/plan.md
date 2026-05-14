# Day 4 — BLS OEWS Wage Fetcher

Promote 3 wage proxies to real BLS data with honest tier tracking.

## 1. New fetcher: `fetchBlsOewsWages(stateAbbr, metroArea)`

Location: `supabase/functions/_shared/metricFetchers.ts`

- Single BLS Public Data API v2 request (uses existing `BLS_API_KEY`).
- Series IDs follow OEWS format: `OEUM<area_code><industry><soc_code><datatype>`.
  - SOC `25-2021` Elementary Teachers — annual mean wage (datatype `04`)
  - SOC `39-9011` Childcare Workers — hourly mean wage (datatype `03`)
- 3-tier fallback **per SOC** (independent — teacher may be metro while childcare is state):
  1. **Metro** — resolve `metroArea` → MSA area code via small built-in map (Dallas-Fort Worth, Houston, NYC, LA, Chicago, Phoenix, Atlanta, Boston, Miami, Seattle, DC, etc.; expand as needed). Series prefix `OEUM`.
  2. **State** — resolve `stateAbbr` → state area code. Series prefix `OEUS`.
  3. **National** — area code `0000000`. Series prefix `OEUN`.
- Returns:
  ```ts
  { teacher: { value, tier, area }, childcare: { value, tier, area }, error }
  ```
  where `tier ∈ 'metro' | 'state' | 'national' | null` and value is `null` on full failure.
- Catches all network/parse errors — never throws. Single HTTP request batches all needed series IDs (BLS allows up to 50 per request).

## 2. Wire into SOW function

Location: `supabase/functions/fetch-city-market-data-sow/index.ts`

- Call `fetchBlsOewsWages(stateAbbr, metroArea)` inside the existing `Promise.all([...])` block alongside NOAA / BEA / NCES.
- Cap respected: 1 BLS request per refresh.
- Pass result into `buildSowSignals(...)` via a new `blsOews` field.

## 3. Signal writes (in `buildSowSignals`)

Three signals to `city_market_signals`:

| signal_key | source | value | status rule |
|---|---|---|---|
| `teacher_salary_proxy` | bls_oews | `$NN,NNN` | `live` if tier=metro, else `proxy` if state/national, else `missing` |
| `guide_wage_proxy` | bls_oews | `$NN.NN/hr` | same |
| `childcare_nanny_hourly_rate_proxy` | bls_oews | `$NN.NN/hr` | same (reuses SOC 39-9011 — different registry meaning) |

Each row's `raw_data` includes:
```json
{ "soc": "25-2021", "tier": "metro", "area_code": "19100", "area_label": "Dallas-Fort Worth-Arlington, TX" }
```

Notes field surfaces tier in plain English:
- metro → "BLS OEWS metro-level wage for [MSA]"
- state → "BLS OEWS state-level wage (no metro data); used as proxy for [city]"
- national → "BLS OEWS national wage (no state data); used as proxy"

## 4. Registry promotion

Flip `status: 'proxy'` → `status: 'live'` for these 3 keys in **both** files:
- `supabase/functions/_shared/scoring.ts`
- `src/lib/sowMetricRegistry.ts`

`enabled` flags and weights unchanged. (Per-row runtime status from raw_data still drives the Live/Estimated/Missing UI badges, so a state-fallback row will still display as "Estimated" even though the registry says live — this matches Day 2/3 behavior.)

## 5. Verify

- Deploy `fetch-city-market-data-sow`.
- Direct curl with `{ city: "Frisco", state: "Texas" }`.
- Report:
  - New Live / Estimated / Missing counts
  - Which BLS tier was used for Frisco's teacher and childcare SOC (expected: metro = Dallas-Fort Worth-Arlington MSA, area code `19100`)
- Stop. Wait for confirm before Day 5.

## Risks / honest caveats

- **MSA code map is hand-rolled.** Cities outside the ~30 MSAs we encode will fall back to state-tier (still proxy, still useful — just not "live"). Easy to extend later.
- **OEWS data is annual** (one release per year, ~May). No freshness concern within a sprint.
- **`childcare_nanny_hourly_rate_proxy` reuses SOC 39-9011.** It's the closest defensible BLS code for in-home childcare. Real Care.com nanny rates run 30-60% higher; flagged in the notes field so Sam isn't misled.
