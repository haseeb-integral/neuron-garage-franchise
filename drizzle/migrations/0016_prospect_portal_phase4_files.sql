CREATE OR REPLACE FUNCTION public.portal_current_step(_user_id uuid) RETURNS smallint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE c.current_stage::text
    WHEN 'new_lead' THEN 1 WHEN 'initial_qualification' THEN 1
    WHEN 'business_overview' THEN 2 WHEN 'fdd_review' THEN 2
    WHEN 'immersion' THEN 3 WHEN 'confirmation' THEN 4 WHEN 'signing' THEN 5
    ELSE NULL END::smallint
  FROM candidates c WHERE c.id = public.portal_candidate_id(_user_id)
$$;
REVOKE ALL ON FUNCTION public.portal_current_step(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.portal_current_step(uuid) TO authenticated;

CREATE TABLE public.portal_step_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_num smallint NOT NULL CHECK (step_num BETWEEN 1 AND 5),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  bucket_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  mime_type text,
  size_bytes integer,
  is_fdd boolean NOT NULL DEFAULT false,
  uploaded_by uuid,
  uploaded_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.portal_step_files TO authenticated;
GRANT ALL ON public.portal_step_files TO service_role;
ALTER TABLE public.portal_step_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage step files" ON public.portal_step_files FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
-- Prospects: only live files for unlocked steps; for the FDD, only the newest one.
CREATE POLICY "prospect read unlocked step files" ON public.portal_step_files FOR SELECT TO authenticated
  USING (deleted_at IS NULL
    AND step_num <= COALESCE(public.portal_current_step(auth.uid()), 0)
    AND (NOT is_fdd OR id = (SELECT f.id FROM public.portal_step_files f WHERE f.is_fdd AND f.deleted_at IS NULL ORDER BY f.created_at DESC LIMIT 1)));

CREATE POLICY "staff manage portal_files" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'portal_files' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'portal_files' AND public.is_staff(auth.uid()));
CREATE POLICY "prospect read visible portal_files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'portal_files' AND EXISTS (SELECT 1 FROM public.portal_step_files f WHERE f.bucket_path = storage.objects.name));

-- Prospect uploads land in the candidate's normal documents.
ALTER TABLE public.candidate_files ADD COLUMN uploaded_by_prospect boolean NOT NULL DEFAULT false;
ALTER TABLE public.candidate_files ADD COLUMN portal_step smallint CHECK (portal_step BETWEEN 1 AND 5);
CREATE POLICY "prospect read own uploads" ON public.candidate_files FOR SELECT TO authenticated
  USING (uploaded_by_prospect AND deleted_at IS NULL AND candidate_id = public.portal_candidate_id(auth.uid()));
CREATE POLICY "prospect add own uploads" ON public.candidate_files FOR INSERT TO authenticated
  WITH CHECK (uploaded_by_prospect AND uploaded_by = auth.uid() AND category = 'general'
    AND candidate_id = public.portal_candidate_id(auth.uid())
    AND portal_step IS NOT NULL AND portal_step <= COALESCE(public.portal_current_step(auth.uid()), 0)
    AND bucket_path LIKE 'candidates/' || candidate_id::text || '/portal/%');

CREATE POLICY "prospect upload own portal docs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'candidate_documents' AND public.portal_candidate_id(auth.uid()) IS NOT NULL
    AND name LIKE 'candidates/' || public.portal_candidate_id(auth.uid())::text || '/portal/%');
CREATE POLICY "prospect read own portal docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'candidate_documents' AND public.portal_candidate_id(auth.uid()) IS NOT NULL
    AND name LIKE 'candidates/' || public.portal_candidate_id(auth.uid())::text || '/portal/%');

CREATE OR REPLACE FUNCTION public.trg_prospect_upload_notify() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _name text;
BEGIN
  IF NOT NEW.uploaded_by_prospect THEN RETURN NEW; END IF;
  SELECT trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')) INTO _name FROM candidates WHERE id = NEW.candidate_id;
  INSERT INTO candidate_activities(candidate_id, type, content, metadata, actor_email)
  VALUES (NEW.candidate_id, 'note', 'Prospect uploaded: ' || NEW.file_name || ' (Step ' || NEW.portal_step || ')',
    jsonb_build_object('source','portal','file_id',NEW.id,'step',NEW.portal_step), NEW.uploaded_by_email);
  INSERT INTO notifications(user_id, kind, title, message, link)
  SELECT DISTINCT ur.user_id, 'prospect_upload', coalesce(nullif(_name,''),'A prospect') || ' uploaded a file',
    NEW.file_name, '/candidate-pipeline'
  FROM user_roles ur;
  RETURN NEW;
END $$;
CREATE TRIGGER prospect_upload_notify AFTER INSERT ON public.candidate_files
FOR EACH ROW EXECUTE FUNCTION public.trg_prospect_upload_notify();