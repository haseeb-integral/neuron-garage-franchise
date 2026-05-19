# Fix: Metro Area + County missing for all cities except Austin

## What's actually broken

I queried `us_cities_scored` directly:

| total rows | with `county_name` | with `metro_area` |
|---|---|---|
| 960 | **1** | **1** |

Only Austin has values. Every other city — Dallas, Fort Worth, Houston, Allen, Leander, etc. — shows `—` because the columns are NULL.

**Root cause:** `seed-cities-database` never wrote `county_name` or `metro_area`. The single Austin row got them from a legacy manual insert. The hardcoded map in `supabase/functions/_shared/cityGeo.ts` only covers ~50 cities and is only used by the legacy (now-deleted) `fetch-city-market-data-sow` function.

Good news: the reference table `us_cities_geo` already has `county_name` for every U.S. city — we just never copied it over.

---

## Fix (3 steps)

### Step 1 — Backfill `county_name` for all 960 cities (instant, SQL only)

One migration:
```sql
UPDATE public.us_cities_scored s
SET county_name = g.county_name
FROM public.us_cities_geo g
WHERE s.county_name IS NULL
  AND LOWER(g.state_name) = LOWER(s.state_name)
  AND (LOWER(g.city_ascii) = LOWER(s.city_name)
       OR LOWER(g.city)       = LOWER(s.city_name));
```
Expected: ~955+ cities filled in one shot. Any unmatched rows (typos, alt spellings) get logged so I can fix manually.

### Step 2 — Backfill `metro_area` (CBSA) for all 960 cities

`us_cities_geo` does **not** have metro area, so I need a county → CBSA crosswalk. Plan:

1. Bundle the Census Bureau **March 2023 CBSA delineation file** as a static JSON inside a new one-shot edge function `backfill-city-metro`. ~3,100 counties → ~390 CBSAs. Public domain, ~150 KB. Key = `LOWER(state_abbr) + '|' + LOWER(county_name)`, value = the official CBSA title (e.g. `"Dallas-Fort Worth-Arlington, TX"`).
2. Function reads all `us_cities_scored` rows, joins on (state_abbr, county_name), writes `metro_area`. Idempotent — only overwrites if currently NULL or differs.
3. I run it once. Expected coverage: ~920+ cities. The ~40 that fall outside any CBSA (truly rural micropolitan or unmatched) stay NULL and are listed in the function response so Sam can decide.

### Step 3 — Make future seeds populate both fields

Update `seed-cities-database` so newly inserted/refreshed rows always set `county_name` (from `us_cities_geo`) and `metro_area` (from the same CBSA crosswalk, extracted into `_shared/cbsaLookup.ts`). Also patch `AddCityModal` so manually added cities get both immediately — same two lookups, no UI change.

---

## What the user will see (Dallas example, after fix)

```
Dallas, TX
Tier: B (Tier 2)        Market Type: Suburb
Metro Area: Dallas-Fort Worth-Arlington, TX
County:     Dallas
```

(matches Austin's existing display)

---

## Files I will touch

- new migration: `supabase/migrations/<ts>_backfill_county_from_geo.sql`
- new edge function: `supabase/functions/backfill-city-metro/index.ts` + bundled `cbsaCrosswalk.json`
- new shared module: `supabase/functions/_shared/cbsaLookup.ts`
- edited: `supabase/functions/seed-cities-database/index.ts` (set both fields on insert)
- edited: `src/components/city-scoring/AddCityModal.tsx` (set both fields on Add City)

No UI/component changes to the drawer or table — they already render these fields, they're just NULL today.

---

## Risk / rollback

- **Risk: low.** Both columns are currently almost entirely NULL — any value is strictly better. Backfill is idempotent (only fills NULLs).
- **Rollback:** `UPDATE us_cities_scored SET county_name = NULL, metro_area = NULL WHERE id <> '<austin-id>'`.

---

## Doc-sync (after implementation, Mode A — drafts for your "go")

- **PROJECT_CONTEXT.md** — `us_cities_scored` row: note county + metro now populated for ~960 cities; new `backfill-city-metro` edge function + `_shared/cbsaLookup.ts`.
- **HOW_IT_WORKS.md** — Add City flow: also fills county + metro from `us_cities_geo` + CBSA crosswalk.
- **OPEN_TASKS.md** — add `~~B12. Backfill metro+county~~ ✅` line under completed.
- **GLOSSARY.md** — add **CBSA** = Core Based Statistical Area; the Census Bureau metro/micro area name we display as "Metro Area".

---

## One clarifying question before I implement

For the ~5–40 cities where the CBSA crosswalk has no match (truly rural cities outside any CBSA — e.g. some Montana/Wyoming towns above 50k that aren't in a metro), do you want:

- **(a)** Leave `metro_area` NULL and the drawer keeps showing `—` for those, OR
- **(b)** Fall back to `"{city_name} micropolitan area, {state_abbr}"` so the field is never empty?

If you don't pick, I'll go with **(a)** — never invent a name.