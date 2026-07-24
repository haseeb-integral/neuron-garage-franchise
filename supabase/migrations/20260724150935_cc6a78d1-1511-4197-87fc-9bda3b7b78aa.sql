CREATE TABLE public.city_metro_aliases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metro_name text NOT NULL,
  metro_state text NOT NULL,
  member_city text NOT NULL,
  member_state text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (metro_name, metro_state, member_city, member_state)
);

CREATE INDEX city_metro_aliases_metro_idx ON public.city_metro_aliases (metro_name, metro_state);
CREATE INDEX city_metro_aliases_member_idx ON public.city_metro_aliases (member_city, member_state);

GRANT SELECT ON public.city_metro_aliases TO authenticated;
GRANT ALL ON public.city_metro_aliases TO service_role;

ALTER TABLE public.city_metro_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read metro aliases"
  ON public.city_metro_aliases FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.city_metro_aliases (metro_name, metro_state, member_city, member_state) VALUES
  ('Houston','TX','Houston','TX'),
  ('Houston','TX','Katy','TX'),
  ('Houston','TX','Sugar Land','TX'),
  ('Houston','TX','The Woodlands','TX'),
  ('Houston','TX','Pearland','TX'),
  ('Houston','TX','Cypress','TX'),
  ('Houston','TX','Spring','TX'),
  ('Houston','TX','Humble','TX'),
  ('Houston','TX','Kingwood','TX'),
  ('Houston','TX','Missouri City','TX'),
  ('Houston','TX','Friendswood','TX'),
  ('Houston','TX','League City','TX'),
  ('Houston','TX','Pasadena','TX'),
  ('Houston','TX','Baytown','TX'),
  ('Houston','TX','Conroe','TX'),
  ('Houston','TX','Tomball','TX'),
  ('Houston','TX','Richmond','TX'),
  ('Houston','TX','Rosenberg','TX'),
  ('Houston','TX','Stafford','TX'),
  ('Houston','TX','Bellaire','TX'),
  ('Houston','TX','Deer Park','TX'),
  ('Houston','TX','La Porte','TX'),
  ('Houston','TX','Channelview','TX'),
  ('Houston','TX','Atascocita','TX'),
  ('Houston','TX','Fresno','TX'),
  ('Houston','TX','Manvel','TX'),
  ('Houston','TX','Alvin','TX'),
  ('Houston','TX','Webster','TX'),
  ('Houston','TX','Seabrook','TX'),
  ('Houston','TX','Dickinson','TX');