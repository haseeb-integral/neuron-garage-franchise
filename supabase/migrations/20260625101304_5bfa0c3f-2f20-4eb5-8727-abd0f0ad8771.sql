ALTER TYPE public.mvs_run_status ADD VALUE IF NOT EXISTS 'done_stale';
ALTER TYPE public.mvs_run_status ADD VALUE IF NOT EXISTS 'failed_no_data';
ALTER TABLE public.mvs_pipeline_runs ADD COLUMN IF NOT EXISTS fallback_reason text;
ALTER TABLE public.mvs_pipeline_runs ADD COLUMN IF NOT EXISTS fallback_data_date timestamptz;