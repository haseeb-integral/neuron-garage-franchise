ALTER TABLE public.teacher_prospects
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS tags  text[] NOT NULL DEFAULT '{}';