-- Step 1: Roll up charter elementary counts from public_schools (already-cached NCES data)
UPDATE us_cities_scored c
SET charter_elementary_count = sub.cnt,
    updated_at = now()
FROM (
  SELECT us_cities_scored_id, COUNT(*)::int AS cnt
  FROM public_schools
  WHERE is_charter = true
    AND is_elementary_serving = true
    AND us_cities_scored_id IS NOT NULL
  GROUP BY us_cities_scored_id
) sub
WHERE c.id = sub.us_cities_scored_id;

-- For cities that have schools but zero charter-elementary, set to 0 (not null) so we know it was measured
UPDATE us_cities_scored c
SET charter_elementary_count = 0,
    updated_at = now()
WHERE c.charter_elementary_count IS NULL
  AND EXISTS (SELECT 1 FROM public_schools p WHERE p.us_cities_scored_id = c.id);