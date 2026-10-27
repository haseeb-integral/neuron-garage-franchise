CREATE OR REPLACE FUNCTION public.queue_portal_call_reminders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE r record; _id uuid; _token uuid; _req bigint; _n integer := 0;
 _day date := ((now() AT TIME ZONE 'America/Denver')::date + 1);
BEGIN
 FOR r IN SELECT e.* FROM public.candidate_events e
  JOIN public.candidate_portal_users p ON p.candidate_id = e.candidate_id
  WHERE e.status = 'scheduled' AND e.event_type IN ('call','follow_up')
    AND (e.starts_at AT TIME ZONE 'America/Denver')::date = _day AND e.starts_at > now()
 LOOP
  INSERT INTO public.portal_notice_dispatches(notice_key,candidate_id,payload)
  VALUES ('portal-portal-call-reminder-'||r.id::text||'-'||r.starts_at::text, r.candidate_id,
   jsonb_build_object('kind','reminder','after',jsonb_build_object('id',r.id,'candidate_id',r.candidate_id,'status',r.status,'starts_at',r.starts_at,'title',r.title,'duration_minutes',r.duration_minutes,'owner_email',r.owner_email,'event_type',r.event_type)))
  ON CONFLICT (notice_key) DO NOTHING RETURNING id,dispatch_token INTO _id,_token;
  IF _id IS NULL THEN CONTINUE; END IF;
  SELECT net.http_post(url := 'https://hqvmltmboakixpwapzfe.supabase.co/functions/v1/portal-notice-event',
   headers := jsonb_build_object('Content-Type','application/json'),
   body := jsonb_build_object('dispatch_id',_id,'dispatch_token',_token), timeout_milliseconds := 10000) INTO _req;
  UPDATE public.portal_notice_dispatches SET request_id = _req WHERE id = _id;
  _n := _n + 1; _id := NULL;
 END LOOP;
 RETURN _n;
END $$;
REVOKE ALL ON FUNCTION public.queue_portal_call_reminders() FROM PUBLIC, anon, authenticated;
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'portal-call-reminders-daily';
SELECT cron.schedule('portal-call-reminders-daily', '0 16 * * *', $$ SELECT public.queue_portal_call_reminders(); $$);