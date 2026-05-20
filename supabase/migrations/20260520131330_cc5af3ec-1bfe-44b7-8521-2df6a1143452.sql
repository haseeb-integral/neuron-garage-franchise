ALTER TABLE public.outreach_queue DROP CONSTRAINT IF EXISTS outreach_queue_state_check;
ALTER TABLE public.outreach_queue ADD CONSTRAINT outreach_queue_state_check
  CHECK (state = ANY (ARRAY['queued','assigned','sending','sent','failed','promoted','snoozed','suppressed']::text[]));