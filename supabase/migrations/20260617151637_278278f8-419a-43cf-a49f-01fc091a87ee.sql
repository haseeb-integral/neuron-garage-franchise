
CREATE TABLE public.mvs_shortlist_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  state text NOT NULL,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city, state)
);

GRANT SELECT, INSERT, DELETE ON public.mvs_shortlist_cities TO authenticated;
GRANT ALL ON public.mvs_shortlist_cities TO service_role;

ALTER TABLE public.mvs_shortlist_cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff can read shortlist additions"
  ON public.mvs_shortlist_cities FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "staff can add shortlist cities"
  ON public.mvs_shortlist_cities FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND added_by = auth.uid());

CREATE POLICY "staff can remove shortlist cities"
  ON public.mvs_shortlist_cities FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));
