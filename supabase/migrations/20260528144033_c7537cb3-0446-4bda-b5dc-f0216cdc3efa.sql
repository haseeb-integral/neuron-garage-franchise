ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS other_email text;
ALTER TABLE public.teacher_prospects ADD COLUMN IF NOT EXISTS other_email text;