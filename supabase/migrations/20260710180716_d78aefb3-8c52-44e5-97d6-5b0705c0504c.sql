
CREATE TABLE public.private_elementary_count_backup (
  city_id uuid PRIMARY KEY,
  old_value integer,
  snapshot_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.private_elementary_count_backup TO authenticated;
GRANT ALL ON public.private_elementary_count_backup TO service_role;

ALTER TABLE public.private_elementary_count_backup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read private elem backup"
  ON public.private_elementary_count_backup
  FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

INSERT INTO public.private_elementary_count_backup (city_id, old_value)
SELECT id, private_elementary_count
FROM public.us_cities_scored;
