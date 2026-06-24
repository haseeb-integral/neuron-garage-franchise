CREATE OR REPLACE FUNCTION public.mvs_qa_unresolve(_queue_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF NOT (public.has_role(v_uid, 'manager'::app_role) OR public.has_role(v_uid, 'admin'::app_role)) THEN
    RAISE EXCEPTION 'forbidden: manager role required';
  END IF;

  UPDATE public.mvs_qa_queue
     SET resolved_at = NULL,
         resolved_by = NULL,
         updated_at = now()
   WHERE id = _queue_id;
END;
$function$;