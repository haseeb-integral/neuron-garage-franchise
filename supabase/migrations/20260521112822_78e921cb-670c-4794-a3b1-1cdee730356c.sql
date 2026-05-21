-- TAM Teachers 5-metric reshape: add real teacher count + salary placeholder
ALTER TABLE public.us_cities_scored
  ADD COLUMN IF NOT EXISTS public_elementary_teacher_count integer,
  ADD COLUMN IF NOT EXISTS avg_elementary_teacher_salary_usd integer,
  ADD COLUMN IF NOT EXISTS col_salary_index numeric;

-- Backfill teacher_count from NCES public_schools.teachers_fte (real data)
WITH city_teachers AS (
  SELECT
    us_cities_scored_id AS city_id,
    SUM(teachers_fte)::int AS teacher_total
  FROM public.public_schools
  WHERE is_elementary_serving = true
    AND us_cities_scored_id IS NOT NULL
    AND teachers_fte IS NOT NULL
  GROUP BY us_cities_scored_id
)
UPDATE public.us_cities_scored u
SET public_elementary_teacher_count = ct.teacher_total
FROM city_teachers ct
WHERE u.id = ct.city_id;

COMMENT ON COLUMN public.us_cities_scored.public_elementary_teacher_count IS 'Sum of NCES teachers_fte across all elementary-serving public schools mapped to this city. Real, not estimated.';
COMMENT ON COLUMN public.us_cities_scored.avg_elementary_teacher_salary_usd IS 'BLS OEWS SOC 25-2021 mean annual wage at MSA level. Sourced via Manus AI batch. NULL until delivered.';
COMMENT ON COLUMN public.us_cities_scored.col_salary_index IS 'Composite: avg_elementary_teacher_salary_usd * cost_of_living_index / 100. Lower = stronger franchisee recruiting pull. NULL until salary delivered.';