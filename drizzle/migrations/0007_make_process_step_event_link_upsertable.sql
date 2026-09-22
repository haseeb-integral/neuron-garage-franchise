ALTER TABLE public.candidate_events
  ADD CONSTRAINT candidate_events_candidate_source_step_key
  UNIQUE (candidate_id, source_process_step);