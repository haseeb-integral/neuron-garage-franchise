
-- ============================================================================
-- DB Health Tier 3: history, subscriptions, incidents, cron
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ---- history ---------------------------------------------------------------

CREATE TABLE public.db_health_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ts          timestamptz NOT NULL DEFAULT now(),
  domain      text NOT NULL,
  metric      text NOT NULL,
  status      text NOT NULL,         -- green|yellow|red|unknown
  value       jsonb,
  error       text
);
CREATE INDEX idx_db_health_history_ts ON public.db_health_history (ts DESC);
CREATE INDEX idx_db_health_history_domain_metric_ts
  ON public.db_health_history (domain, metric, ts DESC);

ALTER TABLE public.db_health_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers view history" ON public.db_health_history
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

-- ---- subscriptions ---------------------------------------------------------

CREATE TABLE public.db_health_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  rule_name  text,                   -- nullable = any rule
  domain     text,                   -- nullable = any domain
  channel    text NOT NULL DEFAULT 'email',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (rule_name IS NOT NULL OR domain IS NOT NULL)
);
CREATE INDEX idx_db_health_subs_user ON public.db_health_subscriptions(user_id);

ALTER TABLE public.db_health_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subs" ON public.db_health_subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own subs" ON public.db_health_subscriptions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own subs" ON public.db_health_subscriptions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ---- incidents -------------------------------------------------------------

CREATE TABLE public.db_health_incidents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain       text NOT NULL,
  metric       text NOT NULL,
  opened_at    timestamptz NOT NULL DEFAULT now(),
  closed_at    timestamptz,
  last_status  text NOT NULL,
  notes        text
);
CREATE INDEX idx_db_health_incidents_open
  ON public.db_health_incidents (domain, metric) WHERE closed_at IS NULL;
CREATE INDEX idx_db_health_incidents_opened_at
  ON public.db_health_incidents (opened_at DESC);

ALTER TABLE public.db_health_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers view incidents" ON public.db_health_incidents
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

-- ---- helper: read history for a domain (manager-only) ----------------------

CREATE OR REPLACE FUNCTION public.db_health_history_for(_domain text, _days int DEFAULT 30)
RETURNS SETOF public.db_health_history
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT * FROM public.db_health_history
    WHERE domain = _domain AND ts > now() - make_interval(days => _days)
    ORDER BY ts ASC;
END;
$$;

-- ---- snapshot job: runs every 6h via pg_cron -------------------------------
-- Records row counts + invariant rule results, opens/closes incidents.
-- Does not call out to the alert edge function from SQL (kept simple); the
-- /db-health UI surfaces new incidents on next refresh, and the optional
-- db-health-alert edge function can be invoked manually or on a separate
-- schedule once Resend is wired up.

CREATE OR REPLACE FUNCTION public.db_health_snapshot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_count int;
  v_status text;
BEGIN
  -- Row counts for the core domains.
  FOR r IN
    SELECT * FROM (VALUES
      ('us_cities_scored', 500),
      ('us_cities_geo', 25000),
      ('teacher_prospects', 100),
      ('public_schools', 50000),
      ('candidates', 1)
    ) AS t(tbl, min_rows)
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', r.tbl) INTO v_count;
    v_status := CASE
      WHEN v_count = 0 THEN 'red'
      WHEN v_count < r.min_rows THEN 'yellow'
      ELSE 'green'
    END;
    INSERT INTO public.db_health_history (domain, metric, status, value)
    VALUES (r.tbl, 'row_count', v_status,
            jsonb_build_object('count', v_count, 'min_expected', r.min_rows));

    -- Open/close incident based on row_count status.
    IF v_status = 'red' THEN
      INSERT INTO public.db_health_incidents (domain, metric, last_status, notes)
      SELECT r.tbl, 'row_count', v_status, format('row_count=%s', v_count)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.db_health_incidents
        WHERE domain = r.tbl AND metric = 'row_count' AND closed_at IS NULL
      );
    ELSE
      UPDATE public.db_health_incidents
      SET closed_at = now(), last_status = v_status
      WHERE domain = r.tbl AND metric = 'row_count' AND closed_at IS NULL;
    END IF;
  END LOOP;

  -- Each invariant rule -> snapshot row.
  FOR r IN SELECT * FROM public.db_health_rules LOOP
    BEGIN
      EXECUTE format('SELECT count(*) FROM (%s) t', r.sql) INTO v_count;
      v_status := CASE
        WHEN (r.expected_zero AND v_count = 0) OR (NOT r.expected_zero AND v_count > 0)
          THEN 'green'
        WHEN r.severity = 'critical' THEN 'red'
        ELSE 'yellow'
      END;
      INSERT INTO public.db_health_history (domain, metric, status, value)
      VALUES ('rules', r.name, v_status, jsonb_build_object('violations', v_count));

      IF v_status = 'red' THEN
        INSERT INTO public.db_health_incidents (domain, metric, last_status, notes)
        SELECT 'rules', r.name, v_status, format('violations=%s', v_count)
        WHERE NOT EXISTS (
          SELECT 1 FROM public.db_health_incidents
          WHERE domain = 'rules' AND metric = r.name AND closed_at IS NULL
        );
      ELSE
        UPDATE public.db_health_incidents
        SET closed_at = now(), last_status = v_status
        WHERE domain = 'rules' AND metric = r.name AND closed_at IS NULL;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.db_health_history (domain, metric, status, error)
      VALUES ('rules', r.name, 'red', SQLERRM);
    END;
  END LOOP;
END;
$$;

-- Schedule it every 6 hours. Drop any prior version of the same name first.
DO $$
BEGIN
  PERFORM cron.unschedule('db_health_snapshot');
EXCEPTION WHEN OTHERS THEN
  -- ignore "not found"
  NULL;
END $$;

SELECT cron.schedule(
  'db_health_snapshot',
  '0 */6 * * *',
  $$SELECT public.db_health_snapshot();$$
);

-- Run once immediately so the chart isn't empty.
SELECT public.db_health_snapshot();
