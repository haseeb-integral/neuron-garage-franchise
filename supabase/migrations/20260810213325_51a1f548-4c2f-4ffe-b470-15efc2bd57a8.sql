ALTER TABLE public.candidate_compliance
  ADD COLUMN IF NOT EXISTS fdd_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS fdd_proof_file_id uuid REFERENCES public.candidate_files(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fa_proof_file_id uuid REFERENCES public.candidate_files(id) ON DELETE SET NULL;

-- Effective FDD date = later of sent / received.
CREATE OR REPLACE FUNCTION public.fdd_effective_date(_sent timestamptz, _received timestamptz)
RETURNS date
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT GREATEST(
    COALESCE(_received::date, _sent::date),
    COALESCE(_sent::date, _received::date)
  );
$$;

-- Hard block: signing date must be at least 16 calendar days after the FDD
-- date, with day 1 = the day the FDD was sent. Earliest allowed signing date
-- is fdd_date + 16 days.
CREATE OR REPLACE FUNCTION public.enforce_fdd_16_day_rule()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_fdd date;
  v_earliest date;
BEGIN
  IF NEW.fa_signed_at IS NULL OR NEW.compliance_override THEN
    RETURN NEW;
  END IF;

  v_fdd := public.fdd_effective_date(NEW.fdd_sent_at, NEW.fdd_received_at);

  IF v_fdd IS NULL THEN
    RAISE EXCEPTION 'FDD sent date is required before a signing date can be saved';
  END IF;

  v_earliest := v_fdd + 16;

  IF NEW.fa_signed_at::date < v_earliest THEN
    RAISE EXCEPTION 'Signing date % is inside the 16-day FDD waiting period. Earliest allowed signing date is %.',
      NEW.fa_signed_at::date, v_earliest;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_fdd_16_day_rule ON public.candidate_compliance;
CREATE TRIGGER trg_enforce_fdd_16_day_rule
BEFORE INSERT OR UPDATE ON public.candidate_compliance
FOR EACH ROW EXECUTE FUNCTION public.enforce_fdd_16_day_rule();

-- Extend the audit trigger to cover the new fields.
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
    IF NEW.fdd_received_at IS NOT NULL THEN
      INSERT INTO public.candidate_compliance_audit (candidate_id, field, old_value, new_value, changed_by)
      VALUES (NEW.candidate_id, 'fdd_received_at', NULL, to_jsonb(NEW.fdd_received_at), v_email);
    END IF;
    IF NEW.fdd_proof_file_id IS NOT NULL THEN
      INSERT INTO public.candidate_compliance_audit (candidate_id, field, old_value, new_value, changed_by)
      VALUES (NEW.candidate_id, 'fdd_proof_file_id', NULL, to_jsonb(NEW.fdd_proof_file_id), v_email);
    END IF;
    IF NEW.fa_signed_at IS NOT NULL THEN
      INSERT INTO public.candidate_compliance_audit (candidate_id, field, old_value, new_value, changed_by)
      VALUES (NEW.candidate_id, 'fa_signed_at', NULL, to_jsonb(NEW.fa_signed_at), v_email);
    END IF;
    IF NEW.fa_proof_file_id IS NOT NULL THEN
      INSERT INTO public.candidate_compliance_audit (candidate_id, field, old_value, new_value, changed_by)
      VALUES (NEW.candidate_id, 'fa_proof_file_id', NULL, to_jsonb(NEW.fa_proof_file_id), v_email);
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
    IF NEW.fdd_received_at IS DISTINCT FROM OLD.fdd_received_at THEN
      INSERT INTO public.candidate_compliance_audit (candidate_id, field, old_value, new_value, changed_by)
      VALUES (NEW.candidate_id, 'fdd_received_at', to_jsonb(OLD.fdd_received_at), to_jsonb(NEW.fdd_received_at), v_email);
    END IF;
    IF NEW.fdd_proof_file_id IS DISTINCT FROM OLD.fdd_proof_file_id THEN
      INSERT INTO public.candidate_compliance_audit (candidate_id, field, old_value, new_value, changed_by)
      VALUES (NEW.candidate_id, 'fdd_proof_file_id', to_jsonb(OLD.fdd_proof_file_id), to_jsonb(NEW.fdd_proof_file_id), v_email);
    END IF;
    IF NEW.fa_signed_at IS DISTINCT FROM OLD.fa_signed_at THEN
      INSERT INTO public.candidate_compliance_audit (candidate_id, field, old_value, new_value, changed_by)
      VALUES (NEW.candidate_id, 'fa_signed_at', to_jsonb(OLD.fa_signed_at), to_jsonb(NEW.fa_signed_at), v_email);
    END IF;
    IF NEW.fa_proof_file_id IS DISTINCT FROM OLD.fa_proof_file_id THEN
      INSERT INTO public.candidate_compliance_audit (candidate_id, field, old_value, new_value, changed_by)
      VALUES (NEW.candidate_id, 'fa_proof_file_id', to_jsonb(OLD.fa_proof_file_id), to_jsonb(NEW.fa_proof_file_id), v_email);
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