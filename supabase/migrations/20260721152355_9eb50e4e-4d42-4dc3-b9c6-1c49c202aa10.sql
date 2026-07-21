ALTER TABLE public.city_briefs
  DROP COLUMN IF EXISTS composite_score,
  DROP COLUMN IF EXISTS pillar_demand,
  DROP COLUMN IF EXISTS pillar_tam,
  DROP COLUMN IF EXISTS pillar_opp;