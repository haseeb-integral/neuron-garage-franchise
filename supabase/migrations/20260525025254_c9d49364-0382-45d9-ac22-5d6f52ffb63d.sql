
-- ============================================================================
-- DB Health Tier 2: rules + helpers
-- ============================================================================

CREATE TABLE public.db_health_rules (
  name         text PRIMARY KEY,
  description  text NOT NULL,
  sql          text NOT NULL,
  expected_zero boolean NOT NULL DEFAULT true,
  severity     text NOT NULL DEFAULT 'warning',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.db_health_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view rules" ON public.db_health_rules
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can insert rules" ON public.db_health_rules
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can update rules" ON public.db_health_rules
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can delete rules" ON public.db_health_rules
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_db_health_rules_updated
  BEFORE UPDATE ON public.db_health_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Seed rules. Each returns rows that VIOLATE the invariant — so 0 rows = pass.
-- ----------------------------------------------------------------------------

INSERT INTO public.db_health_rules (name, description, sql, expected_zero, severity) VALUES
  ('composite_score_in_range',
   'Every scored city has composite_score_default between 0 and 100.',
   'SELECT id, city_name, state_abbr, composite_score_default FROM public.us_cities_scored WHERE composite_score_default IS NOT NULL AND (composite_score_default < 0 OR composite_score_default > 100)',
   true, 'critical'),
  ('no_duplicate_city_state',
   'No duplicate (city_name, state_abbr) in us_cities_scored.',
   'SELECT city_name, state_abbr, count(*) AS n FROM public.us_cities_scored GROUP BY 1,2 HAVING count(*) > 1',
   true, 'critical'),
  ('population_present',
   'Every scored city has a population value.',
   'SELECT id, city_name, state_abbr FROM public.us_cities_scored WHERE population IS NULL',
   true, 'warning'),
  ('col_present_for_scored',
   'Every city with a composite score also has a cost_of_living_index.',
   'SELECT id, city_name, state_abbr FROM public.us_cities_scored WHERE composite_score_default IS NOT NULL AND composite_score_default > 0 AND cost_of_living_index IS NULL',
   true, 'warning'),
  ('scored_at_present',
   'Every scored city has a scored_at timestamp.',
   'SELECT id, city_name, state_abbr FROM public.us_cities_scored WHERE composite_score_default IS NOT NULL AND scored_at IS NULL',
   true, 'warning'),
  ('teacher_email_lowercase',
   'Teacher prospect emails are stored lowercase.',
   'SELECT id, email FROM public.teacher_prospects WHERE email IS NOT NULL AND email <> lower(email) LIMIT 50',
   true, 'info');

-- ----------------------------------------------------------------------------
-- db_health_run_rule(name) — executes a named rule's SQL and returns rows as
-- jsonb plus a count. Manager-only via the inner role check. The rule SQL
-- itself is restricted to SELECT (validated below).
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.db_health_run_rule(_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sql text;
  v_rows jsonb;
  v_count int;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'forbidden: manager role required';
  END IF;

  SELECT sql INTO v_sql FROM public.db_health_rules WHERE name = _name;
  IF v_sql IS NULL THEN
    RAISE EXCEPTION 'rule not found: %', _name;
  END IF;

  -- Defense-in-depth: only allow read-only statements.
  IF lower(btrim(v_sql)) !~ '^(select|with)\s' THEN
    RAISE EXCEPTION 'rule sql must start with SELECT or WITH';
  END IF;
  IF v_sql ~* '\m(insert|update|delete|drop|alter|truncate|grant|revoke|create)\M' THEN
    RAISE EXCEPTION 'rule sql contains forbidden keyword';
  END IF;

  EXECUTE format(
    'SELECT coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb), count(*) FROM (%s) t',
    v_sql
  ) INTO v_rows, v_count;

  RETURN jsonb_build_object(
    'rule', _name,
    'count', v_count,
    'rows', v_rows
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- db_health_random_city() — sample inspector source.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.db_health_random_city()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'forbidden: manager role required';
  END IF;

  SELECT to_jsonb(c)
  INTO v_row
  FROM public.us_cities_scored c
  ORDER BY random()
  LIMIT 1;

  RETURN coalesce(v_row, '{}'::jsonb);
END;
$$;

-- ----------------------------------------------------------------------------
-- db_health_outliers(column, n) — top N rows >3σ from the mean.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.db_health_outliers(_column text, _n int DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows jsonb;
  v_allowed text[] := ARRAY[
    'composite_score_default',
    'population',
    'median_household_income',
    'cost_of_living_index',
    'col_salary_index',
    'population_density',
    'public_elementary_teacher_count',
    'csi_score'
  ];
BEGIN
  IF NOT (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'forbidden: manager role required';
  END IF;

  IF NOT (_column = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'column not allowed for outlier check: %', _column;
  END IF;

  EXECUTE format($q$
    WITH stats AS (
      SELECT avg(%1$I)::float8 AS mu, coalesce(stddev_samp(%1$I), 0)::float8 AS sd
      FROM public.us_cities_scored
      WHERE %1$I IS NOT NULL
    ),
    scored AS (
      SELECT id, city_name, state_abbr, %1$I::float8 AS val,
             CASE WHEN (SELECT sd FROM stats) > 0
                  THEN abs(%1$I::float8 - (SELECT mu FROM stats)) / (SELECT sd FROM stats)
                  ELSE 0 END AS z
      FROM public.us_cities_scored
      WHERE %1$I IS NOT NULL
    )
    SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY z DESC), '[]'::jsonb)
    FROM (SELECT * FROM scored WHERE z > 3 ORDER BY z DESC LIMIT %2$s) s
  $q$, _column, _n) INTO v_rows;

  RETURN jsonb_build_object('column', _column, 'rows', v_rows);
END;
$$;
