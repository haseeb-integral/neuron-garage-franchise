ALTER TABLE public.city_market_signals
  ADD CONSTRAINT city_market_signals_city_signal_unique
  UNIQUE (city_id, signal_key);