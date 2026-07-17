ALTER TABLE public.mvs_pipeline_runs
  ADD COLUMN IF NOT EXISTS stage text,
  ADD COLUMN IF NOT EXISTS triggering_user_id uuid,
  ADD COLUMN IF NOT EXISTS stage_started_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_mvs_pipeline_runs_stage
  ON public.mvs_pipeline_runs (status, stage)
  WHERE status IN ('queued','running');