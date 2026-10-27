CREATE TABLE public.candidate_portal_corrections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), candidate_id uuid NOT NULL REFERENCES public.candidates(id), form_id uuid NOT NULL REFERENCES public.candidate_portal_forms(id), source_signature_id uuid NOT NULL REFERENCES public.candidate_portal_signatures(id), reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 2000), requested_by uuid NOT NULL, requested_at timestamptz NOT NULL DEFAULT now(), fdd_file_id uuid REFERENCES public.portal_step_files(id)
);
GRANT SELECT ON public.candidate_portal_corrections TO authenticated;
GRANT ALL ON public.candidate_portal_corrections TO service_role;
ALTER TABLE public.candidate_portal_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own correction requests or staff" ON public.candidate_portal_corrections FOR SELECT TO authenticated USING (candidate_id=public.portal_candidate_id(auth.uid()) OR public.is_staff(auth.uid()));
ALTER TABLE public.candidate_portal_signatures ADD COLUMN correction_request_id uuid REFERENCES public.candidate_portal_corrections(id);
ALTER TABLE public.candidate_portal_signatures ADD COLUMN fdd_file_id uuid REFERENCES public.portal_step_files(id);
UPDATE public.candidate_portal_signatures s SET fdd_file_id=e.fdd_file_id FROM public.fdd_delivery_events e WHERE s.form_key='item23' AND e.candidate_id=s.candidate_id AND e.event='receipt_signed' AND e.meta->>'pdf_path'=s.pdf_path AND s.fdd_file_id IS NULL;
CREATE UNIQUE INDEX portal_signature_one_correction ON public.candidate_portal_signatures(correction_request_id) WHERE correction_request_id IS NOT NULL;
CREATE FUNCTION public.portal_request_correction(_form_id uuid, _reason text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE f public.candidate_portal_forms; s public.candidate_portal_signatures; rid uuid; actor text;
BEGIN
 IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Staff only'; END IF;
 IF _reason IS NULL OR length(trim(_reason)) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Please enter a reason (up to 2000 characters).'; END IF;
 SELECT * INTO f FROM public.candidate_portal_forms WHERE id=_form_id FOR UPDATE;
 IF f.id IS NULL OR f.status<>'submitted' THEN RAISE EXCEPTION 'Only a submitted form can receive a correction request.'; END IF;
 SELECT * INTO s FROM public.candidate_portal_signatures WHERE form_id=f.id AND candidate_id=f.candidate_id ORDER BY signed_at DESC LIMIT 1;
 IF s.id IS NULL THEN RAISE EXCEPTION 'The saved submission is unavailable.'; END IF;
 IF f.form_key='item23' AND s.fdd_file_id IS NULL THEN RAISE EXCEPTION 'The original FDD version cannot be confirmed. Contact staff before correcting this receipt.'; END IF;
 INSERT INTO public.candidate_portal_corrections(candidate_id,form_id,source_signature_id,reason,requested_by,fdd_file_id) VALUES(f.candidate_id,f.id,s.id,trim(_reason),auth.uid(),s.fdd_file_id) RETURNING id INTO rid;
 UPDATE public.candidate_portal_forms SET answers=s.answers_snapshot-'__esign_consent_at',status='reopened',last_section=0,progress=0,reopen_reason=trim(_reason),reopened_by=auth.uid(),reopened_at=now() WHERE id=f.id;
 actor:=auth.jwt()->>'email';
 INSERT INTO public.candidate_activities(candidate_id,type,content,metadata,actor_email) VALUES(f.candidate_id,'note','Staff requested a form correction: '||f.form_key||'. Reason: '||trim(_reason),jsonb_build_object('source','portal','correction_request_id',rid),actor);
 RETURN rid;
END $$;
REVOKE ALL ON FUNCTION public.portal_request_correction(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.portal_request_correction(uuid,text) TO authenticated;
CREATE FUNCTION public.portal_form_fdd_version(_form_key text) RETURNS TABLE(fdd_file_id uuid, issuance_date date, source text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=public.portal_candidate_id(auth.uid()); rid uuid; pinned uuid;
BEGIN
 SELECT c.id,c.fdd_file_id INTO rid,pinned FROM public.candidate_portal_corrections c JOIN public.candidate_portal_forms f ON f.id=c.form_id WHERE c.candidate_id=cid AND f.form_key=_form_key AND f.status='reopened' AND NOT EXISTS(SELECT 1 FROM public.candidate_portal_signatures s WHERE s.correction_request_id=c.id) ORDER BY c.requested_at DESC LIMIT 1;
 IF rid IS NOT NULL THEN RETURN QUERY SELECT p.id,p.fdd_issuance_date,'correction_original'::text FROM public.portal_step_files p WHERE p.id=pinned; ELSE RETURN QUERY SELECT v.fdd_file_id,v.issuance_date,v.source FROM public.portal_my_fdd_version() v; END IF;
END $$;
REVOKE ALL ON FUNCTION public.portal_form_fdd_version(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.portal_form_fdd_version(text) TO authenticated;
CREATE FUNCTION public.portal_finish_submission(_form_id uuid,_expected_answers jsonb,_signature jsonb,_details jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE f public.candidate_portal_forms; c public.candidate_portal_corrections; sid uuid; signed_time timestamptz:=(_signature->>'signed_at')::timestamptz; receipt uuid:=NULLIF(_signature->>'fdd_file_id','')::uuid;
BEGIN
 SELECT * INTO f FROM public.candidate_portal_forms WHERE id=_form_id FOR UPDATE;
 IF f.id IS NULL OR f.status NOT IN ('draft','reopened') OR f.answers IS DISTINCT FROM _expected_answers THEN RAISE EXCEPTION 'The form changed or was already submitted. Refresh and try again.'; END IF;
 IF (_signature->>'candidate_id')::uuid<>f.candidate_id OR _signature->>'form_key'<>f.form_key THEN RAISE EXCEPTION 'Submission does not match the form.'; END IF;
 IF f.status='reopened' THEN
  SELECT * INTO c FROM public.candidate_portal_corrections WHERE form_id=f.id AND NOT EXISTS(SELECT 1 FROM public.candidate_portal_signatures s WHERE s.correction_request_id=candidate_portal_corrections.id) ORDER BY requested_at DESC LIMIT 1;
  IF c.id IS NULL THEN RAISE EXCEPTION 'No open correction request.'; END IF;
  IF f.form_key='item23' AND (receipt IS NULL OR receipt IS DISTINCT FROM c.fdd_file_id) THEN RAISE EXCEPTION 'Correction must use the original FDD version.'; END IF;
  IF f.form_key IN ('bgcf','item23') AND (NULLIF(_signature->>'esign_consent_at','') IS NULL OR (_signature->>'esign_consent_at')::timestamptz<c.requested_at) THEN RAISE EXCEPTION 'Fresh electronic-record consent is required.'; END IF;
 END IF;
 INSERT INTO public.candidate_portal_signatures(form_id,candidate_id,form_key,form_version,signer_name,signed_text,esign_consent_text,esign_consent_at,answers_snapshot,answers_sha256,signed_at,user_id,user_email,ip,user_agent,pdf_path,pdf_sha256,correction_request_id,fdd_file_id)
 VALUES(f.id,f.candidate_id,f.form_key,f.form_version,_signature->>'signer_name',_signature->>'signed_text',_signature->>'esign_consent_text',NULLIF(_signature->>'esign_consent_at','')::timestamptz,f.answers,_signature->>'answers_sha256',signed_time,(_signature->>'user_id')::uuid,_signature->>'user_email',_signature->>'ip',_signature->>'user_agent',_signature->>'pdf_path',_signature->>'pdf_sha256',c.id,receipt) RETURNING id INTO sid;
 UPDATE public.candidate_portal_forms SET status='submitted',submitted_at=signed_time,progress=100 WHERE id=f.id;
 INSERT INTO public.candidate_files(candidate_id,bucket_path,file_name,mime_type,category,uploaded_by,uploaded_by_email,uploaded_by_prospect,portal_step) VALUES(f.candidate_id,_signature->>'pdf_path',CASE WHEN c.id IS NULL THEN 'Signed - ' ELSE 'Corrected - ' END||(_details->>'form_title')||'.pdf','application/pdf',_details->>'pdf_category',(_signature->>'user_id')::uuid,_signature->>'user_email',true,(_details->>'step_num')::integer);
 IF NOT EXISTS(SELECT 1 FROM public.candidate_portal_checklist WHERE candidate_id=f.candidate_id AND step_num=(_details->>'step_num')::integer AND item_key=_details->>'item_key') THEN
 INSERT INTO public.candidate_portal_checklist(candidate_id,step_num,item_key,item_label,done_by) VALUES(f.candidate_id,(_details->>'step_num')::integer,_details->>'item_key',_details->>'item_label',(_signature->>'user_id')::uuid); END IF;
 INSERT INTO public.candidate_activities(candidate_id,type,content,metadata,actor_email) VALUES(f.candidate_id,'note',CASE WHEN c.id IS NULL THEN 'Prospect submitted: ' ELSE 'Prospect submitted correction: ' END||(_details->>'form_title'),jsonb_build_object('source','portal','form_key',f.form_key,'correction_request_id',c.id,'signature_id',sid),_signature->>'user_email');
 IF f.form_key='item23' AND receipt IS NOT NULL THEN
  IF c.id IS NULL THEN UPDATE public.candidate_compliance SET fdd_received_at=signed_time WHERE candidate_id=f.candidate_id AND fdd_received_at IS NULL; END IF;
  INSERT INTO public.fdd_delivery_events(candidate_id,fdd_file_id,event,actor_id,actor_email,ip,user_agent,meta) VALUES(f.candidate_id,receipt,CASE WHEN c.id IS NULL THEN 'receipt_signed' ELSE 'receipt_corrected' END,(_signature->>'user_id')::uuid,_signature->>'user_email',_signature->>'ip',_signature->>'user_agent',jsonb_build_object('signature_id',sid,'correction_request_id',c.id,'source_signature_id',c.source_signature_id,'pdf_path',_signature->>'pdf_path','pdf_sha256',_signature->>'pdf_sha256','fdd_issuance_date',_details->>'fdd_issuance_date'));
 END IF;
 RETURN sid;
END $$;
REVOKE ALL ON FUNCTION public.portal_finish_submission(uuid,jsonb,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.portal_finish_submission(uuid,jsonb,jsonb,jsonb) TO service_role;