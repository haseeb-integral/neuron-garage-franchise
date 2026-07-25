
CREATE OR REPLACE FUNCTION public.mvs_sweep_stale_runs()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  WITH swept AS (
    UPDATE public.mvs_pipeline_runs
       SET status = 'failed',
           error = COALESCE(error, '') ||
                   CASE WHEN COALESCE(error,'') = '' THEN '' ELSE ' | ' END ||
                   'auto-swept: heartbeat stale (>15 min)',
           finished_at = now()
     WHERE status IN ('queued','running')
       AND COALESCE(heartbeat_at, started_at) < now() - interval '15 minutes'
     RETURNING id
  )
  SELECT count(*) INTO v_count FROM swept;
  RETURN v_count;
END;
$function$;

ANALYZE public.teacher_prospects;
