
WITH src AS (
  SELECT
    id,
    lower(coalesce(name,'')) AS name_lc,
    coalesce(price_min, 0) AS pmin,
    coalesce(price_max, 0) AS pmax,
    tier::text AS old_tier
  FROM public.mvs_providers
  WHERE city = 'Austin, TX'
),
classified AS (
  SELECT
    id,
    old_tier,
    CASE
      WHEN name_lc ~ '\y(ymca|jcc|parks?\s*(and|&)?\s*rec(reation)?|public library|municipal|city of |church|kindercare|boys\s*(and|&)?\s*girls\s*club|scout|4-h|parks\s+dept)\y'
        THEN 'community'
      WHEN (pmin = 0 AND pmax = 0)
        AND name_lc ~ '\y(daycare|preschool|childcare|after.?school\s+care|learning\s+center|montessori\s+school)\y'
        THEN 'community'
      WHEN name_lc ~ '\y(galileo|id\s*tech|steve\s*&?\s*kate|snapology|lavner|mad\s+science|code\s+ninjas|british\s+soccer|challenger\s+sports|school\s+of\s+rock)\y'
        THEN 'premium'
      WHEN (pmin > 0 OR pmax > 0) THEN
        CASE
          WHEN pmin >= 300 AND pmax >= 400 THEN 'premium'
          WHEN pmax > 0 AND pmax < 200 AND (pmin = 0 OR pmin < 200) THEN 'budget'
          ELSE 'mid'
        END
      ELSE
        CASE WHEN old_tier = 'premium' THEN 'mid' ELSE old_tier END
    END::text AS new_tier
  FROM src
)
UPDATE public.mvs_providers p
   SET tier = c.new_tier::mvs_tier,
       updated_at = now()
  FROM classified c
 WHERE p.id = c.id
   AND c.new_tier IS NOT NULL
   AND (p.tier::text IS DISTINCT FROM c.new_tier);
