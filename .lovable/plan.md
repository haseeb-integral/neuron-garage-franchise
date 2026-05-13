# Execute approved fixes 1, 2, 3 — remove Frisco-only mock, Nearby Markets, and Compare modal hardcoding

Implementing in order, smallest blast radius first.

---

## Step 1 — Kill `isFriscoMock` branch

File: `src/pages/CityScoring.tsx`

- Delete line 565 `const isFriscoMock = selected.city === "Frisco" && selected.state === "Texas";`
- Line 591: change `: isFriscoMock ? 91 : selected.compositeScore;` → `: selected.compositeScore;`
- Lines 593–595: replace `const fallbackCats = isFriscoMock ? {…Frisco-specific…} : categoryScores(selected);` with `const fallbackCats = categoryScores(selected);`

Result: Frisco no longer gets a hardcoded 91/special category object. It uses the same path as every other city — live `liveUiCategoryScores` if present, otherwise the deterministic `categoryScores(c)` formula on whatever `selected` data is available.

---

## Step 2 — Remove "Nearby Markets" hardcoded panel

File: `src/pages/CityScoring.tsx`

- Delete lines 80–86 (`NEARBY_MARKETS` constant).
- Delete the `showNearby` state at line 123 and the toggle at line 796.
- Delete the entire `{showNearby && (…)}` block at lines 1193–1214 in the right column.

Result: the right-column "Nearby Markets" card is gone. We can rebuild it later sourced from `cities` table filtered by same `metro_area`. Out of scope here.

(I am NOT removing the decorative Market Snapshot map and Source Data panel — those were items 6 in the audit, not approved here.)

---

## Step 3 — Make Compare modal use live data, no per-city ternaries

Files:
- `src/components/city-scoring/MarketCompareModal.tsx` (rewrite)
- `src/pages/CityScoring.tsx` (change what we pass into it)

### 3a. Change the modal's input contract

Replace `markets: CityData[]` with `markets: RankedMarket[]` (the same live-aware object the Ranked Markets table already uses). `RankedMarket` already has city, state, county, metroArea, tier, compositeScore, population, cityId.

### 3b. Fetch live signals + category scores when the modal opens

When `open && markets.length >= 2`:
- Collect `cityId`s from markets that have one (live cities).
- Query in parallel:
  - `city_market_signals` where `city_id in (...)` → group by `city_id`, pick the 6 signals matching `signal_key` of: `children_5_12`, `households_100k_plus`, `premium_pricing`, `teacher_density`, `school_district_access`, `millennial_density` (these are the SOW signal keys; if a key isn't present, render `—`).
  - `city_category_scores` where `city_id in (...)` → group by `city_id`, map to the 6 categories used in the table.
- Hold results in local state keyed by `cityId`.

### 3c. Render rules

- **Header per column**: `{city}, {state-abbrev}` and `{county ?? metroArea ?? "—"}` — no more `population > 200000 ? "Travis County" : "Collin County"`.
- **Overall Score**: `market.compositeScore` (delete `scoreForMarket` Frisco/Plano/Austin overrides).
- **Tier**: `market.tier` (drop the literal `(Tier 1)` label suffix; just show the letter pill).
- **Category Scores**: from fetched `city_category_scores`; fall back to `—` and a flat grey bar when missing. Delete `categoryScore()` Frisco override and `CATEGORY_ROWS` `.get()` synthesizers — the row defs become `{ key, label, categoryKey }`.
- **Key Market Signals**: from fetched `city_market_signals`; render `value` and `delta` straight from the row. Missing → `—` / hide delta. Delete the per-city ternaries entirely.
- Sample-only cities (no `cityId`) render `—` for every signal/category and a small "No live data — refresh this market first" hint under the header.

### 3d. Wire live markets into the modal

`src/pages/CityScoring.tsx` line 1304 currently:
```tsx
markets={sampleCities.filter((c) => selectedForCompare.includes(c.id)).slice(0, 4)}
```
Change to use the live ranked list:
```tsx
markets={filtered.filter((m) => selectedForCompare.includes(m.id)).slice(0, 4)}
```
(`filtered` is already the live-aware `RankedMarket[]` used by the table; `selectedForCompare` already stores those ids.)

---

## Files touched
- `src/pages/CityScoring.tsx` — Steps 1, 2, and 3d
- `src/components/city-scoring/MarketCompareModal.tsx` — Step 3 rewrite

## Out of scope (deferred per your approval scope)
- Items 4–7 from the audit (mock category formula, sample injection into ranked list, decorative map, hardcoded SOURCES, scoring-model preset, state shortener).

After approval I'll run them sequentially in one implementation pass and verify the build.
