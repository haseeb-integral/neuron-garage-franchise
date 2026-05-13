# Permanent Geocoding via SimpleMaps US Cities CSV

You uploaded `uscities.csv` (31,257 rows, SimpleMaps US Cities Basic). I'll use that file directly — no need to re-download. Doing all 6 steps in one go.

---

## Step 1 — Stage the CSV (you already uploaded it)

`user-uploads://uscities.csv` — relevant columns: `city`, `city_ascii`, `state_id` (2-letter), `state_name` (full), `lat`, `lng`, `population`, `density`. ~31k rows covers every US incorporated place; our 320 cities are a strict subset.

I'll copy it to `/tmp/uscities.csv` so it can be loaded via `psql \copy` / `COPY FROM STDIN`.

## Step 2 — Migration: create `us_cities_geo`

```sql
CREATE TABLE public.us_cities_geo (
  id           bigserial PRIMARY KEY,
  city         text         NOT NULL,
  city_ascii   text         NOT NULL,
  state_id     text         NOT NULL,   -- 'WY'
  state_name   text         NOT NULL,   -- 'Wyoming'
  county_name  text,
  lat          numeric(9,6) NOT NULL,
  lng          numeric(9,6) NOT NULL,
  population   integer,
  density      numeric
);

CREATE INDEX idx_us_cities_geo_lookup
  ON public.us_cities_geo (LOWER(city_ascii), LOWER(state_name));
CREATE INDEX idx_us_cities_geo_alt
  ON public.us_cities_geo (LOWER(city), LOWER(state_name));

ALTER TABLE public.us_cities_geo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read us_cities_geo"
  ON public.us_cities_geo FOR SELECT TO authenticated USING (true);
```

Read-only reference data — no insert/update/delete policies (seeded server-side).

## Step 3 — Seed `us_cities_geo` from the CSV

I'll load the file via `psql \copy` into a temp staging table, then `INSERT … SELECT` into `us_cities_geo` keeping only the columns we need. Done in one shot (~31k rows, <2s). No edge function needed for seeding — it's a one-time admin task best done via direct SQL.

Verify count after load: `SELECT count(*) FROM us_cities_geo;` should be ~31,257.

## Step 4 — One-shot backfill of `cities.latitude/longitude`

```sql
UPDATE public.cities c
SET    latitude  = g.lat,
       longitude = g.lng
FROM   public.us_cities_geo g
WHERE  c.latitude IS NULL
  AND  LOWER(c.state) = LOWER(g.state_name)
  AND  (LOWER(c.city) = LOWER(g.city_ascii)
        OR LOWER(c.city) = LOWER(g.city));
```

Then report match count:
```sql
SELECT
  count(*) FILTER (WHERE latitude IS NOT NULL) AS matched,
  count(*) FILTER (WHERE latitude IS NULL)     AS unmatched,
  count(*) AS total
FROM public.cities;
```

If any unmatched, list them so you can decide whether to add aliases (e.g. "St." vs "Saint", "Mt." vs "Mount"). I'll attempt a second pass with simple normalization (strip `.`, expand `St`/`Mt`) before reporting final numbers.

## Step 5 — Auto-geocode new cities (bonus, keeps it permanent)

Add an `AFTER INSERT` trigger on `cities` that fills lat/lng from `us_cities_geo` automatically, so any city added via AddCityModal is mapped instantly with zero UI work.

```sql
CREATE OR REPLACE FUNCTION public.fill_city_coords()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
    SELECT g.lat, g.lng INTO NEW.latitude, NEW.longitude
    FROM public.us_cities_geo g
    WHERE LOWER(g.state_name) = LOWER(NEW.state)
      AND (LOWER(g.city_ascii) = LOWER(NEW.city) OR LOWER(g.city) = LOWER(NEW.city))
    LIMIT 1;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_fill_city_coords
BEFORE INSERT ON public.cities
FOR EACH ROW EXECUTE FUNCTION public.fill_city_coords();
```

## Step 6 — Remove Nominatim plumbing

- Delete `supabase/functions/backfill-city-coordinates/` and call `supabase--delete_edge_functions(["backfill-city-coordinates"])`.
- In `src/components/city-scoring/MarketsMap.tsx`:
  - Remove `handleBackfill`, `backfilling` state, the "Backfill Coordinates" button, the empty-state CTA, and the `RefreshCw` import.
  - Simplify the empty state to a static message (shouldn't appear in practice now).
  - Keep the coords-loading `useEffect` exactly as is.

## Acceptance

- `us_cities_geo` populated (~31k rows).
- Reported match count for our 320 cities (target: ≥315; the rest are likely typos / non-incorporated places that we'll fix manually).
- Map tab loads with markers visible on first paint, no button click required.
- Adding a new city via AddCityModal auto-fills lat/lng (verified by inserting one test row in psql).
- `backfill-city-coordinates` function gone from the deployed list.

## Risks

| Risk | Mitigation |
|------|------------|
| CSV rows with apostrophes / commas in city names | Use `\copy` with proper quoting (CSV mode) — already handled by SimpleMaps' quoting. |
| Duplicate city/state pairs (e.g. two "Springfield, Ohio" — there aren't, but defensively) | `LIMIT 1` in the trigger; `UPDATE` is idempotent. |
| Unmatched cities | Reported back to you; quick manual fix or a second normalization pass. |
| Bloating the DB with 31k rows | Negligible (~3 MB), one indexed reference table. |

## Order

1. Migration (table + indexes + RLS + trigger function & trigger). 2. Stage CSV → load into `us_cities_geo` via `psql \copy`. 3. Run UPDATE + report match count. 4. Delete edge function + remove button from MarketsMap. 5. Manual smoke test of Map tab.
