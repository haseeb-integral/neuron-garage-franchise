-- Manus 1B calibration fix: clear sparse-sampled ACS cache so re-runs use
-- the new dense-grid sampling + area-extrapolated popReachable15. The cache
-- is keyed by polygon hash; old rows reflect 2-4 unique tracts and would
-- mask the bug fixes.
DELETE FROM public.site_analysis_acs_cache;