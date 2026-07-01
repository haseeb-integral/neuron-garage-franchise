
-- Phase T2: Regression guard for tier counts after catch-up / classify runs.
-- Stores a snapshot of premium/mid/budget counts per city each time we
-- explicitly check, and exposes an RPC that compares the new snapshot to
-- the previous one and inserts a notification if premium drops sharply.

CREATE TABLE public.mvs_tier_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  premium_count integer NOT NULL DEFAULT 0,
  mid_count integer NOT NULL DEFAULT 0,
  budget_count integer NOT NULL DEFAULT 0,
  total_priced integer NOT NULL DEFAULT 0,
  trigger_source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.mvs_tier_snapshots TO authenticated;
GRANT ALL ON public.mvs_tier_snapshots TO service_role;

ALTER TABLE public.mvs_tier_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read tier snapshots"
  ON public.mvs_tier_snapshots FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert tier snapshots"
  ON public.mvs_tier_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE INDEX idx_mvs_tier_snapshots_city_created
  ON public.mvs_tier_snapshots (city, created_at DESC);

-- Snapshot + regression check RPC.
-- Returns jsonb with prev/current counts and whether a regression was flagged.
CREATE OR REPLACE FUNCTION public.mvs_check_tier_regression(_city text, _trigger text DEFAULT 'manual')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_premium int;
  v_mid int;
  v_budget int;
  v_priced int;
  v_prev record;
  v_regressed boolean := false;
  v_drop_pct numeric := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF NOT public.is_staff(v_uid) THEN
    RAISE EXCEPTION 'forbidden: staff role required';
  END IF;

  SELECT
    count(*) FILTER (WHERE tier::text = 'premium'),
    count(*) FILTER (WHERE tier::text = 'mid'),
    count(*) FILTER (WHERE tier::text = 'budget'),
    count(*) FILTER (WHERE price_min IS NOT NULL OR price_max IS NOT NULL)
  INTO v_premium, v_mid, v_budget, v_priced
  FROM public.mvs_providers
  WHERE lower(city) = lower(_city);

  -- Previous snapshot (before we write this one).
  SELECT premium_count, mid_count, budget_count, total_priced, created_at
  INTO v_prev
  FROM public.mvs_tier_snapshots
  WHERE lower(city) = lower(_city)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_prev IS NOT NULL AND v_prev.premium_count > 2 THEN
    v_drop_pct := ROUND(
      ((v_prev.premium_count - v_premium)::numeric / v_prev.premium_count::numeric) * 100,
      1
    );
    IF v_drop_pct >= 20 THEN
      v_regressed := true;
      -- Fire a notification bell so it surfaces top-right without a new UI screen.
      INSERT INTO public.notifications (user_id, type, title, message, data)
      VALUES (
        v_uid,
        'mvs_tier_regression',
        'Premium count dropped in ' || _city,
        'Premium tier dropped from ' || v_prev.premium_count || ' to ' || v_premium
          || ' (' || v_drop_pct || '% drop). Possible classify-before-catchup bug — check tier classification order.',
        jsonb_build_object(
          'city', _city,
          'trigger', _trigger,
          'prev_premium', v_prev.premium_count,
          'new_premium', v_premium,
          'drop_pct', v_drop_pct
        )
      );
    END IF;
  END IF;

  -- Always write the new snapshot.
  INSERT INTO public.mvs_tier_snapshots (city, premium_count, mid_count, budget_count, total_priced, trigger_source)
  VALUES (_city, v_premium, v_mid, v_budget, v_priced, _trigger);

  RETURN jsonb_build_object(
    'city', _city,
    'previous', CASE WHEN v_prev IS NULL THEN NULL ELSE jsonb_build_object(
      'premium', v_prev.premium_count,
      'mid', v_prev.mid_count,
      'budget', v_prev.budget_count,
      'total_priced', v_prev.total_priced,
      'taken_at', v_prev.created_at
    ) END,
    'current', jsonb_build_object(
      'premium', v_premium,
      'mid', v_mid,
      'budget', v_budget,
      'total_priced', v_priced
    ),
    'drop_pct', v_drop_pct,
    'regressed', v_regressed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mvs_check_tier_regression(text, text) TO authenticated, service_role;
