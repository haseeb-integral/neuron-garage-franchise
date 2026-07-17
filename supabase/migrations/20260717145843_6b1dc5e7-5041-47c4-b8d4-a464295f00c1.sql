
-- Stale-run sweeper: marks any mvs_pipeline_runs row stuck in queued/running
-- for >25 minutes as failed. Cheap, idempotent, safe to run every minute.
CREATE OR REPLACE FUNCTION public.mvs_sweep_stale_runs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH swept AS (
    UPDATE public.mvs_pipeline_runs
       SET status = 'failed',
           error = COALESCE(error, '') ||
                   CASE WHEN COALESCE(error,'') = '' THEN '' ELSE ' | ' END ||
                   'auto-swept: edge runtime killed mid-run (>25 min, no heartbeat)',
           finished_at = now()
     WHERE status IN ('queued','running')
       AND started_at < now() - interval '25 minutes'
     RETURNING id
  )
  SELECT count(*) INTO v_count FROM swept;
  RETURN v_count;
END;
$$;

-- Schedule the sweeper every minute. Unschedule first in case it already exists
-- so this migration is idempotent.
DO $$
BEGIN
  PERFORM cron.unschedule('mvs-sweep-stale-runs');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'mvs-sweep-stale-runs',
  '* * * * *',
  $cron$ SELECT public.mvs_sweep_stale_runs(); $cron$
);
