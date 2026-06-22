
CREATE TABLE public.site_saved_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_name text NOT NULL,
  address text,
  lat numeric,
  lng numeric,
  site_type text,
  grade_band text,
  enrollment integer,
  inputs_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX site_saved_sites_dedupe
  ON public.site_saved_sites (
    round(coalesce(lat, 0)::numeric, 5),
    round(coalesce(lng, 0)::numeric, 5),
    coalesce(site_type, '')
  );

CREATE INDEX site_saved_sites_user_idx ON public.site_saved_sites(user_id);
CREATE INDEX site_saved_sites_created_idx ON public.site_saved_sites(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_saved_sites TO authenticated;
GRANT ALL ON public.site_saved_sites TO service_role;

ALTER TABLE public.site_saved_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view all saved sites"
  ON public.site_saved_sites FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can save sites as themselves"
  ON public.site_saved_sites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners or admins can update saved sites"
  ON public.site_saved_sites FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners or admins can delete saved sites"
  ON public.site_saved_sites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER site_saved_sites_set_updated_at
  BEFORE UPDATE ON public.site_saved_sites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
