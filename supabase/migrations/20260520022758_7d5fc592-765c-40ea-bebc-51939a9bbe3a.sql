
-- 1. Normalize and constrain teacher_prospects.status
UPDATE public.teacher_prospects
SET status = 'new'
WHERE status IS NULL
   OR status NOT IN ('new','shortlisted','in_outreach','not_fit','replied');

ALTER TABLE public.teacher_prospects
  DROP CONSTRAINT IF EXISTS teacher_prospects_status_check;

ALTER TABLE public.teacher_prospects
  ADD CONSTRAINT teacher_prospects_status_check
  CHECK (status IN ('new','shortlisted','in_outreach','not_fit','replied'));

-- 2. outreach_queue table — bridge between Teacher Search and Email Outreach
CREATE TABLE IF NOT EXISTS public.outreach_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_prospect_id uuid NOT NULL REFERENCES public.teacher_prospects(id) ON DELETE CASCADE,
  campaign_id text,
  added_by uuid,
  added_at timestamptz NOT NULL DEFAULT now(),
  state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','assigned','sending','sent','failed')),
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS outreach_queue_unique_prospect_campaign
  ON public.outreach_queue (teacher_prospect_id, COALESCE(campaign_id, ''));

CREATE INDEX IF NOT EXISTS outreach_queue_state_idx ON public.outreach_queue (state);
CREATE INDEX IF NOT EXISTS outreach_queue_prospect_idx ON public.outreach_queue (teacher_prospect_id);

ALTER TABLE public.outreach_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view outreach queue"
  ON public.outreach_queue FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert outreach queue"
  ON public.outreach_queue FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update outreach queue"
  ON public.outreach_queue FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete outreach queue"
  ON public.outreach_queue FOR DELETE TO authenticated USING (true);

CREATE TRIGGER outreach_queue_set_updated_at
  BEFORE UPDATE ON public.outreach_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
