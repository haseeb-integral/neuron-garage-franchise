
-- 1. Add weather columns to canonical scored-cities table
ALTER TABLE public.us_cities_scored
  ADD COLUMN IF NOT EXISTS summer_weather_index numeric,
  ADD COLUMN IF NOT EXISTS avg_peak_summer_temperature numeric,
  ADD COLUMN IF NOT EXISTS days_above_90f integer,
  ADD COLUMN IF NOT EXISTS summer_precip_days integer,
  ADD COLUMN IF NOT EXISTS weather_last_updated timestamptz;

-- 2. Backfill from legacy city_market_signals (one shot, idempotent)
WITH w AS (
  SELECT
    city_id,
    MAX(CASE WHEN signal_key = 'summer_weather_index'        THEN NULLIF(value,'')::numeric END) AS summer_weather_index,
    MAX(CASE WHEN signal_key = 'avg_peak_summer_temperature' THEN NULLIF(value,'')::numeric END) AS avg_peak_summer_temperature,
    MAX(CASE WHEN signal_key = 'days_above_90f'              THEN NULLIF(value,'')::numeric END)::int AS days_above_90f,
    MAX(CASE WHEN signal_key = 'summer_precip_days'          THEN NULLIF(value,'')::numeric END)::int AS summer_precip_days,
    MAX(updated_at) FILTER (WHERE signal_key IN ('summer_weather_index','avg_peak_summer_temperature','days_above_90f','summer_precip_days')) AS weather_last_updated
  FROM public.city_market_signals
  WHERE signal_key IN ('summer_weather_index','avg_peak_summer_temperature','days_above_90f','summer_precip_days')
  GROUP BY city_id
)
UPDATE public.us_cities_scored s
SET
  summer_weather_index        = COALESCE(s.summer_weather_index, w.summer_weather_index),
  avg_peak_summer_temperature = COALESCE(s.avg_peak_summer_temperature, w.avg_peak_summer_temperature),
  days_above_90f              = COALESCE(s.days_above_90f, w.days_above_90f),
  summer_precip_days          = COALESCE(s.summer_precip_days, w.summer_precip_days),
  weather_last_updated        = COALESCE(s.weather_last_updated, w.weather_last_updated)
FROM w
WHERE s.id = w.city_id;
