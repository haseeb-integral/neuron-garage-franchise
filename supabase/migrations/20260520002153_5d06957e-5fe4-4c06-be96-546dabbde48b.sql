-- Teacher import: track email verification + LinkedIn-only enrichment queue
ALTER TABLE public.teacher_prospects
  ADD COLUMN IF NOT EXISTS verification_status text,
  ADD COLUMN IF NOT EXISTS needs_email_enrichment boolean NOT NULL DEFAULT false;

-- Dedup helpers (case-insensitive email + linkedin URL)
CREATE INDEX IF NOT EXISTS teacher_prospects_email_lower_idx
  ON public.teacher_prospects (lower(email));

CREATE INDEX IF NOT EXISTS teacher_prospects_linkedin_lower_idx
  ON public.teacher_prospects (lower(linkedin_url));