ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS desired_market_city text,
  ADD COLUMN IF NOT EXISTS desired_market_state text;