
-- Phase 1: TAM Teachers 3-metric rebuild (approved 2026-07-12)

ALTER TABLE public.us_cities_scored
  ADD COLUMN IF NOT EXISTS pct_rank_teacher_fte numeric,
  ADD COLUMN IF NOT EXISTS pct_rank_private_elem numeric;

COMMENT ON COLUMN public.us_cities_scored.pct_rank_teacher_fte IS
  'Percentile rank (0-100) of public_elementary_teacher_count across all scored cities. Feeds TAM Teachers pillar (45%). Populated 2026-07-12.';
COMMENT ON COLUMN public.us_cities_scored.pct_rank_private_elem IS
  'Percentile rank (0-100) of private_elementary_count across all scored cities. Feeds TAM Teachers pillar (20%). Populated 2026-07-12.';

-- Populate percentile ranks. percent_rank() gives 0..1 across the ordered set;
-- multiply by 100 for a 0..100 display-friendly score. NULL inputs get NULL rank.
WITH ranks AS (
  SELECT
    id,
    CASE WHEN public_elementary_teacher_count IS NULL THEN NULL
         ELSE ROUND((percent_rank() OVER (ORDER BY public_elementary_teacher_count) * 100)::numeric, 2)
    END AS fte_rank,
    CASE WHEN private_elementary_count IS NULL THEN NULL
         ELSE ROUND((percent_rank() OVER (ORDER BY private_elementary_count) * 100)::numeric, 2)
    END AS priv_rank
  FROM public.us_cities_scored
)
UPDATE public.us_cities_scored s
SET pct_rank_teacher_fte  = ranks.fte_rank,
    pct_rank_private_elem = ranks.priv_rank
FROM ranks
WHERE s.id = ranks.id;

-- Recompute score_tam_teachers with the new 3-metric formula.
--   0.45 * pct_rank_teacher_fte
-- + 0.35 * normalize(col_salary_index)     -- salary×COL inverted; lo=30000 hi=120000
-- + 0.20 * pct_rank_private_elem
-- NULL inputs are dropped from the weighted denominator so partial coverage
-- still produces a score (same NULL-safety pattern used elsewhere).
WITH recruitability AS (
  SELECT
    id,
    CASE
      WHEN col_salary_index IS NULL THEN NULL
      -- Inverted linear normalize: worse economics (lower ratio) → higher score.
      -- Bare COL Index fallback (< 1000) uses 80..180 range; salary composite uses 30000..120000.
      WHEN col_salary_index < 1000 THEN
        GREATEST(0, LEAST(100, (1 - ((col_salary_index - 80) / (180 - 80))) * 100))
      ELSE
        GREATEST(0, LEAST(100, (1 - ((col_salary_index - 30000) / (120000 - 30000))) * 100))
    END AS recr_score
  FROM public.us_cities_scored
),
tam AS (
  SELECT
    s.id,
    -- Weighted average across non-null components.
    CASE
      WHEN COALESCE(s.pct_rank_teacher_fte,  NULL) IS NULL
       AND COALESCE(r.recr_score,            NULL) IS NULL
       AND COALESCE(s.pct_rank_private_elem, NULL) IS NULL
      THEN NULL
      ELSE ROUND((
        (COALESCE(s.pct_rank_teacher_fte,  0) * CASE WHEN s.pct_rank_teacher_fte  IS NULL THEN 0 ELSE 0.45 END)
      + (COALESCE(r.recr_score,            0) * CASE WHEN r.recr_score            IS NULL THEN 0 ELSE 0.35 END)
      + (COALESCE(s.pct_rank_private_elem, 0) * CASE WHEN s.pct_rank_private_elem IS NULL THEN 0 ELSE 0.20 END)
      ) / NULLIF(
          (CASE WHEN s.pct_rank_teacher_fte  IS NULL THEN 0 ELSE 0.45 END)
        + (CASE WHEN r.recr_score            IS NULL THEN 0 ELSE 0.35 END)
        + (CASE WHEN s.pct_rank_private_elem IS NULL THEN 0 ELSE 0.20 END),
          0
        )
      )::int
    END AS new_tam
  FROM public.us_cities_scored s
  LEFT JOIN recruitability r ON r.id = s.id
)
UPDATE public.us_cities_scored s
SET score_tam_teachers = tam.new_tam,
    scored_at          = now()
FROM tam
WHERE s.id = tam.id;

-- Recompute composite with the standard 40/30/30 weights (Demand / TAM / CSI).
-- Uses 50 as neutral fallback for any missing pillar (same pattern as the
-- 2026-05-21 rescore migration) so one null doesn't tank the row.
UPDATE public.us_cities_scored
SET composite_score_default = ROUND(
      0.40 * COALESCE(score_demand,       50)
    + 0.30 * COALESCE(score_tam_teachers, 50)
    + 0.30 * COALESCE(score_csi,          50)
  )::int,
    scored_at = now();

INSERT INTO public.imports (source, batch_label, file_checksum, updated_count, started_at, completed_at, notes)
VALUES (
  'tam_rebuild_3metric',
  '2026-07-12-tam-rebuild',
  md5('tam_rebuild_3metric_45_35_20'),
  (SELECT count(*) FROM public.us_cities_scored),
  now(), now(),
  'TAM Teachers rebuild: 45% FTE percentile + 35% Recruitability (inverted) + 20% Private Elem percentile. Composite recomputed 40/30/30.'
);
