
-- ============================================================
-- Phase A — T3-01: candidate documents storage + metadata table
-- ============================================================

-- 1. Private bucket for candidate documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('candidate_documents', 'candidate_documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Metadata table
CREATE TABLE public.candidate_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL,
  bucket_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  mime_type text,
  size_bytes integer,
  category text NOT NULL DEFAULT 'general',
  uploaded_by uuid,
  uploaded_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT candidate_files_category_check CHECK (
    category IN (
      'general',
      'background_check',
      'credit_check',
      'facility_form',
      'marketing_plan',
      'fdd_proof',
      'fa_proof'
    )
  )
);

CREATE INDEX idx_candidate_files_candidate_id
  ON public.candidate_files (candidate_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_candidate_files_category
  ON public.candidate_files (candidate_id, category)
  WHERE deleted_at IS NULL;

-- 3. GRANTs (auth-only table, staff-scoped via RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_files TO authenticated;
GRANT ALL ON public.candidate_files TO service_role;

-- 4. RLS
ALTER TABLE public.candidate_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view candidate files"
  ON public.candidate_files FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert candidate files"
  ON public.candidate_files FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update candidate files"
  ON public.candidate_files FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete candidate files"
  ON public.candidate_files FOR DELETE
  TO authenticated
  USING (public.is_staff(auth.uid()));

-- 5. Storage policies for candidate_documents bucket (staff-only)
CREATE POLICY "Staff can read candidate_documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'candidate_documents' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff can upload candidate_documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'candidate_documents' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff can update candidate_documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'candidate_documents' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'candidate_documents' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete candidate_documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'candidate_documents' AND public.is_staff(auth.uid()));
