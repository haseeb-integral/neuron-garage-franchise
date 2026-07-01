
ALTER TABLE public.mvs_providers
  ADD COLUMN IF NOT EXISTS verification_status text CHECK (verification_status IN ('verified','rejected','edited')),
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_notes text,
  ADD COLUMN IF NOT EXISTS price_original_min numeric,
  ADD COLUMN IF NOT EXISTS price_original_max numeric;

CREATE INDEX IF NOT EXISTS idx_mvs_providers_verification_status
  ON public.mvs_providers(verification_status);
