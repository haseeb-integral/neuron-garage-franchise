ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS owner_operator_explained boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS general_timeline_explained boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.candidate_profiles.owner_operator_explained IS 'Step 1 confirmation that staff explained the owner must also be the operator.';
COMMENT ON COLUMN public.candidate_profiles.general_timeline_explained IS 'Step 1 confirmation that staff explained the general facility, enrollment, and camp-opening timeline.';