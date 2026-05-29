ALTER TABLE public.candidate_votes
  ADD COLUMN IF NOT EXISTS voter_name text;

COMMENT ON COLUMN public.candidate_votes.voter_name IS
  'Optional display name for manually-recorded committee member votes (members without accounts).';