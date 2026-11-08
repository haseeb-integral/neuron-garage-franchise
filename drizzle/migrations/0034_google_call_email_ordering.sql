ALTER TABLE public.candidate_events ADD COLUMN google_sync_pending boolean NOT NULL DEFAULT false, ADD COLUMN google_sync_revision uuid NOT NULL DEFAULT gen_random_uuid(), ADD COLUMN google_notice_before jsonb;
CREATE OR REPLACE FUNCTION public.prepare_google_call_sync() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF TG_OP = 'INSERT' THEN
  IF NEW.status = 'scheduled' THEN NEW.google_sync_pending := true; NEW.google_sync_revision := gen_random_uuid(); END IF;
 ELSIF NEW.status = 'scheduled' AND (NEW.starts_at,NEW.duration_minutes,NEW.title,NEW.notes,NEW.status,NEW.candidate_id,NEW.event_type) IS DISTINCT FROM (OLD.starts_at,OLD.duration_minutes,OLD.title,OLD.notes,OLD.status,OLD.candidate_id,OLD.event_type) THEN
  IF NOT OLD.google_sync_pending THEN NEW.google_notice_before := jsonb_build_object('id',OLD.id,'candidate_id',OLD.candidate_id,'status',OLD.status,'starts_at',OLD.starts_at,'title',OLD.title,'duration_minutes',OLD.duration_minutes,'owner_email',OLD.owner_email,'event_type',OLD.event_type); END IF;
  NEW.google_sync_pending := true; NEW.google_sync_revision := gen_random_uuid();
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER prepare_google_call_sync BEFORE INSERT OR UPDATE ON public.candidate_events FOR EACH ROW EXECUTE FUNCTION public.prepare_google_call_sync();
CREATE OR REPLACE FUNCTION public.dispatch_portal_notice() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE _cid uuid; _key text; _payload jsonb; _id uuid; _token uuid; _request bigint; _from integer; _to integer; _kind text; _old jsonb;
BEGIN
 IF TG_TABLE_NAME = 'candidates' THEN
  _cid := NEW.id;
  _from := CASE OLD.current_stage::text WHEN 'new_lead' THEN 1 WHEN 'initial_qualification' THEN 1 WHEN 'business_overview' THEN 2 WHEN 'fdd_review' THEN 2 WHEN 'immersion' THEN 3 WHEN 'confirmation' THEN 4 WHEN 'signing' THEN 5 ELSE NULL END;
  _to := CASE NEW.current_stage::text WHEN 'new_lead' THEN 1 WHEN 'initial_qualification' THEN 1 WHEN 'business_overview' THEN 2 WHEN 'fdd_review' THEN 2 WHEN 'immersion' THEN 3 WHEN 'confirmation' THEN 4 WHEN 'signing' THEN 5 ELSE NULL END;
  IF _from IS NULL OR _to IS NULL OR _to <= _from THEN RETURN NEW; END IF;
  _key := 'portal-step-'||_cid::text||'-'||_to::text;
  _payload := jsonb_build_object('kind','stage','candidate_id',_cid,'before',OLD.current_stage,'after',NEW.current_stage);
 ELSE
  _cid := NEW.candidate_id;
  IF NOT NEW.notify_prospect OR NEW.status <> 'scheduled' OR NEW.google_sync_pending OR NEW.meet_url IS NULL THEN RETURN NEW; END IF;
  IF TG_OP <> 'UPDATE' THEN RETURN NEW; END IF;
  IF NOT OLD.google_sync_pending THEN RETURN NEW; END IF;
  _old := OLD.google_notice_before;
  IF _old IS NOT NULL AND _old->>'status' = 'scheduled' AND (_old->>'starts_at')::timestamptz = NEW.starts_at THEN RETURN NEW; END IF;
  _kind := CASE WHEN _old->>'status' = 'scheduled' THEN 'portal-call-moved' ELSE 'portal-call-booked' END;
  _key := 'portal-'||_kind||'-'||NEW.id::text||'-'||NEW.starts_at::text;
  _payload := jsonb_build_object('kind','call','before',_old,'after',jsonb_build_object('id',NEW.id,'candidate_id',_cid,'status',NEW.status,'starts_at',NEW.starts_at,'title',NEW.title,'duration_minutes',NEW.duration_minutes,'owner_email',NEW.owner_email,'event_type',NEW.event_type));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.candidate_portal_users WHERE candidate_id = _cid) THEN RETURN NEW; END IF;
 INSERT INTO public.portal_notice_dispatches(notice_key,candidate_id,payload) VALUES (_key,_cid,_payload) ON CONFLICT (notice_key) DO NOTHING RETURNING id,dispatch_token INTO _id,_token;
 IF _id IS NULL THEN RETURN NEW; END IF;
 SELECT net.http_post(url := 'https://hqvmltmboakixpwapzfe.supabase.co/functions/v1/portal-notice-event', headers := jsonb_build_object('Content-Type','application/json'), body := jsonb_build_object('dispatch_id',_id,'dispatch_token',_token), timeout_milliseconds := 10000) INTO _request;
 UPDATE public.portal_notice_dispatches SET request_id = _request WHERE id = _id;
 RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Prospect notice dispatch failed; saved change is retained: %', SQLERRM; RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.queue_portal_call_reminders() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r record; _id uuid; _token uuid; _req bigint; _n integer := 0; _day date := ((now() AT TIME ZONE 'America/Denver')::date + 1);
BEGIN
 FOR r IN SELECT e.* FROM public.candidate_events e JOIN public.candidate_portal_users p ON p.candidate_id=e.candidate_id WHERE e.status='scheduled' AND e.event_type IN ('call','follow_up') AND e.notify_prospect AND NOT e.google_sync_pending AND e.meet_url IS NOT NULL AND (e.starts_at AT TIME ZONE 'America/Denver')::date=_day AND e.starts_at>now()
 LOOP
  INSERT INTO public.portal_notice_dispatches(notice_key,candidate_id,payload) VALUES ('portal-portal-call-reminder-'||r.id::text||'-'||r.starts_at::text,r.candidate_id,jsonb_build_object('kind','reminder','after',jsonb_build_object('id',r.id,'candidate_id',r.candidate_id,'status',r.status,'starts_at',r.starts_at,'title',r.title,'duration_minutes',r.duration_minutes,'owner_email',r.owner_email,'event_type',r.event_type))) ON CONFLICT (notice_key) DO NOTHING RETURNING id,dispatch_token INTO _id,_token;
  IF _id IS NULL THEN CONTINUE; END IF;
  SELECT net.http_post(url := 'https://hqvmltmboakixpwapzfe.supabase.co/functions/v1/portal-notice-event',headers := jsonb_build_object('Content-Type','application/json'),body := jsonb_build_object('dispatch_id',_id,'dispatch_token',_token),timeout_milliseconds := 10000) INTO _req;
  UPDATE public.portal_notice_dispatches SET request_id=_req WHERE id=_id; _n:=_n+1; _id:=NULL;
 END LOOP; RETURN _n;
END $$;
CREATE OR REPLACE FUNCTION public.portal_my_path() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE _cid uuid := public.portal_candidate_id(auth.uid()); _r jsonb;
BEGIN
 IF _cid IS NULL THEN RETURN NULL; END IF;
 SELECT jsonb_build_object('first_name',c.first_name,'stage',c.current_stage,'step_dates',COALESCE((SELECT jsonb_object_agg(s.step,s.starts_at) FROM (SELECT DISTINCT ON (source_process_step) source_process_step+1 AS step,starts_at FROM candidate_events WHERE candidate_id=_cid AND status<>'canceled' AND source_process_step IS NOT NULL ORDER BY source_process_step,starts_at DESC) s),'{}'::jsonb),'next_call',(SELECT jsonb_build_object('starts_at',e.starts_at,'duration_minutes',e.duration_minutes,'all_day',e.all_day,'title',e.title,'meet_url',CASE WHEN e.google_sync_pending THEN NULL ELSE e.meet_url END,'host',COALESCE(p.full_name,split_part(e.owner_email,'@',1))) FROM candidate_events e LEFT JOIN profiles p ON lower(p.email)=lower(e.owner_email) WHERE e.candidate_id=_cid AND e.status='scheduled' AND e.event_type='call' AND e.starts_at+make_interval(mins=>COALESCE(e.duration_minutes,0))>now() ORDER BY e.starts_at LIMIT 1)) INTO _r FROM candidates c WHERE c.id=_cid;
 RETURN _r;
END $$;