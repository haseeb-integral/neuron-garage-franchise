
ALTER TABLE public.mvs_providers
  ADD COLUMN IF NOT EXISTS price_confidence text,
  ADD COLUMN IF NOT EXISTS price_source text,
  ADD COLUMN IF NOT EXISTS price_source_url text,
  ADD COLUMN IF NOT EXISTS price_source_quote text,
  ADD COLUMN IF NOT EXISTS price_unit_raw text,
  ADD COLUMN IF NOT EXISTS category_excluded_reason text;

CREATE INDEX IF NOT EXISTS mvs_providers_category_excluded_reason_idx
  ON public.mvs_providers (city)
  WHERE category_excluded_reason IS NOT NULL;
