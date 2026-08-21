ALTER TABLE public.teacher_prospects
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS manus_dedupe_key text,
  ADD COLUMN IF NOT EXISTS record_added_at timestamptz,
  ADD COLUMN IF NOT EXISTS outreach_status_source text,
  ADD COLUMN IF NOT EXISTS verified_enrichment_fact_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified_enrichment_signal_types text[],
  ADD COLUMN IF NOT EXISTS verified_creator_signal_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS secondary_signal_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS secondary_signal_confidence text,
  ADD COLUMN IF NOT EXISTS secondary_signal_match_basis text;

ALTER TABLE public.teacher_prospects
  DROP CONSTRAINT IF EXISTS teacher_prospects_secondary_signal_confidence_check;
ALTER TABLE public.teacher_prospects
  ADD CONSTRAINT teacher_prospects_secondary_signal_confidence_check
  CHECK (secondary_signal_confidence IS NULL OR secondary_signal_confidence IN ('MEDIUM','LOW'));

CREATE UNIQUE INDEX IF NOT EXISTS teacher_prospects_manus_dedupe_key_uidx
  ON public.teacher_prospects (manus_dedupe_key) WHERE manus_dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS teacher_prospects_verified_fact_idx
  ON public.teacher_prospects (verified_enrichment_fact_count) WHERE verified_enrichment_fact_count > 0;
CREATE INDEX IF NOT EXISTS teacher_prospects_creator_signal_idx
  ON public.teacher_prospects (verified_creator_signal_count) WHERE verified_creator_signal_count > 0;
CREATE INDEX IF NOT EXISTS teacher_prospects_secondary_conf_idx
  ON public.teacher_prospects (secondary_signal_confidence);

CREATE TABLE IF NOT EXISTS public.teacher_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teacher_prospects(id) ON DELETE CASCADE,
  evidence_class text NOT NULL CHECK (evidence_class IN ('verified_creator','secondary')),
  signal_type text,
  summary text,
  source_url text,
  source_label text,
  confidence text CHECK (confidence IS NULL OR confidence IN ('MEDIUM','LOW')),
  match_basis text,
  import_batch_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_evidence TO authenticated;
GRANT ALL ON public.teacher_evidence TO service_role;

ALTER TABLE public.teacher_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view teacher evidence" ON public.teacher_evidence;
CREATE POLICY "Staff can view teacher evidence" ON public.teacher_evidence
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));
DROP POLICY IF EXISTS "Staff can insert teacher evidence" ON public.teacher_evidence;
CREATE POLICY "Staff can insert teacher evidence" ON public.teacher_evidence
  FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
DROP POLICY IF EXISTS "Staff can update teacher evidence" ON public.teacher_evidence;
CREATE POLICY "Staff can update teacher evidence" ON public.teacher_evidence
  FOR UPDATE TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
DROP POLICY IF EXISTS "Staff can delete teacher evidence" ON public.teacher_evidence;
CREATE POLICY "Staff can delete teacher evidence" ON public.teacher_evidence
  FOR DELETE TO authenticated USING (is_staff(auth.uid()));

CREATE INDEX IF NOT EXISTS teacher_evidence_teacher_idx ON public.teacher_evidence (teacher_id);
CREATE UNIQUE INDEX IF NOT EXISTS teacher_evidence_dedupe_uidx
  ON public.teacher_evidence (teacher_id, evidence_class, coalesce(source_url,''), coalesce(signal_type,''));