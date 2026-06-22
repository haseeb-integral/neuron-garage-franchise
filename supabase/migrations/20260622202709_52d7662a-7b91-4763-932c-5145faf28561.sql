ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS role_other text,
  ADD COLUMN IF NOT EXISTS married boolean,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS discovery_source text,
  ADD COLUMN IF NOT EXISTS can_invest_min boolean,
  ADD COLUMN IF NOT EXISTS sweat_equity_ok boolean,
  ADD COLUMN IF NOT EXISTS other_opportunities text;