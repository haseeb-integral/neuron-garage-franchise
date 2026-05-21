-- v1.2 Sprint 3: stamp teacher_prospects when pushed to SmartLead so the Master Pool view
-- can quickly filter "already in outreach" without joining outreach_queue every time.
ALTER TABLE public.teacher_prospects
  ADD COLUMN IF NOT EXISTS last_pushed_at timestamptz;

CREATE INDEX IF NOT EXISTS teacher_prospects_last_pushed_at_idx
  ON public.teacher_prospects (last_pushed_at)
  WHERE last_pushed_at IS NOT NULL;