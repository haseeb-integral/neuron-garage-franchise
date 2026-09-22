ALTER TABLE public.candidate_events
  ADD COLUMN source_process_step integer;

ALTER TABLE public.candidate_events
  ADD CONSTRAINT candidate_events_source_process_step_check
  CHECK (source_process_step IS NULL OR source_process_step BETWEEN 1 AND 4);

CREATE UNIQUE INDEX candidate_events_candidate_source_step_unique
  ON public.candidate_events (candidate_id, source_process_step)
  WHERE source_process_step IS NOT NULL;

COMMENT ON COLUMN public.candidate_events.source_process_step IS
  'Qualification Process step that automatically created this event. NULL means the event was created manually.';