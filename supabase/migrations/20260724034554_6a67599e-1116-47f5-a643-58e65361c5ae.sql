
ALTER TABLE public.mvs_pipeline_runs
  ADD COLUMN IF NOT EXISTS heartbeat_at timestamptz;

UPDATE public.mvs_pipeline_runs SET heartbeat_at = COALESCE(heartbeat_at, started_at, now())
 WHERE heartbeat_at IS NULL;

CREATE INDEX IF NOT EXISTS mvs_pipeline_runs_heartbeat_idx
  ON public.mvs_pipeline_runs (status, heartbeat_at);

CREATE OR REPLACE FUNCTION public.mvs_sweep_stale_runs()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  -- Sweep any run whose heartbeat is stale (>3 min without a ping).
  -- Fall back to started_at for legacy rows that never wrote a heartbeat.
  WITH swept AS (
    UPDATE public.mvs_pipeline_runs
       SET status = 'failed',
           error = COALESCE(error, '') ||
                   CASE WHEN COALESCE(error,'') = '' THEN '' ELSE ' | ' END ||
                   'auto-swept: heartbeat stale (>3 min)',
           finished_at = now()
     WHERE status IN ('queued','running')
       AND COALESCE(heartbeat_at, started_at) < now() - interval '3 minutes'
     RETURNING id
  )
  SELECT count(*) INTO v_count FROM swept;
  RETURN v_count;
END;
$function$;
