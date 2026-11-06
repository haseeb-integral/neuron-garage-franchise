ALTER TABLE public.candidate_events
  ADD COLUMN IF NOT EXISTS notify_prospect boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS google_event_id text,
  ADD COLUMN IF NOT EXISTS meet_url text;

CREATE OR REPLACE FUNCTION public.dispatch_portal_notice()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
 _cid uuid; _key text; _payload jsonb; _id uuid; _token uuid; _request bigint;
 _from integer; _to integer; _kind text; _old jsonb;
BEGIN
 IF TG_TABLE_NAME = 'candidates' THEN
  _cid := NEW.id;
  _from := CASE OLD.current_stage::text WHEN 'new_lead' THEN 1 WHEN 'initial_qualification' THEN 1 WHEN 'business_overview' THEN 2 WHEN 'fdd_review' THEN 2 WHEN 'immersion' THEN 3 WHEN 'confirmation' THEN 4 WHEN 'signing' THEN 5 ELSE NULL END;
  _to := CASE NEW.current_stage::text WHEN 'new_lead' THEN 1 WHEN 'initial_qualification' THEN 1 WHEN 'business_overview' THEN 2 WHEN 'fdd_review' THEN 2 WHEN 'immersion' THEN 3 WHEN 'confirmation' THEN 4 WHEN 'signing' THEN 5 ELSE NULL END;
  IF _from IS NULL OR _to IS NULL OR _to <= _from THEN RETURN NEW; END IF;
  _key := 'portal-step-' || _cid::text || '-' || _to::text;
  _payload := jsonb_build_object('kind','stage','candidate_id',_cid,'before',OLD.current_stage,'after',NEW.current_stage);
 ELSE
  _cid := NEW.candidate_id;
  IF NOT NEW.notify_prospect THEN RETURN NEW; END IF;
  IF NEW.status <> 'scheduled' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
   IF OLD.status = 'scheduled' AND OLD.starts_at = NEW.starts_at THEN RETURN NEW; END IF;
   _kind := CASE WHEN OLD.status = 'scheduled' THEN 'portal-call-moved' ELSE 'portal-call-booked' END;
   _old := jsonb_build_object('id',OLD.id,'candidate_id',OLD.candidate_id,'status',OLD.status,'starts_at',OLD.starts_at,'title',OLD.title,'duration_minutes',OLD.duration_minutes,'owner_email',OLD.owner_email,'event_type',OLD.event_type);
  ELSE
   _kind := 'portal-call-booked'; _old := NULL;
  END IF;
  _key := 'portal-' || _kind || '-' || NEW.id::text || '-' || NEW.starts_at::text;
  _payload := jsonb_build_object('kind','call','before',_old,'after',jsonb_build_object('id',NEW.id,'candidate_id',_cid,'status',NEW.status,'starts_at',NEW.starts_at,'title',NEW.title,'duration_minutes',NEW.duration_minutes,'owner_email',NEW.owner_email,'event_type',NEW.event_type));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.candidate_portal_users WHERE candidate_id = _cid) THEN RETURN NEW; END IF;
 INSERT INTO public.portal_notice_dispatches(notice_key,candidate_id,payload) VALUES (_key,_cid,_payload)
 ON CONFLICT (notice_key) DO NOTHING RETURNING id,dispatch_token INTO _id,_token;
 IF _id IS NULL THEN RETURN NEW; END IF;
 SELECT net.http_post(
  url := 'https://hqvmltmboakixpwapzfe.supabase.co/functions/v1/portal-notice-event',
  headers := jsonb_build_object('Content-Type','application/json'),
  body := jsonb_build_object('dispatch_id',_id,'dispatch_token',_token),
  timeout_milliseconds := 10000
 ) INTO _request;
 UPDATE public.portal_notice_dispatches SET request_id = _request WHERE id = _id;
 RETURN NEW;
EXCEPTION WHEN OTHERS THEN
 RAISE WARNING 'Prospect notice dispatch failed; saved change is retained: %', SQLERRM;
 RETURN NEW;
END;
$function$;