-- Convert raw Manus CSI saturation number → 0..100 headroom score (inverted, clamped 40..98)
UPDATE public.us_cities_scored
SET score_csi = GREATEST(40, LEAST(98, 100 - csi_score))
WHERE csi_last_updated IS NOT NULL
  AND csi_score IS NOT NULL;

-- Recompute composite with 40/30/30 weights over the 817 Manus universe.
-- Falls back to 50 (neutral) for any missing category score so a single null doesn't sink the row.
UPDATE public.us_cities_scored
SET composite_score_default = ROUND(
      0.40 * COALESCE(score_demand, 50)
    + 0.30 * COALESCE(score_tam_teachers, 50)
    + 0.30 * COALESCE(score_csi, 50)
  )::int,
  scored_at = now()
WHERE csi_last_updated IS NOT NULL;

INSERT INTO public.imports (source, batch_label, file_checksum, updated_count, started_at, completed_at, notes)
VALUES (
  'rescore_csi_v2',
  '2026-05-21-rescore',
  md5('rescore_csi_v2_40_30_30'),
  817, now(), now(),
  'Re-score pass: score_csi inverted from Manus saturation; composite recomputed with 40/30/30 weights'
);