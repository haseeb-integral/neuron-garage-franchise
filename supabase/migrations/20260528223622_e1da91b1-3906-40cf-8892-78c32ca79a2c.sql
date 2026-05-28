-- 1. Compliance state (one row per candidate)
CREATE TABLE public.candidate_compliance (
  candidate_id uuid PRIMARY KEY,
  fdd_sent_at timestamptz,
  fa_signed_at timestamptz,
  compliance_override boolean NOT NULL DEFAULT false,
  override_reason text,
  override_by text,
  override_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_compliance TO authenticated;
GRANT ALL ON public.candidate_compliance TO service_role;

ALTER TABLE public.candidate_compliance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view compliance"
  ON public.candidate_compliance FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert compliance"
  ON public.candidate_compliance FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update compliance"
  ON public.candidate_compliance FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete compliance"
  ON public.candidate_compliance FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE TRIGGER trg_candidate_compliance_updated_at
  BEFORE UPDATE ON public.candidate_compliance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Append-only audit log
CREATE TABLE public.candidate_compliance_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL,
  field text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  changed_by text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_compliance_audit_candidate ON public.candidate_compliance_audit(candidate_id, changed_at DESC);

GRANT SELECT, INSERT ON public.candidate_compliance_audit TO authenticated;
GRANT ALL ON public.candidate_compliance_audit TO service_role;

ALTER TABLE public.candidate_compliance_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view compliance audit"
  ON public.candidate_compliance_audit FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert compliance audit"
  ON public.candidate_compliance_audit FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

-- 3. Audit trigger: log every field change
CREATE OR REPLACE FUNCTION public.log_compliance_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  BEGIN
    SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_email := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    IF NEW.fdd_sent_at IS NOT NULL THEN
      INSERT INTO public.candidate_compliance_audit (candidate_id, field, old_value, new_value, changed_by)
      VALUES (NEW.candidate_id, 'fdd_sent_at', NULL, to_jsonb(NEW.fdd_sent_at), v_email);
    END IF;
    IF NEW.fa_signed_at IS NOT NULL THEN
      INSERT INTO public.candidate_compliance_audit (candidate_id, field, old_value, new_value, changed_by)
      VALUES (NEW.candidate_id, 'fa_signed_at', NULL, to_jsonb(NEW.fa_signed_at), v_email);
    END IF;
    IF NEW.compliance_override THEN
      INSERT INTO public.candidate_compliance_audit (candidate_id, field, old_value, new_value, changed_by)
      VALUES (NEW.candidate_id, 'compliance_override', to_jsonb(false), to_jsonb(true), v_email);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.fdd_sent_at IS DISTINCT FROM OLD.fdd_sent_at THEN
      INSERT INTO public.candidate_compliance_audit (candidate_id, field, old_value, new_value, changed_by)
      VALUES (NEW.candidate_id, 'fdd_sent_at', to_jsonb(OLD.fdd_sent_at), to_jsonb(NEW.fdd_sent_at), v_email);
    END IF;
    IF NEW.fa_signed_at IS DISTINCT FROM OLD.fa_signed_at THEN
      INSERT INTO public.candidate_compliance_audit (candidate_id, field, old_value, new_value, changed_by)
      VALUES (NEW.candidate_id, 'fa_signed_at', to_jsonb(OLD.fa_signed_at), to_jsonb(NEW.fa_signed_at), v_email);
    END IF;
    IF NEW.compliance_override IS DISTINCT FROM OLD.compliance_override THEN
      INSERT INTO public.candidate_compliance_audit (candidate_id, field, old_value, new_value, changed_by)
      VALUES (NEW.candidate_id, 'compliance_override', to_jsonb(OLD.compliance_override), to_jsonb(NEW.compliance_override), v_email);
      IF NEW.compliance_override THEN
        NEW.override_by := v_email;
        NEW.override_at := now();
      END IF;
    END IF;
    IF NEW.override_reason IS DISTINCT FROM OLD.override_reason AND NEW.override_reason IS NOT NULL THEN
      INSERT INTO public.candidate_compliance_audit (candidate_id, field, old_value, new_value, changed_by)
      VALUES (NEW.candidate_id, 'override_reason', to_jsonb(OLD.override_reason), to_jsonb(NEW.override_reason), v_email);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_compliance_audit
  BEFORE INSERT OR UPDATE ON public.candidate_compliance
  FOR EACH ROW EXECUTE FUNCTION public.log_compliance_change();