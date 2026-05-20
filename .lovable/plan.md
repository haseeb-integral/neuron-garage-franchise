# Multi-City Teacher Search — Full Plan

## Today's state (audit)

- **Teacher Search** filters by a **single city** only:
  - Store: `cityFilter: string` (`"All"` or one city)
  - Query: `q.eq("city", cityFilter)`
  - Stats RPC: `teacher_prospects_stats(p_city text)` — single value
  - URL: `?city=Bethesda&state=MD`
  - Filter bar: single-select dropdown
  - Banner + heading: assume one city
- **City screen entry points:**
  - `CityDetailDrawer.handleFindTeachers` → navigates with one `?city=&state=` (single drill-down only)
  - **No multi-select, no watchlist UI, no compare-driven handoff** exists today. `watchlist_items` table exists but is unused. `CompareModal` / `MarketCompareModal` exist but don't pipe into Teacher Search.
- **Saved lists**: `teacher_saved_lists.filters` is `jsonb` — already array-capable, no schema change needed.

So: **nothing in the existing UI supports more than one city today.** Drawer button is the only entry, and it's single-city by construction.

---

## Target behavior

1. Teacher Search accepts **1..N cities** (typically 1–5; cap at 10 to keep queries sane).
2. Two entry paths from City Search:
   - **Single city** — existing drawer button (unchanged UX, just round-trips through array internally).
   - **Multi-city** — new row-checkbox selection in `CityTable` + sticky bulk-action bar: *"Find teachers in N selected markets"*.
3. Inside Teacher Search:
   - Filter bar shows a **multi-select** city picker (checkbox list + search) replacing the single dropdown.
   - **Market Context Banner** shows a chip per city (`Bethesda, MD ×`, `Rockville, MD ×`), aggregate composite range (e.g., "Composite 92–98"), and total population. Each chip is removable.
   - **Heading**: `Teachers in Bethesda, MD +2 more` (tooltip = full list).
   - **Adaptive columns**: hide City column only when exactly 1 city selected; show it otherwise (so user can tell rows apart).
   - **Saved lists** persist the array transparently (no UI change needed).
4. URL contract: comma-separated, order-stable: `?city=Bethesda,Rockville,Silver%20Spring&state=MD,MD,MD`. Single-city URLs continue to work (back-compat).

---

## Implementation steps

### B1. Data layer
- **Migration**: update `teacher_prospects_stats` RPC signature to accept `p_cities text[] default null` (keep `p_city text` for back-compat — if `p_cities` is null/empty, fall back to `p_city` behavior). Change the city predicate to `(p_cities IS NULL OR cardinality(p_cities)=0 OR t.city = ANY(p_cities))`.
- No table changes. `teacher_saved_lists.filters` already jsonb.

### B2. Store & URL
- `useTeacherProspectsStore`: replace `cityFilter: string` with `cityFilters: string[]` (empty array = All). Add helpers `addCity`, `removeCity`, `setCities`, `clearCities`.
- URL sync in `TeacherProspects.tsx`:
  - Read: parse `?city=` as CSV → array; same for `?state=`.
  - Write: join array as CSV; omit param when empty.
  - Back-compat: a single value still parses correctly.

### B3. Query layer (`TeacherProspects.tsx`)
- Replace `.eq("city", cityFilter)` with `.in("city", cityFilters)` when array non-empty (both list query and count query).
- Replace `p_city: cityFilter` with `p_cities: cityFilters` on RPC call.

### B4. Filter bar (`TeacherFilterBar.tsx`)
- Replace single `<Select>` with a popover containing a searchable checkbox list of cities + "Clear" + "Select all visible". Trigger button shows `City: All` / `City: Bethesda` / `City: 3 selected`.

### B5. Market Context Banner (`MarketContextBanner.tsx`)
- Accept `cities: {city,state}[]` instead of single.
- When length=1 → current rich layout (Tier, Composite, Population).
- When length>1 → chip row + aggregate line: `N markets · Composite {min}–{max} · Pop {sum}`. Query `us_cities_scored` with `.in("city_name", arr)` filtered by state.
- "Clear all" button clears array + URL.

### B6. Heading + adaptive columns (`TeacherProspects.tsx`, `TeacherTable.tsx`)
- Heading: 0 → "Teacher Search"; 1 → `Teachers in {city}, {state}`; ≥2 → `Teachers in {first} +{n-1} more` (Tooltip lists all).
- `hideCityColumn` → only true when `cityFilters.length === 1`.

### B7. City screen entry — multi-select
- **`CityTable.tsx`**: add a leading checkbox column + header "select all on page" checkbox. Selection state lives in `CityScoring.tsx` (`selectedCityIds: Set<string>`).
- **New `BulkActionBar.tsx`** (sticky bottom bar, shows when selection > 0): `N selected · [Find Teachers] [Compare] [Clear]`.
  - `Find Teachers` → navigates to `/teacher-prospects?city=A,B,C&state=...` (cap at 10; toast if exceeded).
- `CityDetailDrawer.handleFindTeachers` unchanged (single-city path still works because URL parser accepts both).

### B8. Saved lists (`SavedListsMenu.tsx`)
- No code change required logically (filters is jsonb); just verify save/restore round-trips `cityFilters` array. Update default values: `cityFilter` → `cityFilters: []`.
- Display: when restoring, show `N cities` in the saved-list row subtitle.

### B9. Doc sync (Mode A — draft only, wait for go)
- `PROJECT_CONTEXT.md`: Teacher Search filter is now array-based; multi-city entry from City Search.
- `HOW_IT_WORKS.md`: City → Teacher flow now supports bulk selection.
- `OPEN_TASKS.md`: close Task 9 (multi-city Teacher Search).
- `GLOSSARY.md`: add "Market set" (1..N cities scoped together in Teacher Search).

---

## Files touched

**Edited**
- `src/pages/TeacherProspects.tsx` — store usage, URL parsing, RPC call
- `src/store/useTeacherProspectsStore.ts` — `cityFilters: string[]`
- `src/components/teacher-prospects/TeacherFilterBar.tsx` — multi-select popover
- `src/components/teacher-prospects/MarketContextBanner.tsx` — array prop, chip row
- `src/components/teacher-prospects/TeacherTable.tsx` — `hideCityColumn` logic stays, called differently
- `src/components/teacher-prospects/SavedListsMenu.tsx` — array shape
- `src/pages/CityScoring.tsx` — owns `selectedCityIds`
- `src/components/city-scoring/CityTable.tsx` — checkbox column

**Created**
- `src/components/city-scoring/BulkActionBar.tsx`
- Migration: alter `teacher_prospects_stats` to accept `p_cities text[]`

---

## Risks & guardrails

- **Query size**: cap at **10 cities** in URL parser + bulk action (toast on overflow). `.in()` with 10 strings is trivial.
- **RPC back-compat**: keep `p_city` argument so any cached client doesn't break during deploy.
- **URL length**: 10 cities × ~25 chars ≈ 250 chars — safe.
- **Selection persistence on city screen**: selection is page-local (resets on navigation away) — matches Gmail/Linear convention. Not persisted across reloads in this pass.
- **No design changes** to existing single-city flow; it remains a special case of the array path.

---

## Out of scope (deferred)

- Watchlist as a first-class "saved market set" with its own UI (table exists, no UI).
- Per-city sub-tabs inside Teacher Search.
- "Compare teachers across markets" analytics view.
- Multi-state mixing safeguards beyond the 10-city cap.
