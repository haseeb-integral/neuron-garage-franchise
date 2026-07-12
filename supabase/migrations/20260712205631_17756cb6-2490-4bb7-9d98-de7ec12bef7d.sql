-- Weymouth + South Weymouth (MA) → Weymouth Town
UPDATE public.public_schools
SET us_cities_scored_id = 'c96bda30-f9c1-447f-bb65-89a67ef9dc6f'
WHERE state_abbr = 'MA'
  AND lower(city_name) IN ('weymouth', 'south weymouth', 'east weymouth', 'north weymouth');

-- Honolulu (HI) → Urban Honolulu
UPDATE public.public_schools
SET us_cities_scored_id = 'a1932547-2c42-4f64-8b16-9d33e4762efc'
WHERE state_abbr = 'HI'
  AND lower(city_name) = 'honolulu';

-- MILFORD (CT) → Milford
UPDATE public.public_schools
SET us_cities_scored_id = '8eb84c6a-657f-4233-802f-4e502bcba2d0'
WHERE state_abbr = 'CT'
  AND lower(city_name) = 'milford';