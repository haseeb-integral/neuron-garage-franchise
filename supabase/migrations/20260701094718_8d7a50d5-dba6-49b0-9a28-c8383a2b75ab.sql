
ALTER TABLE public.mvs_providers
  ADD COLUMN IF NOT EXISTS price_derived_from_brand boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_needs_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_derivation_meta jsonb;

CREATE INDEX IF NOT EXISTS idx_mvs_providers_derived_review
  ON public.mvs_providers (city, price_needs_review)
  WHERE price_derived_from_brand = true;
