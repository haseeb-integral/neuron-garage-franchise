CREATE TABLE public.city_private_elementary_schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_id UUID NOT NULL REFERENCES public.us_cities_scored(id) ON DELETE CASCADE,
  ppin TEXT NOT NULL,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  enrollment INTEGER,
  level TEXT,
  matched_by TEXT NOT NULL CHECK (matched_by IN ('name','centroid','none')),
  source TEXT NOT NULL DEFAULT 'pss_2021_22',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cpes_city_id ON public.city_private_elementary_schools(city_id);
CREATE INDEX idx_cpes_ppin ON public.city_private_elementary_schools(ppin);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.city_private_elementary_schools TO authenticated;
GRANT ALL ON public.city_private_elementary_schools TO service_role;

ALTER TABLE public.city_private_elementary_schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view private elementary schools"
  ON public.city_private_elementary_schools FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can manage private elementary schools"
  ON public.city_private_elementary_schools FOR ALL
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER update_cpes_updated_at
  BEFORE UPDATE ON public.city_private_elementary_schools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();