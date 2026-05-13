CREATE TABLE public.us_cities_geo (
  id           bigserial PRIMARY KEY,
  city         text         NOT NULL,
  city_ascii   text         NOT NULL,
  state_id     text         NOT NULL,
  state_name   text         NOT NULL,
  county_name  text,
  lat          numeric(9,6) NOT NULL,
  lng          numeric(9,6) NOT NULL,
  population   integer,
  density      numeric
);

CREATE INDEX idx_us_cities_geo_lookup
  ON public.us_cities_geo (LOWER(city_ascii), LOWER(state_name));
CREATE INDEX idx_us_cities_geo_alt
  ON public.us_cities_geo (LOWER(city), LOWER(state_name));

ALTER TABLE public.us_cities_geo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read us_cities_geo"
  ON public.us_cities_geo FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.fill_city_coords()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
    SELECT g.lat, g.lng INTO NEW.latitude, NEW.longitude
    FROM public.us_cities_geo g
    WHERE LOWER(g.state_name) = LOWER(NEW.state)
      AND (LOWER(g.city_ascii) = LOWER(NEW.city) OR LOWER(g.city) = LOWER(NEW.city))
    LIMIT 1;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_fill_city_coords
BEFORE INSERT ON public.cities
FOR EACH ROW EXECUTE FUNCTION public.fill_city_coords();