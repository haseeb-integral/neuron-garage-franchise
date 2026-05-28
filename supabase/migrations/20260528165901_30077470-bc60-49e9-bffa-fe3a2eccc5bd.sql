
-- Tier 2 batch: nullable columns for Other Opportunities, Mailing Address,
-- Partner contact, and Compliance Audit dates.

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS other_opportunities text,
  ADD COLUMN IF NOT EXISTS mailing_street text,
  ADD COLUMN IF NOT EXISTS mailing_city text,
  ADD COLUMN IF NOT EXISTS mailing_state text,
  ADD COLUMN IF NOT EXISTS mailing_zip text,
  ADD COLUMN IF NOT EXISTS partner_name text,
  ADD COLUMN IF NOT EXISTS partner_email text,
  ADD COLUMN IF NOT EXISTS partner_phone text,
  ADD COLUMN IF NOT EXISTS background_check_completed_at date,
  ADD COLUMN IF NOT EXISTS credit_check_completed_at date;

-- Mirror mailing address on teacher_prospects so we can sync back like other safe fields.
ALTER TABLE public.teacher_prospects
  ADD COLUMN IF NOT EXISTS mailing_street text,
  ADD COLUMN IF NOT EXISTS mailing_city text,
  ADD COLUMN IF NOT EXISTS mailing_state text,
  ADD COLUMN IF NOT EXISTS mailing_zip text;
