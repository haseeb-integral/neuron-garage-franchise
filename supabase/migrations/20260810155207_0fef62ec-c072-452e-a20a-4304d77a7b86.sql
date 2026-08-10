ALTER TABLE public.candidate_qualification
  ADD COLUMN IF NOT EXISTS pillar_notes jsonb NOT NULL DEFAULT '{}'::jsonb;