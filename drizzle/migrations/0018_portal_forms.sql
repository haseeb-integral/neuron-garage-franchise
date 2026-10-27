CREATE TABLE public.candidate_portal_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  form_key text NOT NULL,
  form_version text NOT NULL DEFAULT '1',
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','reopened')),
  progress smallint NOT NULL DEFAULT 0,
  last_section smallint NOT NULL DEFAULT 0,
  submitted_at timestamptz,
  reopened_at timestamptz,
  reopened_by uuid,
  reopen_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, form_key)
);
GRANT SELECT, INSERT, UPDATE ON public.candidate_portal_forms TO authenticated;
GRANT ALL ON public.candidate_portal_forms TO service_role;
ALTER TABLE public.candidate_portal_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Prospect reads own forms" ON public.candidate_portal_forms FOR SELECT TO authenticated
  USING (candidate_id = public.portal_candidate_id(auth.uid()) OR public.is_staff(auth.uid()));
CREATE POLICY "Prospect starts own draft" ON public.candidate_portal_forms FOR INSERT TO authenticated
  WITH CHECK (candidate_id = public.portal_candidate_id(auth.uid()) AND status = 'draft');
CREATE POLICY "Prospect edits own open draft" ON public.candidate_portal_forms FOR UPDATE TO authenticated
  USING (candidate_id = public.portal_candidate_id(auth.uid()) AND status IN ('draft','reopened'))
  WITH CHECK (candidate_id = public.portal_candidate_id(auth.uid()) AND status IN ('draft','reopened'));
CREATE POLICY "Staff update forms" ON public.candidate_portal_forms FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_portal_forms_updated BEFORE UPDATE ON public.candidate_portal_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.candidate_portal_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.candidate_portal_forms(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  form_key text NOT NULL,
  form_version text NOT NULL,
  signer_name text NOT NULL,
  signed_text text NOT NULL,
  esign_consent_text text,
  esign_consent_at timestamptz,
  answers_snapshot jsonb NOT NULL,
  answers_sha256 text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  user_email text,
  ip text,
  user_agent text,
  pdf_path text,
  pdf_sha256 text
);
GRANT SELECT ON public.candidate_portal_signatures TO authenticated;
GRANT ALL ON public.candidate_portal_signatures TO service_role;
ALTER TABLE public.candidate_portal_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own or staff signatures" ON public.candidate_portal_signatures FOR SELECT TO authenticated
  USING (candidate_id = public.portal_candidate_id(auth.uid()) OR public.is_staff(auth.uid()));