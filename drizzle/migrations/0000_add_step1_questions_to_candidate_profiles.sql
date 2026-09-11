ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS experience_with_children TEXT,
  ADD COLUMN IF NOT EXISTS interest_in_neuron_garage TEXT,
  ADD COLUMN IF NOT EXISTS educational_philosophy TEXT;