-- 1. Rename surviving score columns to match 6→3 reshape
ALTER TABLE public.us_cities_scored
  RENAME COLUMN score_franchise_supply TO score_tam_teachers;
ALTER TABLE public.us_cities_scored
  RENAME COLUMN score_competitive TO score_csi;

-- 2. Drop retired category scores
ALTER TABLE public.us_cities_scored
  DROP COLUMN IF EXISTS score_pricing_power,
  DROP COLUMN IF EXISTS score_ease_of_operation,
  DROP COLUMN IF EXISTS score_parent_mindset;

-- 3. CSI bundle (scored)
ALTER TABLE public.us_cities_scored
  ADD COLUMN IF NOT EXISTS csi_score integer,
  ADD COLUMN IF NOT EXISTS csi_national_brand_count_weighted numeric,
  ADD COLUMN IF NOT EXISTS csi_local_provider_estimate numeric,
  ADD COLUMN IF NOT EXISTS csi_demand_adjusted_market numeric,
  ADD COLUMN IF NOT EXISTS csi_saturation_category text,
  ADD COLUMN IF NOT EXISTS csi_confidence numeric,
  ADD COLUMN IF NOT EXISTS csi_last_updated timestamp with time zone,
  ADD COLUMN IF NOT EXISTS csi_brand_detail jsonb;

-- 4. Data-only (NOT scored, NOT shown in UI yet)
ALTER TABLE public.us_cities_scored
  ADD COLUMN IF NOT EXISTS private_elementary_count integer,
  ADD COLUMN IF NOT EXISTS charter_elementary_count integer,
  ADD COLUMN IF NOT EXISTS private_charter_share_pct numeric;

-- 5. Truth-toggle columns
ALTER TABLE public.us_cities_scored
  ADD COLUMN IF NOT EXISTS place_type text,
  ADD COLUMN IF NOT EXISTS census_population_2020 integer;

-- 6. Misc
ALTER TABLE public.us_cities_scored
  ADD COLUMN IF NOT EXISTS school_district_count integer;

-- 7. Imports log table (idempotency + audit)
CREATE TABLE IF NOT EXISTS public.imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  batch_label text,
  file_checksum text,
  inserted_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  errored_count integer NOT NULL DEFAULT 0,
  triage_doc_path text,
  notes text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view imports"
  ON public.imports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert imports"
  ON public.imports FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- No UPDATE / DELETE policies = log rows are append-only.