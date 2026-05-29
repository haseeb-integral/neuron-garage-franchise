-- Phase D: Manual Score Override (additive, flag-gated in UI)

-- 1) Add nullable override columns to candidate_qualification
ALTER TABLE public.candidate_qualification
  ADD COLUMN IF NOT EXISTS teaching_experience_override integer,
  ADD COLUMN IF NOT EXISTS leadership_override integer,
  ADD COLUMN IF NOT EXISTS financial_readiness_override integer,
  ADD COLUMN IF NOT EXISTS market_fit_override integer,
  ADD COLUMN IF NOT EXISTS culture_fit_override integer,
  ADD COLUMN IF NOT EXISTS override_reason text,
  ADD COLUMN IF NOT EXISTS override_by text,
  ADD COLUMN IF NOT EXISTS override_at timestamptz;

-- 2) Append-only audit table for every override change / reset
CREATE TABLE IF NOT EXISTS public.candidate_score_overrides_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('set','reset')),
  field text,                  -- pillar name, or NULL for full reset
  old_value integer,
  new_value integer,
  reason text,
  changed_by text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.candidate_score_overrides_history TO authenticated;
GRANT ALL ON public.candidate_score_overrides_history TO service_role;

ALTER TABLE public.candidate_score_overrides_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view score override history"
  ON public.candidate_score_overrides_history
  FOR SELECT TO authenticated
  USING (is_staff(auth.uid()));

CREATE POLICY "Staff can insert score override history"
  ON public.candidate_score_overrides_history
  FOR INSERT TO authenticated
  WITH CHECK (is_staff(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_score_overrides_history_candidate
  ON public.candidate_score_overrides_history (candidate_id, changed_at DESC);