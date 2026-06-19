CREATE OR REPLACE FUNCTION public.mvs_qa_resolve(_queue_id uuid, _new_status mvs_week_status)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_entity_id uuid;
  v_entity_type mvs_qa_entity;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF NOT (public.has_role(v_uid, 'manager'::app_role) OR public.has_role(v_uid, 'admin'::app_role)) THEN
    RAISE EXCEPTION 'forbidden: manager role required';
  END IF;

  SELECT entity_id, entity_type INTO v_entity_id, v_entity_type
  FROM public.mvs_qa_queue WHERE id = _queue_id;
  IF v_entity_id IS NULL THEN
    RAISE EXCEPTION 'queue item not found';
  END IF;

  IF v_entity_type = 'week'::mvs_qa_entity AND _new_status IS NOT NULL THEN
    UPDATE public.mvs_weeks
       SET status = _new_status,
           status_evidence = 'qa_override',
           confidence = 1,
           updated_at = now()
     WHERE id = v_entity_id;
  END IF;

  UPDATE public.mvs_qa_queue
     SET resolved_at = now(),
         resolved_by = v_uid,
         updated_at = now()
   WHERE id = _queue_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mvs_qa_resolve(uuid, mvs_week_status) TO authenticated;