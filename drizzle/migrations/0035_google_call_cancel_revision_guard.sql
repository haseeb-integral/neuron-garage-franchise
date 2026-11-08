CREATE OR REPLACE FUNCTION public.prepare_google_call_sync() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF TG_OP = 'INSERT' THEN
  IF NEW.status = 'scheduled' THEN NEW.google_sync_pending := true; NEW.google_sync_revision := gen_random_uuid(); END IF;
 ELSIF (NEW.starts_at,NEW.duration_minutes,NEW.title,NEW.notes,NEW.status,NEW.candidate_id,NEW.event_type) IS DISTINCT FROM (OLD.starts_at,OLD.duration_minutes,OLD.title,OLD.notes,OLD.status,OLD.candidate_id,OLD.event_type) THEN
  NEW.google_sync_revision := gen_random_uuid();
  IF NEW.status = 'scheduled' THEN
   IF NOT OLD.google_sync_pending THEN NEW.google_notice_before := jsonb_build_object('id',OLD.id,'candidate_id',OLD.candidate_id,'status',OLD.status,'starts_at',OLD.starts_at,'title',OLD.title,'duration_minutes',OLD.duration_minutes,'owner_email',OLD.owner_email,'event_type',OLD.event_type); END IF;
   NEW.google_sync_pending := true;
  END IF;
 END IF;
 RETURN NEW;
END $$;