
-- Phase 1: Isolate Manus reference data into its own table.

CREATE TABLE public.mvs_manus_cities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city text NOT NULL,
  state text NOT NULL,
  manus_csi_score numeric,
  manus_export_version text,
  rank integer,
  imported_at timestamptz NOT NULL DEFAULT now(),
  imported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mvs_manus_cities_city_state_unique UNIQUE (city, state)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mvs_manus_cities TO authenticated;
GRANT ALL ON public.mvs_manus_cities TO service_role;

ALTER TABLE public.mvs_manus_cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view manus cities"
  ON public.mvs_manus_cities FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert manus cities"
  ON public.mvs_manus_cities FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update manus cities"
  ON public.mvs_manus_cities FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete manus cities"
  ON public.mvs_manus_cities FOR DELETE
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE TRIGGER trg_mvs_manus_cities_updated_at
  BEFORE UPDATE ON public.mvs_manus_cities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_mvs_manus_cities_city_state ON public.mvs_manus_cities (lower(city), lower(state));

-- Remove Manus columns from the human shortlist table.
ALTER TABLE public.mvs_shortlist_cities
  DROP COLUMN IF EXISTS manus_csi_score,
  DROP COLUMN IF EXISTS manus_imported_at;
