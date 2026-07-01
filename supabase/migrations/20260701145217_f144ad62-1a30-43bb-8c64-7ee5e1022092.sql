ALTER TABLE public.mvs_shortlist_cities
  ADD COLUMN IF NOT EXISTS manus_csi_score numeric,
  ADD COLUMN IF NOT EXISTS manus_imported_at timestamptz;

COMMENT ON COLUMN public.mvs_shortlist_cities.manus_csi_score IS 'Reference-only pre-screen score from Manus City Browser CSV import. Never used in MVS scoring.';
COMMENT ON COLUMN public.mvs_shortlist_cities.manus_imported_at IS 'Timestamp when this row was created via the Manus CSV import button. NULL for manually added cities.';