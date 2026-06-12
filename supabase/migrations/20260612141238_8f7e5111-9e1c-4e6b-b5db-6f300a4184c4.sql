
-- Phase 2 demo: decision-capture tables for 1A and 1B

-- 1A: market validation decisions (one row per user+city)
CREATE TABLE public.market_validation_decisions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  city_id text NOT NULL,
  city_label text NOT NULL,
  verdict text NOT NULL DEFAULT 'undecided' CHECK (verdict IN ('pursue','hold','drop','undecided')),
  notes text NOT NULL DEFAULT '',
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, city_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.market_validation_decisions TO authenticated;
GRANT ALL ON public.market_validation_decisions TO service_role;

ALTER TABLE public.market_validation_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mvd_select_own" ON public.market_validation_decisions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "mvd_insert_own" ON public.market_validation_decisions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mvd_update_own" ON public.market_validation_decisions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mvd_delete_own" ON public.market_validation_decisions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 1B: site analysis decisions (one row per user+address)
CREATE TABLE public.site_analysis_decisions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address text NOT NULL,
  school_name text NOT NULL DEFAULT '',
  verdict text NOT NULL DEFAULT 'undecided' CHECK (verdict IN ('recommend','worth_a_look','dont_recommend','undecided')),
  is_winner boolean NOT NULL DEFAULT false,
  notes text NOT NULL DEFAULT '',
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, address)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_analysis_decisions TO authenticated;
GRANT ALL ON public.site_analysis_decisions TO service_role;

ALTER TABLE public.site_analysis_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sad_select_own" ON public.site_analysis_decisions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sad_insert_own" ON public.site_analysis_decisions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sad_update_own" ON public.site_analysis_decisions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sad_delete_own" ON public.site_analysis_decisions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- shared updated_at trigger fn (idempotent)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mvd_updated_at
  BEFORE UPDATE ON public.market_validation_decisions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_sad_updated_at
  BEFORE UPDATE ON public.site_analysis_decisions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ensure only one winner per user at a time (optional gentle constraint via trigger)
CREATE OR REPLACE FUNCTION public.enforce_single_site_winner()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_winner = true THEN
    UPDATE public.site_analysis_decisions
       SET is_winner = false
     WHERE user_id = NEW.user_id
       AND id <> NEW.id
       AND is_winner = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sad_single_winner
  AFTER INSERT OR UPDATE OF is_winner ON public.site_analysis_decisions
  FOR EACH ROW WHEN (NEW.is_winner = true)
  EXECUTE FUNCTION public.enforce_single_site_winner();
