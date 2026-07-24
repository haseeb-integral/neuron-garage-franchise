
-- 1) Table (single row, id = true)
CREATE TABLE public.apify_breaker_state (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  state text NOT NULL DEFAULT 'closed' CHECK (state IN ('closed','half_open','open')),
  consecutive_failures integer NOT NULL DEFAULT 0,
  opened_at timestamptz,
  next_retry_at timestamptz,
  last_error text,
  last_actor text,
  paused_by_user boolean NOT NULL DEFAULT false,
  paused_by uuid,
  paused_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.apify_breaker_state TO authenticated;
GRANT ALL ON public.apify_breaker_state TO service_role;

ALTER TABLE public.apify_breaker_state ENABLE ROW LEVEL SECURITY;

-- Signed-in users can read the single row. Writes go through service_role
-- (edge functions) or the SECURITY DEFINER functions below.
CREATE POLICY "authenticated_read_breaker"
  ON public.apify_breaker_state
  FOR SELECT
  TO authenticated
  USING (true);

-- Seed the single row so the app always has something to read.
INSERT INTO public.apify_breaker_state (id) VALUES (true)
ON CONFLICT (id) DO NOTHING;

-- Keep updated_at fresh.
CREATE TRIGGER trg_apify_breaker_state_updated_at
BEFORE UPDATE ON public.apify_breaker_state
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Staff-gated pause/resume
CREATE OR REPLACE FUNCTION public.apify_breaker_set_paused(_paused boolean)
RETURNS public.apify_breaker_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.apify_breaker_state;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF NOT public.is_staff(v_uid) THEN
    RAISE EXCEPTION 'forbidden: manager or admin required';
  END IF;

  UPDATE public.apify_breaker_state
     SET paused_by_user = _paused,
         paused_by = CASE WHEN _paused THEN v_uid ELSE NULL END,
         paused_at = CASE WHEN _paused THEN now() ELSE NULL END
   WHERE id = true
   RETURNING * INTO v_row;

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_uid,
    'apify_breaker',
    CASE WHEN _paused THEN 'Pipeline paused' ELSE 'Pipeline resumed' END,
    CASE WHEN _paused
      THEN 'Apify pipeline was paused manually. No new runs will start until resumed.'
      ELSE 'Apify pipeline was resumed. Runs can start again.'
    END,
    jsonb_build_object('paused', _paused)
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.apify_breaker_set_paused(boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.apify_breaker_set_paused(boolean) TO authenticated;

-- 3) Admin-gated force close (manual override when the breaker is open)
CREATE OR REPLACE FUNCTION public.apify_breaker_force_close()
RETURNS public.apify_breaker_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.apify_breaker_state;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF NOT public.has_role(v_uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin required';
  END IF;

  UPDATE public.apify_breaker_state
     SET state = 'closed',
         consecutive_failures = 0,
         opened_at = NULL,
         next_retry_at = NULL
   WHERE id = true
   RETURNING * INTO v_row;

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_uid,
    'apify_breaker',
    'Apify breaker force-closed',
    'An admin manually cleared the Apify circuit breaker.',
    jsonb_build_object('forced_close', true)
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.apify_breaker_force_close() FROM public;
GRANT EXECUTE ON FUNCTION public.apify_breaker_force_close() TO authenticated;
