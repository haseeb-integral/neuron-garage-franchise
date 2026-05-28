
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS partner_involved boolean NOT NULL DEFAULT false;
