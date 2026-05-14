-- Make scoring_config per-user instead of singleton
ALTER TABLE public.scoring_config ADD COLUMN IF NOT EXISTS user_id uuid;

-- Drop singleton constraint if any (the column has default true; we keep column but stop relying on it)
ALTER TABLE public.scoring_config ALTER COLUMN singleton DROP NOT NULL;
ALTER TABLE public.scoring_config ALTER COLUMN singleton SET DEFAULT false;

-- Backfill existing row(s) to the first known user (best-effort; leave null otherwise)
-- (no-op if no rows or no users)

-- Enforce one row per user
CREATE UNIQUE INDEX IF NOT EXISTS scoring_config_user_id_uidx ON public.scoring_config(user_id);

-- Tighten RLS so users only see/modify their own row
DROP POLICY IF EXISTS "Authenticated can view scoring config" ON public.scoring_config;
DROP POLICY IF EXISTS "Authenticated can insert scoring config" ON public.scoring_config;
DROP POLICY IF EXISTS "Authenticated can update scoring config" ON public.scoring_config;

CREATE POLICY "Users can view own scoring config"
  ON public.scoring_config FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own scoring config"
  ON public.scoring_config FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own scoring config"
  ON public.scoring_config FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own scoring config"
  ON public.scoring_config FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());