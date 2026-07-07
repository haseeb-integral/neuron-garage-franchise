CREATE TABLE IF NOT EXISTS public._csi_import_staging (
  city text NOT NULL,
  state_abbr text NOT NULL,
  weighted numeric NOT NULL,
  brand_detail text
);
TRUNCATE public._csi_import_staging;
GRANT SELECT, INSERT, UPDATE, DELETE ON public._csi_import_staging TO authenticated, service_role;
ALTER TABLE public._csi_import_staging ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff staging" ON public._csi_import_staging FOR ALL USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));