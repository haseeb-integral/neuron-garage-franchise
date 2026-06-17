-- Dedupe mvs_weeks: keep newest row per (provider_id, week_start)
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY provider_id, week_start
           ORDER BY updated_at DESC, created_at DESC, id DESC
         ) AS rn
  FROM public.mvs_weeks
)
DELETE FROM public.mvs_weeks w
USING ranked r
WHERE w.id = r.id AND r.rn > 1;

ALTER TABLE public.mvs_weeks
  ADD CONSTRAINT mvs_weeks_provider_week_uniq UNIQUE (provider_id, week_start);