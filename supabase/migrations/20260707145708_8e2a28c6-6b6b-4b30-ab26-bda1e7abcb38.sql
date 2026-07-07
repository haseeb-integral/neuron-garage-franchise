ALTER TABLE public.us_cities_scored
  ADD COLUMN IF NOT EXISTS stem_brand_locations integer,
  ADD COLUMN IF NOT EXISTS general_brand_locations integer,
  ADD COLUMN IF NOT EXISTS mvs_score numeric,
  ADD COLUMN IF NOT EXISTS mvs_grade text;

COMMENT ON COLUMN public.us_cities_scored.stem_brand_locations IS
  'Raw stem/coding camp provider count from Manus v1.7+ (national + local). Feeds csi_raw_supply as stem*2.';
COMMENT ON COLUMN public.us_cities_scored.general_brand_locations IS
  'Raw general summer day camp provider count from Manus v1.7+ (national + local). Feeds csi_raw_supply as general*1.';
COMMENT ON COLUMN public.us_cities_scored.mvs_score IS 'Manus Market Validation score 0-100 (v1.7+).';
COMMENT ON COLUMN public.us_cities_scored.mvs_grade IS 'Manus Market Validation letter grade A-F (v1.7+).';

CREATE TABLE IF NOT EXISTS public._mvs_v17_staging (
  city text NOT NULL,
  state_abbr text NOT NULL,
  stem_count integer NOT NULL,
  general_count integer NOT NULL,
  mvs_score numeric,
  mvs_grade text
);
TRUNCATE public._mvs_v17_staging;
GRANT SELECT, INSERT, UPDATE, DELETE ON public._mvs_v17_staging TO authenticated, service_role;
ALTER TABLE public._mvs_v17_staging ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff staging" ON public._mvs_v17_staging FOR ALL USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));