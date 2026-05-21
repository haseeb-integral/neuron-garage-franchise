
ALTER TABLE public.teacher_prospects
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS enrichment_cost_cents integer,
  ADD COLUMN IF NOT EXISTS enrichment_provider text,
  ADD COLUMN IF NOT EXISTS import_batch_id uuid;

UPDATE public.teacher_prospects
SET
  first_name = COALESCE(NULLIF(first_name, ''), split_part(name, ' ', 1)),
  last_name  = COALESCE(
                 NULLIF(last_name, ''),
                 NULLIF(regexp_replace(name, '^\S+\s+', ''), name)
               )
WHERE name IS NOT NULL
  AND name <> ''
  AND (first_name IS NULL OR first_name = '' OR last_name IS NULL OR last_name = '');

UPDATE public.teacher_prospects
SET verification_status = CASE
  WHEN verification_status IS NULL OR verification_status = '' THEN NULL
  WHEN lower(verification_status) IN ('valid','verified','ok','deliverable','valid_email') THEN 'valid'
  WHEN lower(verification_status) IN ('catch_all','catchall','catch-all','accept_all') THEN 'catch_all'
  WHEN lower(verification_status) IN ('invalid','undeliverable','bounced','bad','rejected') THEN 'invalid'
  WHEN lower(verification_status) IN ('unknown','risky','unverified','pending') THEN 'unknown'
  ELSE 'unknown'
END
WHERE verification_status IS NOT NULL;

ALTER TABLE public.teacher_prospects
  ADD COLUMN IF NOT EXISTS dedupe_key text
  GENERATED ALWAYS AS (
    CASE
      WHEN email IS NOT NULL AND email <> '' THEN 'email:' || lower(email)
      ELSE 'name:' || lower(coalesce(first_name,''))
                  || '|' || lower(coalesce(last_name,''))
                  || '|' || lower(coalesce(school_nces_id,''))
                  || '|' || lower(coalesce(state,''))
                  || '|' || lower(coalesce(city,''))
    END
  ) STORED;

CREATE INDEX IF NOT EXISTS teacher_prospects_dedupe_key_idx
  ON public.teacher_prospects (dedupe_key);

CREATE INDEX IF NOT EXISTS teacher_prospects_state_city_idx
  ON public.teacher_prospects (state, city);

CREATE INDEX IF NOT EXISTS teacher_prospects_needs_email_idx
  ON public.teacher_prospects (needs_email_enrichment)
  WHERE needs_email_enrichment = true;

CREATE INDEX IF NOT EXISTS teacher_prospects_verification_idx
  ON public.teacher_prospects (verification_status);

CREATE INDEX IF NOT EXISTS teacher_prospects_import_batch_idx
  ON public.teacher_prospects (import_batch_id);

CREATE UNIQUE INDEX IF NOT EXISTS teacher_prospects_email_lower_uidx
  ON public.teacher_prospects (lower(email))
  WHERE email IS NOT NULL AND email <> '';

ALTER TABLE IF EXISTS public.prospect_batches
  RENAME TO teacher_import_batches;

ALTER TABLE public.teacher_import_batches
  ADD COLUMN IF NOT EXISTS destination text NOT NULL DEFAULT 'smartlead_only',
  ADD COLUMN IF NOT EXISTS column_mapping jsonb,
  ADD COLUMN IF NOT EXISTS unmapped_columns text[],
  ADD COLUMN IF NOT EXISTS dedupe_stats jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'teacher_prospects_import_batch_id_fkey'
  ) THEN
    ALTER TABLE public.teacher_prospects
      ADD CONSTRAINT teacher_prospects_import_batch_id_fkey
      FOREIGN KEY (import_batch_id)
      REFERENCES public.teacher_import_batches(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.enrichment_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requested_by uuid,
  city text,
  state text,
  filter_payload jsonb,
  provider text NOT NULL DEFAULT 'smartlead',
  requested_count integer NOT NULL DEFAULT 0,
  succeeded_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  total_cost_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'queued',
  smartlead_campaign_id text,
  auto_push boolean NOT NULL DEFAULT false,
  error_summary jsonb,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.enrichment_jobs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated can view enrichment jobs' AND tablename = 'enrichment_jobs') THEN
    CREATE POLICY "Authenticated can view enrichment jobs"
      ON public.enrichment_jobs FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated can insert enrichment jobs' AND tablename = 'enrichment_jobs') THEN
    CREATE POLICY "Authenticated can insert enrichment jobs"
      ON public.enrichment_jobs FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated can update enrichment jobs' AND tablename = 'enrichment_jobs') THEN
    CREATE POLICY "Authenticated can update enrichment jobs"
      ON public.enrichment_jobs FOR UPDATE TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated can delete enrichment jobs' AND tablename = 'enrichment_jobs') THEN
    CREATE POLICY "Authenticated can delete enrichment jobs"
      ON public.enrichment_jobs FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

DROP TRIGGER IF EXISTS enrichment_jobs_updated_at ON public.enrichment_jobs;
CREATE TRIGGER enrichment_jobs_updated_at
  BEFORE UPDATE ON public.enrichment_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS enrichment_jobs_status_idx
  ON public.enrichment_jobs (status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS outreach_queue_teacher_campaign_uidx
  ON public.outreach_queue (teacher_prospect_id, campaign_id)
  WHERE campaign_id IS NOT NULL;
