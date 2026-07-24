
-- Ensure required extensions (usually already on, but safe to re-run).
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper: find shortlist-refresh runs whose queue still has cities and whose
-- heartbeat is stale, then re-invoke the runner. The runner reads the queue
-- from source_counts, so we only need to pass run_id.
CREATE OR REPLACE FUNCTION public.mvs_resume_stuck_b3_runs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
  v_count integer := 0;
  v_key text;
BEGIN
  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key';

  IF v_key IS NULL THEN
    RAISE WARNING 'mvs_resume_stuck_b3_runs: service_role key not in vault; skipping';
    RETURN 0;
  END IF;

  FOR r IN
    SELECT id, source_counts
      FROM public.mvs_pipeline_runs
     WHERE stage = 'b3_shortlist_refresh'
       AND status IN ('running','failed')
       AND COALESCE(heartbeat_at, started_at) < now() - interval '4 minutes'
       AND jsonb_typeof(source_counts->'queue') = 'array'
       AND jsonb_array_length(source_counts->'queue') > 0
     ORDER BY started_at DESC
     LIMIT 5
  LOOP
    -- Re-open so the sweeper doesn't immediately fail it, and bump heartbeat
    -- so we don't relaunch the same run twice in a row.
    UPDATE public.mvs_pipeline_runs
       SET status = 'running',
           heartbeat_at = now(),
           finished_at = NULL,
           source_counts = source_counts
             || jsonb_build_object(
                  'resumed_at', to_jsonb(now()),
                  'resume_count', COALESCE((source_counts->>'resume_count')::int, 0) + 1
                )
     WHERE id = r.id;

    PERFORM net.http_post(
      url := 'https://hqvmltmboakixpwapzfe.supabase.co/functions/v1/mvs-b3-shortlist-refresh',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Lovable-Context', 'cron-resume',
        'Authorization', 'Bearer ' || v_key,
        'apikey', v_key
      ),
      body := jsonb_build_object('run_id', r.id)
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Schedule every 5 minutes. Unschedule any previous version first.
DO $$
BEGIN
  PERFORM cron.unschedule('resume-b3-shortlist-refresh');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'resume-b3-shortlist-refresh',
  '*/5 * * * *',
  $cron$ SELECT public.mvs_resume_stuck_b3_runs(); $cron$
);
