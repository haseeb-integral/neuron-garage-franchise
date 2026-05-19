
## Part 1 — Why 10 + 26 ≠ 46 (plain English, final)

Austin's drawer shows **10 Pre-seeded** + **26 Not seeded yet** = 36. The missing 10 split as: **2 Source unavailable** + **8 Tracked-no-value** (silent today) + **0 Tracked-not-scored-with-value**. Plus **1 Custom** sits outside the 46. Total: 10 + 26 + 2 + 8 + 0 = **46**. ✓

### Why "Tracked-no-value (8)" is its own bucket and not merged into "Not seeded yet"

Both have no value — true. They're split by **why**, not whether:

- **Stack A — "Counts toward the score" (38 metrics for Austin).** Seeding these moves Austin's number. Missing one = real scoring gap. → home of **"Not seeded yet (26)"**. Urgent.
- **Stack B — "Tracked for context only, never moves the score" (8 metrics).** Sam flagged them `enabled: false` in the registry on purpose. Even if we seed them tomorrow the composite is unchanged. → home of **"Tracked-no-value (8)"**. Not urgent.

Yes we should still seed the 8 eventually — they are real metrics. They get their own bucket so urgency stays visible. If Sam ever flips one to `enabled: true`, it auto-moves into "Not seeded yet" with no code change.

### UI fixes (small, on top of what we already shipped)

1. **Button label** → `"View all signals →"` (drop the number).
2. **Add a 5th chip** in the top row: `8 Tracked-no-value` (conditional `>0`), hover = *"Audit-only metrics with no value yet — not part of the score."*
3. **One-line caption under the chips:** *"Chips total 46 of 46 scoring metrics. Custom metrics shown separately."*

Files:
```text
src/components/city-scoring/MarketDetailDrawer.tsx
```

---

## Part 2 — Drop the 4 legacy tables

Confirmed by Haseeb. None are read by the new City Search screen.

```sql
DROP TABLE IF EXISTS public.city_category_scores;
DROP TABLE IF EXISTS public.city_fetch_jobs;
DROP TABLE IF EXISTS public.city_competitors;
DROP TABLE IF EXISTS public.cities;
```

Dead readers to remove so build stays green:
- **Delete** edge function `supabase/functions/fetch-city-market-data/` (writes to all 4 legacy tables).
- **Delete** edge function `supabase/functions/fetch-city-market-data-sow/` (same).
- Grep + clean any remaining import of those table names in `src/`.

---

## Part 3 — Rewire "Add City" to `us_cities_scored`

Confirmed: option (b). Behavior:

1. User opens **Add City** modal → types City + State (county/metro fields removed — they come from the lookup).
2. We look up the row in `us_cities_geo` by `(LOWER(state_name), LOWER(city_ascii) OR LOWER(city))`.
   - No match → toast *"We don't have geographic data for that city. Please check spelling or contact Haseeb."* and abort.
3. Check for existing row in `us_cities_scored` by `(city_name, state_name)`.
   - If exists → toast *"Already in your list"*, close.
4. Insert into `us_cities_scored` with:
   - `city_name`, `state_name`, `state_abbr`, `county_name`, `latitude`, `longitude`, `population` (all from the geo row)
   - `is_registration_state` = derived from the 38 non-registration states hardcoded list
   - everything else NULL (scores blank until next seed run)
5. Toast: *"Added {City}, {State}. Scores will populate on the next seed run."*
6. New row shows up in the City Search table immediately with empty score columns and "Seed pending" in the drawer.

Schema work: `us_cities_scored` currently blocks INSERT for authenticated (`Can't INSERT`). New migration adds:
```sql
CREATE POLICY "Authenticated can insert scored cities"
ON public.us_cities_scored FOR INSERT TO authenticated WITH CHECK (true);
```
(No update/delete policy — adds only. Matches the "canonical seeded universe" model.)

Files:
```text
src/components/city-scoring/AddCityModal.tsx     (rewrite — lookup us_cities_geo, insert us_cities_scored)
```

---

## Part 4 — `cities.notes` is NOT worth copying

Queried it: 320 rows, 9 have non-empty notes. 8 of the 9 = literal string `"SOW metric coverage refresh"` (machine stamp). 9th = San Diego `"Live API + Census ACS 2022 (place 66000)"` (also machine-generated). **Zero human content.**

**Decision: do NOT add `us_cities_scored.notes`.** Drop `cities` clean. If you ever want a per-city scratchpad we add it then as a new feature.

---

## Execution order (so nothing breaks mid-flight)

1. **Drawer UI tweaks** (Part 1) — no schema, ship first, instant verify.
2. **Add City rewrite + INSERT policy migration** (Part 3) — verify by adding "Carmel, Indiana" and seeing it appear.
3. **Delete the 2 dead edge functions** (Part 2 prep).
4. **DROP TABLE migration** for the 4 legacy tables (Part 2 final). Done last so any straggler imports surface in build first.

## Out of scope

- Scoring math.
- Backfilling the 26 "Not seeded yet" metrics (`OPEN_TASKS` B7/B9/B10a) — separate task.
- Seeding the 8 "Tracked-no-value" metrics — also separate, lower priority.

## Doc-sync (Mode A — drafts, I will wait for your "go")

After implementation I'll summarize one-line proposed edits to:
- `PROJECT_CONTEXT.md` — legacy tables dropped; Add City now writes to `us_cities_scored`.
- `OPEN_TASKS.md` — close B5 (drop legacy tables); add "seed the 8 tracked-only metrics" as low-priority.
- `GLOSSARY.md` — add "Tracked-no-value" definition; clarify "Tracked-not-scored" already covers both buckets.
- `HOW_IT_WORKS.md` — Add City flow now goes through `us_cities_geo` lookup.

No file written without your "go".
