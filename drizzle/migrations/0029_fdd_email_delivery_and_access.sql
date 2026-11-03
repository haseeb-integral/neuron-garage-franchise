CREATE TABLE public.fdd_email_sends (
 id uuid PRIMARY KEY,
 candidate_id uuid NOT NULL REFERENCES public.candidates(id),
 fdd_file_id uuid NOT NULL REFERENCES public.portal_step_files(id),
 recipient_email text NOT NULL,
 actor_id uuid NOT NULL,
 actor_email text,
 file_name text NOT NULL,
 issuance_date date NOT NULL,
 file_sha256 text NOT NULL,
 status text NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing','queued','sent','failed','suppressed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 sent_at timestamptz,
 error_message text
);
GRANT SELECT ON public.fdd_email_sends TO authenticated;
GRANT ALL ON public.fdd_email_sends TO service_role;
ALTER TABLE public.fdd_email_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read FDD email status" ON public.fdd_email_sends FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE INDEX fdd_email_sends_candidate_idx ON public.fdd_email_sends(candidate_id,created_at DESC);

CREATE OR REPLACE FUNCTION public.fdd_has_been_sent(_candidate_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.candidate_compliance WHERE candidate_id=_candidate_id AND fdd_sent_at IS NOT NULL)
 OR EXISTS(SELECT 1 FROM public.fdd_delivery_events WHERE candidate_id=_candidate_id AND event='emailed');
$$;
REVOKE ALL ON FUNCTION public.fdd_has_been_sent(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fdd_has_been_sent(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.portal_fdd_access() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT COALESCE(public.portal_current_step(auth.uid()),0)>=2 AND public.fdd_has_been_sent(public.portal_candidate_id(auth.uid()));
$$;
REVOKE ALL ON FUNCTION public.portal_fdd_access() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.portal_fdd_access() TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.enqueue_fdd_email(_send_id uuid,_payload jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.fdd_email_sends;
BEGIN
 SELECT * INTO s FROM public.fdd_email_sends WHERE id=_send_id FOR UPDATE;
 IF s.id IS NULL OR _payload->>'message_id'<>s.id::text OR _payload->>'to'<>s.recipient_email OR _payload->>'label'<>'fdd-delivery' THEN RAISE EXCEPTION 'Invalid FDD send'; END IF;
 IF s.status<>'preparing' THEN RETURN; END IF;
 PERFORM public.enqueue_email('transactional_emails',_payload);
 UPDATE public.fdd_email_sends SET status='queued' WHERE id=s.id;
END $$;
REVOKE ALL ON FUNCTION public.enqueue_fdd_email(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_fdd_email(uuid,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.record_fdd_email_outcome() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.fdd_email_sends; sent_time timestamptz:=now(); signed_receipt boolean;
BEGIN
 IF NEW.template_name<>'fdd-delivery' THEN RETURN NEW; END IF;
 SELECT * INTO s FROM public.fdd_email_sends WHERE id::text=NEW.message_id::text FOR UPDATE;
 IF s.id IS NULL OR s.sent_at IS NOT NULL THEN RETURN NEW; END IF;
 IF NEW.status='sent' THEN
  SELECT EXISTS(SELECT 1 FROM public.candidate_portal_signatures WHERE candidate_id=s.candidate_id AND form_key='item23') INTO signed_receipt;
  INSERT INTO public.candidate_compliance(candidate_id,fdd_sent_at,fdd_file_id) VALUES(s.candidate_id,sent_time,s.fdd_file_id)
  ON CONFLICT(candidate_id) DO UPDATE SET
   fdd_sent_at=CASE WHEN signed_receipt OR candidate_compliance.fdd_file_id=s.fdd_file_id THEN COALESCE(candidate_compliance.fdd_sent_at,EXCLUDED.fdd_sent_at) ELSE EXCLUDED.fdd_sent_at END,
   fdd_file_id=CASE WHEN signed_receipt THEN COALESCE(candidate_compliance.fdd_file_id,EXCLUDED.fdd_file_id) ELSE EXCLUDED.fdd_file_id END;
  INSERT INTO public.fdd_delivery_events(candidate_id,fdd_file_id,event,at,actor_id,actor_email,meta)
  VALUES(s.candidate_id,s.fdd_file_id,'emailed',sent_time,s.actor_id,s.actor_email,jsonb_build_object('send_id',s.id,'message_id',s.id,'recipient_email',s.recipient_email,'file_name',s.file_name,'issuance_date',s.issuance_date,'file_sha256',s.file_sha256,'method','secure_link','provider_accepted',true));
  UPDATE public.fdd_email_sends SET status='sent',sent_at=sent_time,error_message=NULL WHERE id=s.id;
 ELSIF NEW.status IN ('dlq','suppressed') THEN
  UPDATE public.fdd_email_sends SET status=CASE WHEN NEW.status='suppressed' THEN 'suppressed' ELSE 'failed' END,error_message=NEW.error_message WHERE id=s.id;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_fdd_email_outcome() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER record_fdd_email_outcome AFTER INSERT ON public.email_send_log FOR EACH ROW EXECUTE FUNCTION public.record_fdd_email_outcome();

CREATE OR REPLACE FUNCTION public.portal_log_fdd_available() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _cand uuid:=public.portal_candidate_id(auth.uid()); _fdd uuid:=public.portal_latest_fdd_id();
BEGIN
 IF _cand IS NULL OR _fdd IS NULL OR NOT public.portal_fdd_access() THEN RETURN NULL; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.fdd_delivery_events WHERE candidate_id=_cand AND fdd_file_id=_fdd AND event='made_available') THEN
 INSERT INTO public.fdd_delivery_events(candidate_id,fdd_file_id,event,actor_id,actor_email) VALUES(_cand,_fdd,'made_available',auth.uid(),(SELECT email FROM auth.users WHERE id=auth.uid())); END IF;
 RETURN _fdd;
END $$;

ALTER POLICY "prospect read visible portal_files" ON storage.objects USING (
 bucket_id='portal_files' AND EXISTS(SELECT 1 FROM public.portal_step_files f WHERE f.bucket_path=objects.name AND (NOT f.is_fdd OR public.portal_fdd_access()))
);

CREATE OR REPLACE FUNCTION public.enforce_item23_fdd_sent() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.form_key='item23' AND NOT public.fdd_has_been_sent(NEW.candidate_id) THEN RAISE EXCEPTION 'The FDD must be emailed before the Item 23 receipt can be signed.'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_item23_fdd_sent() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER enforce_item23_fdd_sent BEFORE INSERT ON public.candidate_portal_signatures FOR EACH ROW EXECUTE FUNCTION public.enforce_item23_fdd_sent();