CREATE UNIQUE INDEX IF NOT EXISTS mvs_shortlist_cities_city_state_ci_uniq
  ON public.mvs_shortlist_cities (lower(city), lower(state));